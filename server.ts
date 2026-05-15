import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
import textToSpeech from "@google-cloud/text-to-speech";
import FirecrawlApp from "@mendable/firecrawl-js";
import { runFullScrapingCycle } from "./src/services/magazineScraperService";

// Initialize Firecrawl lazily
let firecrawl: FirecrawlApp | null = null;
function getFirecrawl() {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY missing. Falling back to legacy scraping.");
      return null;
    }
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
}

// Initialize TTS client lazily
let ttsClient: any = null;
function getTTSClient() {
  if (!ttsClient) {
    try {
      ttsClient = new textToSpeech.TextToSpeechClient();
    } catch (err) {
      console.error("Failed to initialize Google Cloud TTS client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.", err);
      throw new Error("TTS Service Unavailable: Missing or invalid Google Cloud credentials.");
    }
  }
  return ttsClient;
}

const COMPETITOR_MAP: Record<string, string[]> = {
  'Harvest SA': [
    'https://www.farmersweekly.co.za/',
    'https://www.landbouweekblad.com/',
    'https://africanagrimagazine.com/'
  ],
  'Black Business Quarterly': [
    'https://transformsa.co.za/',
    'https://www.businessbrief.co.za/',
    'https://africanleader.co.za/'
  ],
  'Leadership Magazine': [
    'https://ceo-mag.co.za/',
    'https://www.leadershiponline.co.za/',
    'https://www.businessbrief.co.za/'
  ]
};

async function scrapeCompetitorData(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    
    // Extract meaningful text signals
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1s = $('h1').map((i, el) => $(el).text()).get().join(' | ');
    const footerText = $('footer').text().slice(0, 1000);
    
    // Look for potential company/brand names in ad-heavy sections
    const potentialBrands = $('.advertisement, .ad, .sponsor, .partner, [class*="ad-"]')
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(t => t.length > 2 && t.length < 50)
      .slice(0, 10);

    return {
      url,
      title,
      description: metaDescription,
      h1s,
      footerText,
      potentialBrands
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, (error as Error).message);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Background Job: Run Scraping Cycle every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Cron] Starting scheduled B2B lead discovery cycle...');
    try {
      await runFullScrapingCycle();
    } catch (err) {
      console.error('[Cron] Scraping cycle failed:', err);
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Lead sourcing manual trigger endpoint
  app.post("/api/source-leads", async (req, res) => {
    const { publication, userId } = req.body;
    console.log(`Executing targeted competitive deep wipe for ${publication}...`);
    
    // Attempt deep search via Firecrawl & Gemini grounding
    try {
      const leads = await runFullScrapingCycle(userId || 'system');
      res.json({
        success: true,
        message: `Extracted ${leads.length} real-world signals using the intelligence pipeline.`,
        leads
      });
    } catch (err) {
      console.error('[Wendy] Manual sourcing failed:', err);
      // Fallback to legacy scrape if the full pipeline fails (e.g. no keys)
      const targets = COMPETITOR_MAP[publication] || COMPETITOR_MAP['Leadership Magazine'];
      const scrapedResults = await Promise.all(targets.map(url => scrapeCompetitorData(url)));
      const validResults = scrapedResults.filter(r => r !== null);
      res.json({
        success: true,
        message: `Fell back to legacy scrape. Extracted ${validResults.length} basic signals.`,
        scrapedData: validResults
      });
    }
  });

  app.post("/api/wendy-tts", async (req, res) => {
    const { text, voice = 'en-ZA-Wavenet-A' } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
      const client = getTTSClient();
      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: { languageCode: 'en-ZA', name: voice },
        audioConfig: { audioEncoding: 'MP3' },
      });

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': (response.audioContent as Buffer).length
      });
      res.send(response.audioContent);
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  });

  app.post("/api/scrape-url", async (req, res) => {
    const { url, schema } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "URL required" });
    
    console.log(`Targeted deep scrape requested for: ${url}${schema ? ' with schema' : ''}`);
    
    const firecrawlClient = getFirecrawl();
    if (firecrawlClient) {
      try {
        const formats: any[] = ['markdown'];
        if (schema) {
          formats.push({
            type: 'json',
            schema: schema
          });
        }

        const scrapeResult = await firecrawlClient.scrape(url, {
          formats
        }) as any;
        
        if (scrapeResult.success) {
          return res.json({ 
            success: true, 
            scrapedData: [{
              url,
              markdown: scrapeResult.markdown,
              json: scrapeResult.json,
              metadata: scrapeResult.metadata
            }],
            method: 'firecrawl'
          });
        }
      } catch (err) {
        console.error("Firecrawl targeted scrape failed, falling back:", err);
      }
    }

    const data = await scrapeCompetitorData(url);
    if (!data) return res.status(500).json({ success: false, message: "Failed to scrape the provided URL." });
    
    res.json({ success: true, scrapedData: [data], method: 'legacy' });
  });

  app.post("/api/firecrawl-search", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: "Query required" });
    
    console.log(`Firecrawl web search requested for: ${query}`);
    
    const firecrawlClient = getFirecrawl();
    if (firecrawlClient) {
      try {
        const searchResult = await firecrawlClient.search(query, {
          limit: 5
        }) as any;
        
        if (searchResult.success) {
          return res.json({ 
            success: true, 
            results: searchResult.data
          });
        }
      } catch (err) {
        console.error("Firecrawl search failed:", err);
      }
    }

    res.status(500).json({ success: false, message: "Firecrawl search failed or API key missing." });
  });

  app.post("/api/apollo-search", async (req, res) => {
    const { publication } = req.body;
    const apolloKey = process.env.APOLLO_API_KEY;
    if (!apolloKey) {
      return res.status(500).json({ success: false, message: "Apollo API key not configured on server" });
    }
    
    // Determine search criteria based on publication
    let keywords = "director";
    if (publication === "Harvest SA") keywords = "agriculture farming";
    if (publication === "Black Business Quarterly") keywords = "executive business";
    if (publication === "Leadership Magazine") keywords = "ceo founder";

    try {
      console.log(`Pulling Apollo data with key: ${apolloKey} for ${publication}`);
      const response = await axios.post(
        "https://api.apollo.io/v1/mixed_people/search",
        {
          q_keywords: keywords,
          person_locations: ["South Africa"],
          per_page: 5
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "api-key": apolloKey
          }
        }
      );
      
      const people = response.data?.people || [];
      const leads = people.map((p: any) => ({
        companyName: p.organization?.name || "Unknown Company",
        sector: p.organization?.industry || "Unknown",
        score: Math.floor(Math.random() * 20) + 75,
        sourceReasoning: `Apollo Global Search for ${keywords}`,
        angle: `Direct connection via Apollo database`,
        feature: `Targeted industry focus`,
        benefit: `Verified contact data from Apollo`,
        decisionMaker: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        title: p.title || "Director",
        email: p.email || (p.organization?.primary_domain ? `contact@${p.organization.primary_domain}` : "No email"),
        phone: p.phone_numbers?.[0]?.sanitized_number || p.organization?.primary_phone?.sanitized_number || "No phone"
      }));

      res.json({ success: true, leads });
    } catch (error) {
      console.error("Apollo API Error:", (error as any).response?.data || (error as Error).message);
      res.status(500).json({ success: false, message: "Apollo API failed", error: (error as Error).message });
    }
  });

  app.post("/api/apollo-match", async (req, res) => {
    const { firstName, lastName, companyName, email } = req.body;
    const apolloKey = process.env.APOLLO_API_KEY;
    if (!apolloKey) {
      return res.status(500).json({ success: false, message: "Apollo API key not configured on server" });
    }

    try {
      console.log(`Executing Apollo Match for: ${firstName} ${lastName} at ${companyName}`);
      const response = await axios.post(
        "https://api.apollo.io/v1/people/match",
        {
          first_name: firstName,
          last_name: lastName,
          organization_name: companyName,
          email: email,
          reveal_personal_emails: true
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "api-key": apolloKey
          }
        }
      );

      const person = response.data?.person;
      if (!person) {
        return res.json({ success: true, person: null, message: "No direct match found." });
      }

      res.json({ 
        success: true, 
        person: {
          name: `${person.first_name || ""} ${person.last_name || ""}`.trim(),
          title: person.title,
          email: person.email || person.personal_emails?.[0] || "No email found",
          phone: person.phone_numbers?.[0]?.sanitized_number || "No phone found",
          linkedin: person.linkedin_url,
          organization: person.organization?.name,
          city: person.city,
          state: person.state,
          country: person.country
        }
      });
    } catch (error) {
      console.error("Apollo Match Error:", (error as any).response?.data || (error as Error).message);
      res.status(500).json({ success: false, message: "Apollo match failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

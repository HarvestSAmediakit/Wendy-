import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase for standalone service usage if needed, 
// though we usually export it from a central lib.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let genAI: GoogleGenAI | null = null;
let firecrawl: FirecrawlApp | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

function getFirecrawl() {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is required for the cloud API. Set it in the environment.");
    }
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
}

// Models
const BASIC_MODEL = "gemini-3-flash-preview"; 

/**
 * CORE PIPELINE
 * 1) Discover promising URLs
 * 2) Fetch the full page content (Firecrawl fallback)
 * 3) Analyze with Gemini to extract leads
 * 4) Upsert into Firestore
 */
export async function discoverAndScoreLeads(competitorUrls: string[], userId: string = 'system') {
  console.log(`[Wendy] Discovering leads from ${competitorUrls.length} sources...`);
  
  // Check for keys first to avoid late failure
  try {
    getFirecrawl();
    getGenAI();
  } catch (err) {
    console.error("[Wendy] Missing API keys for deep discovery:", err instanceof Error ? err.message : err);
    return [];
  }

  // ---- STEP 1: Get the raw content of every competitor page ----
  const pageContents = await Promise.all(
    competitorUrls.map(url => fetchPageContent(url))
  );

  const validContents = pageContents.filter(p => p.markdown && p.markdown.length > 100);

  if (validContents.length === 0) {
    console.log("[Wendy] No valid content found to analyze.");
    return [];
  }

  // ---- STEP 2: Feed everything to Gemini for intelligent analysis ----
  const analysisPrompt = `You are Wendy, an elite AI Sales Co-Pilot working exclusively for Terrence.
  Below are the complete contents of competitor magazine / news websites that Terrence tracks.

  Your task is to identify promising ad, sponsorship, or media partnership leads. Be creative and broad in your analysis. Even if a company is just mentioned in an article or is a minor sponsor somewhere else, consider them a lead if they have the budget and presence to potentially advertise with us. Do NOT be too strict; we want a wide net of potential targets.
  
  For each company identified:
  1. Analyze: Identify their core business and why they would need media presence in South Africa.
  2. Hook/Reasoning: Provide a specific "sourceReasoning" based on evidence found.
  3. Competitor Spend Analysis: Provide "competitorSpendAnalysis" stating where they might be advertising now or their current market visibility strategy.
  4. AFB Dossier: Provide "angle", "feature", and "benefit" for a highly customized pitch.
  5. Calculate Next Follow Up / Strike Window: Give an ISO timestamp for "nextFollowUp" within the next 48 hours that falls in the optimal window for their industry (e.g. 10:00 AM on a Tuesday, or 14:00 PM on a Friday).
  6. Scoring: Provide a "score" (0-100) based on their advertising potential (always give a decent score > 50 if they are a real business).

  Return as a JSON array of objects with the exact keys: 
  companyName, sector, presenceType, snippet, score, sourceReasoning, competitorSpendAnalysis, angle, feature, benefit, decisionMaker, title, email, phone, evidence, nextFollowUp.
  "evidence" should be an array of objects with: source, url, date, spendEstimate.
  Respond ONLY with the JSON array.

  Here are the pages:
  ${validContents.map(p => `--- PAGE: ${p.url} ---\n${p.markdown.slice(0, 5000)}`).join('\n\n')}
  `;

  try {
    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: BASIC_MODEL,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: analysisPrompt
    });

    const text = result.text;
    const leads = JSON.parse(text || '[]');

    // ---- STEP 3: Write to Firestore ----
    for (const lead of leads) {
      await upsertLead(lead, userId);
    }

    return leads;
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429) {
      console.warn("[Wendy] Gemini Quota Exceeded (429) during discovery. Skipping analysis.");
      return [];
    }
    console.error("[Wendy] Lead Discovery Error:", error);
    return [];
  }
}

async function fetchPageContent(url: string): Promise<{ url: string; markdown: string }> {
  try {
    const client = getFirecrawl();
    const scrapeResult = await client.scrape(url, {
      formats: ['markdown'],
    }) as any;
    
    if (scrapeResult.success && scrapeResult.markdown) {
      return { url, markdown: scrapeResult.markdown };
    }
  } catch (err) {
    console.error(`[Wendy] Firecrawl failed for ${url}:`, err);
  }
  return { url, markdown: '' };
}

async function upsertLead(lead: any, userId: string) {
  const leadsRef = collection(db, 'leads');
  const q = query(leadsRef, where('companyName', '==', lead.companyName), where('ownerId', '==', userId));
  const querySnapshot = await getDocs(q);

  const leadData: any = {
    ...lead,
    ownerId: userId,
    updatedAt: serverTimestamp(),
  };

  if (querySnapshot.empty) {
    leadData.status = 'New';
    leadData.createdAt = serverTimestamp();
    await addDoc(leadsRef, leadData);
  } else {
    const docRef = doc(db, 'leads', querySnapshot.docs[0].id);
    await updateDoc(docRef, leadData);
  }
}


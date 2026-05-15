import { discoverAndScoreLeads } from './leadIntelligenceService';
import FirecrawlApp from '@mendable/firecrawl-js';

let firecrawl: FirecrawlApp | null = null;

function getFirecrawl() {
  if (!firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is required for the cloud API.");
    }
    firecrawl = new FirecrawlApp({ apiKey });
  }
  return firecrawl;
}

const COMPETITOR_CONFIG = {
  BBQ: {
    queries: ['site:transformsa.co.za advertise', 'site:africanleader.co.za advertising', 'site:businessbrief.co.za sponsor'],
    seeds: [
      'https://transformsa.co.za/advertise/',
      'https://www.businessbrief.co.za/advertise/',
      'https://africanleader.co.za/advertise/'
    ]
  },
  HARVEST: {
    queries: ['site:farmersweekly.co.za advertising', 'site:landbouweekblad.com advertiseer', 'site:africanagrimagazine.com sponsor'],
    seeds: [
      'https://www.farmersweekly.co.za/advertising/',
      'https://www.landbouweekblad.com/landbou/adverteer-by-ons-20180424',
      'https://africanagrimagazine.com/advertise/'
    ]
  },
  LEADERSHIP: {
    queries: ['site:ceomag.co.za advertising', 'site:leadershiponline.co.za sponsor', 'site:businessbrief.co.za advertise'],
    seeds: [
      'https://www.leadershiponline.co.za/advertise',
      'https://ceomag.co.za/advertise/',
      'https://www.businessbrief.co.za/advertise/'
    ]
  },
};

export async function runFullScrapingCycle(userId: string = 'system') {
  console.log('[Wendy] Starting global competitor scan...');

  // Check for firecrawl key early
  try {
    getFirecrawl();
  } catch (err) {
    console.error('[Wendy] Firecrawl key missing, skipping automated scan.');
    return [];
  }

  const freshUrls: string[] = [];
  
  // 1) Use Firecrawl Search to find fresh advertising pages
  try {
    const client = getFirecrawl();
    for (const mag of Object.values(COMPETITOR_CONFIG)) {
      for (const queryStr of mag.queries) {
        const result = await client.search(queryStr, { limit: 3 }) as any;
        if (result.success && result.data) {
          const urls = result.data.map((r: any) => r.url).filter(Boolean);
          freshUrls.push(...urls);
        }
      }
    }
  } catch (err) {
    console.error('[Wendy] Search failed, relying on seeds:', err);
  }

  // 2) Collect all seed URLs
  const seedUrls = Object.values(COMPETITOR_CONFIG).flatMap(m => m.seeds);
  const allUrls = [...new Set([...freshUrls, ...seedUrls])];

  // 3) Run the intelligence pipeline
  const leads = await discoverAndScoreLeads(allUrls, userId);

  console.log(`[Wendy] Cycle complete. Synced ${leads.length} real-world signals.`);
  return leads;
}

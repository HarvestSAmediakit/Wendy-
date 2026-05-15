import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Lead, PublicationType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models for specific task types as per guidelines
const BASIC_MODEL = "gemini-3.1-pro-preview";
const COMPLEX_MODEL = "gemini-3.1-pro-preview";

export async function enrichLead(companyName: string, sector: string, publication: PublicationType) {
  const prompt = `You are a professional lead enrichment assistant for a South African media sales executive.
The goal is to provide a "Decision Maker" and a "Reasoning" for why this company should advertise in ${publication}.

Company: ${companyName}
Sector: ${sector}

Return a JSON object in this format:
{
  "decisionMaker": "Name of CMO, Marketing Head, or PR manager",
  "title": "Official Designation",
  "email": "suggested business email",
  "phone": "suggested corporate number",
  "sourceReasoning": "1-2 sentences on why they are a good lead for ${publication}, mentioning competitors if relevant."
}

Use realistic South African data or research patterns if possible. If you don't know the specific person, suggest a realistic title and role.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL, 
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
       return "I apologize, Terrence, I have hit my daily limit for AI requests. My resources will reset soon.";
    }
    console.error("Gemini Enrichment Error:", error);
    return null;
  }
}

export async function enrichWithLinkedIn(lead: Lead) {
  const prompt = `Simulate an advanced LinkedIn Sales Navigator enrichment process for the following B2B lead:
Company: ${lead.companyName}
Decision Maker: ${lead.decisionMaker} (${lead.title})
Sector: ${lead.sector}

Return a short, highly professional, bulleted "Sales Navigator Intelligence Brief" detailing:
- Estimated tenure of the decision maker.
- Top 3 skills endorsed by colleagues.
- Recent company milestone or post (simulated) that provides a great hook for our outreach.
- Key secondary contact (if the primary DM is unavailable).

Format the output strictly as markdown. Keep it concise, B2B focused, and actionable.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit for AI requests. My resources will reset soon.";
    }
    console.error("Gemini LinkedIn Enrichment Error:", error);
    return "Error fetching LinkedIn insights.";
  }
}

export async function sourceFromCompetitors(competitorName: string, publication: PublicationType) {
  const prompt = `You are the "Market Warfare Engine" for an Elite Media Sales OS. 
The user wants to poach clients targeting the competitor: "${competitorName}" for our publication: ${publication}.

Generate exactly 3 B2B lead profiles that either compete with this brand, supply this brand, or operate in the same market space in South Africa. We need companies actively deploying marketing spend.

Return a JSON array of objects with the exact following schema:

[
  {
    "companyName": "Name of the target company",
    "sector": "Their industry/sector",
    "decisionMaker": "Name of marketing/PR/CEO lead",
    "title": "Their job title",
    "email": "suggested email",
    "phone": "suggested phone",
    "sourceReasoning": "Provide an 'AI Strategic Summary' explaining why this company is a high-value target for ${publication} compared to ${competitorName}. Speak like a senior strategy analyst."
  }
]

Rely on realistic South African data or plausible models. Ensure the output is valid JSON array.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL, 
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit for AI requests. My resources will reset soon.";
    }
    console.error("Gemini Competitor Sourcing Error:", error);
    return null;
  }
}

export async function extractLeadsFromMagazine(base64Data: string) {
  const prompt = `You are the "Company Intelligence Engine" for an Elite Sales Strategist.
Analyze the attached magazine PDF. Identify companies advertising, featured, or interviewed who could be potential B2B ad leads for a Q&A CEO profile feature in two magazines: Leadership Magazine and Black Business Quarterly (BBQ), as well as Harvest SA.

AWARD POINTS FOR:
+40 points: Company is launching in Africa, expanding aggressively, or is a notable growth story
+30 points: A brand new CEO, MD, or Country Head has been appointed in the last 6 months
+20 points: The company is a 100% black-owned SMME, a Level 1 B-BBEE contributor, or has a unique transformation story
+10 points: The company is launching a disruptive product or technology

DO NOT USE THESE OLD SIGNALS (ignore them):
- High advertising frequency in competitors (this is irrelevant for Q&A pitches)
- Standard display advertising presence (we want editorial, not ads)

For each identified company:
1. Extract company name.
2. Determine their sector.
3. Propose a potential decision maker role (e.g. "Marketing Director") and a plausible name.
4. Provide a plausible phone number and business email.
5. Determine which of our three publications they are OVERALL best suited for: "Harvest SA", "Black Business Quarterly", or "Leadership Magazine". 
6. Provide an "AI Strategic Summary" (sourceReasoning) explaining why they are a high-value target right now. Mention market positioning, expansion, competitors. Speak like a senior strategy analyst.

Return EXACTLY a JSON array of objects:
[
  {
    "companyName": "Name of the target company",
    "sector": "Their industry/sector",
    "decisionMaker": "Name of marketing/PR/CEO lead",
    "title": "Their job title",
    "email": "suggested email",
    "phone": "suggested phone",
    "score": "A numerical score (70-98) based on their Q&A profile potential",
    "publication": "Harvest SA", 
    "sourceReasoning": "AI Strategic Summary detailing exactly why this company should be pitched a Q&A interview right now."
  }
]`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL, 
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf"
          }
        },
        { text: prompt }
      ]
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return null;
    }
    console.error("Gemini Magazine Scraper Error:", error);
    return null;
  }
}

export async function getPitchScript(lead: Lead) {
  const USP_MAP: Record<string, string> = {
    'Black Business Quarterly': 'The only quarterly publication celebrating black business excellence for 20 years. 2026 Awards: 23 Oct. MTN Level 1 B-BBEE alignment opportunity.',
    'Harvest SA': 'Africa\'s first fully interactive digital agri-ecosystem. Strategic during FMD National State of Disaster (Feb 2026). Free 7-min AI interviews.',
    'Leadership Magazine': 'SA\'s premier leadership heritage for 25 years. Focus: Tim Rubushe interventions for NSFAS & PSET. Rates: R14k-R25k Full Page.'
  };

  const usp = USP_MAP[lead.publication] || 'Industry-leading publication reaching top decision makers.';

  const prompt = `You are WENDY, an Elite Sales PA for Terrence, a senior media sales director representing ${lead.publication}.
  
Your tone is Bloomberg meets McKinsey with a professional South African edge. You are an industry insider, a market analyst, and a strategic partner, NOT an overexcited salesperson.

Target Magazine USP: "${usp}"
Incorporate this unique selling proposition seamlessly where relevant.

The target is ${lead.decisionMaker} at ${lead.companyName} (${lead.sector}).
Lead Context: ${lead.sourceReasoning}

Provide a "Strategic Sales Brief" that generates a contextual persuasion script, formatted in Markdown with the following exact sections:

### The Opening Line
(A powerful hook based on their recent market moves or context. e.g., "I noticed your recent expansion into precision irrigation...")

### Strategic Angle
(WHY NOW, WHY THIS PUBLICATION, WHY THIS AUDIENCE. Frame it as alignment and intelligence.)

### Value Proposition
(Tailored specifically to their company and your publication. e.g., "Unlike broad publications, we give you measurable digital engagement with high-value buyers.")

### Objection Handling
(Predict one likely objection, such as "We already use [Competitor]," and provide the elite strategic counter-argument.)

### The Close
(An executive-level closing strategy. e.g., "Would you be open to a brief strategy discussion next week?")

Do NOT include pleasantries like "Hi Terrence, here is your script". Output the Markdown directly.`;

  try {
    const response = await ai.models.generateContent({ 
      model: COMPLEX_MODEL,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit for AI requests. My resources will reset soon.";
    }
    console.error("Gemini Pitch Error:", error);
    return "Error generating pitch script. Use standard template.";
  }
}

export async function scrapeCompetitorLeadsSearchBound(competitorName: string, sector: string) {
  const prompt = `Use Google Search to find 2 real, specific companies in South Africa that advertise or are featured in "${competitorName}" magazine, or operate heavily within the "${sector}" sector as potential B2B ad leads.
  
For Harvest SA Competitors (e.g., Farmers Weekly, Landbouweekblad, Food For Mzansi, Farmers Magazine), specifically look for "Sponsored Content", "Ad Index", and "Digital Partners".

For each company, provide:
1. "companyName": The real name of the company.
2. "sector": Their specific industry.
3. "decisionMaker": Identify a real decision maker (e.g. CMO, Marketing Director, CEO) from that company if possible, or give a highly plausible South African name.
4. "title": Their job title.
5. "phone": Their contact number (real if found, otherwise generic corporate).
6. "email": Their email address.
7. "score": A numerical score (70-98) based on their advertising potential.
8. "sourceReasoning": A 1-2 sentence explanation of why they are a good lead, referencing real trends or features.

Return EXACTLY a JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        tools: [{ googleSearch: {} }]
      },
      contents: prompt
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return [];
    }
    console.error("Gemini Scrape With Search Error:", error);
    return [];
  }
}

export async function researchTopicSearchBound(topic: string) {
  const prompt = `Use Google Search to research the following topic: "${topic}".
Provide a concise, 2-3 sentence executive summary of the real, current trends or facts regarding this topic. Avoid marketing fluff.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        tools: [{ googleSearch: {} }]
      },
      contents: prompt
    });

    return response.text || "No insights found.";
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit. My resources will reset soon.";
    }
    console.error("Gemini Search Topic Error:", error);
    return "Error conducting research.";
  }
}

export async function generateQuickPitch(lead: Lead) {
  const USP_MAP: Record<string, string> = {
    'Black Business Quarterly': 'The only quarterly publication celebrating black business excellence for 20 years. 2026 Awards: 23 Oct. MTN Level 1 B-BBEE alignment opportunity.',
    'Harvest SA': 'Africa\'s first fully interactive digital agri-ecosystem. Strategic during FMD National State of Disaster (Feb 2026). Free 7-min AI interviews.',
    'Leadership Magazine': 'SA\'s premier leadership heritage for 25 years. Focus: Tim Rubushe interventions for NSFAS & PSET. Rates: R14k-R25k Full Page.'
  };

  const usp = USP_MAP[lead.publication] || 'Industry-leading publication reaching top decision makers.';

  const prompt = `You are WENDY, Terrence's PA and Sales Strategist. Generate a personalized, high-converting 3-sentence email pitch for:
Company: ${lead.companyName}
Decision Maker: ${lead.decisionMaker} (${lead.title})
Publication of Interest: ${lead.publication}
Sector: ${lead.sector}
Reason for lead: ${lead.sourceReasoning}

Magazine USP: "${usp}"
Incorporate this unique selling proposition seamlessly where relevant.

The pitch should be elite, industry-informed, and brief. Mention why ${lead.publication} is the perfect fit for them right now using the USP. Output ONLY the 3-sentence email draft.`;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt 
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit. My resources will reset soon.";
    }
    console.error("Gemini Quick Pitch Error:", error);
    return "Error generating email pitch. Manual strategy advised.";
  }
}

export async function generateMarketIntelligence(magazineContext: string, leads: Lead[]) {
  const leadSummary = leads.map(l => `${l.companyName} (${l.sector}) - ${l.publication}`).join('\n');
  const prompt = `You are the "Strategic Oracle" for Terrence, a senior media sales executive. 
Analyze Terrence's current pipeline and the general South African business landscape for the ${magazineContext} context.

Current Leads in View:
${leadSummary}

Generate a "Market Intelligence Brief" that includes:
1. "The Pulse": 1-2 sentences on a major macro-trend currently affecting these sectors in SA.
2. "Strategic Pivot": One actionable suggestion for how Terrence should phrase his value proposition this week.
3. "High-Value Interaction": Identify which lead from the list is the most "time-sensitive" and why.

Tone: Executive, data-driven, polished. South African business context.
Format: Markdown.`;

  try {
    const response = await ai.models.generateContent({ 
      model: COMPLEX_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        tools: [{ googleSearch: {} }]
      },
      contents: prompt
    });

    return response.text || "No intelligence brief available at this time.";
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429) {
      console.warn("Gemini Market Intelligence Quota Exceeded (429)");
      return "I've hit my strategic limit for the moment, Terrence. Let's rely on manual pipeline review while I recharge my insights.";
    }
    console.error("Market Intelligence Error:", error);
    return "Intelligence feed currently offline. Strategic manual review advised.";
  }
}

export async function analyzeScrapedData(scrapedData: any[], targetPublication: string) {
  const prompt = `
    You are Wendy, an expert AI lead sourcer. I have scraped some competitor websites in the ${targetPublication} industry.
    Based on the following scraped data, identify exactly 3 high-value potential leads (companies) that might be interested in advertising with our publication, "${targetPublication}".
    
    Scraped Data Preview:
    ${JSON.stringify(scrapedData, null, 2)}
    
    For each identified lead, provide an object with these EXACT keys:
    - companyName: (String)
    - sector: (String)
    - score: (Number, 70-98)
    - sourceReasoning: (String, why were they found on the competitor site?)
    - angle: (String, strategic pitch angle)
    - feature: (String, what feature of ${targetPublication} should we pitch?)
    - benefit: (String, core benefit)
    - decisionMaker: (String, guess a realistic South African name)
    - title: (String, realistic title like Marketing Director)
    - email: (String, realistic corporate email based on company name)
    - phone: (String, realistic SA phone number)
    
    Return the response as a JSON array of objects. Do not include markdown formatting or extra text, just the raw JSON array.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: BASIC_MODEL, 
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } },
      contents: prompt
    });
    
    const text = response.text || "";
    return JSON.parse(text);
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429) {
      console.warn("Gemini Analysis Quota Exceeded (429)");
    }
    console.error("Frontend Gemini Analysis Error:", error);
    return [];
  }
}

export async function chatWithAssistant(message: string, history: {role: string, text: string}[], onFunctionCall: (name: string, args: any) => Promise<any>, magazineContext: string = 'All', customSystemPrompt?: string) {
  const contents: any[] = history.filter(m => m.role === 'user' || m.role === 'ai').map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));
  
  contents.push({ role: 'user', parts: [{ text: message }] });
  
  const systemInstruction = customSystemPrompt || `**System Prompt: The Wendy Engine (The Executive Strike Engine)**

You are Wendy, an elite AI Sales Co-Pilot working exclusively for Terrence, a senior advertising sales executive. 
You are a pure, high-octane Sales Intelligence Engine. You do EXACTLY three things:
1. Find the Lead: Scrape competitors.
2. Build the AFB Dossier: Generate the Angle, Feature, and Benefit.
3. Calculate the "Strike Window": Tell him the optimal time to strike based on industry data.

[The AFB Dossier]
When you find a lead, build a digital flashcard:
- The Angle (The "Why now?"): Scan their recent PR/ad spend. (e.g. "AgriCorp is pushing pivot irrigation tech in print, but lacks digital.")
- The Feature (The "What we have"): Match their need to Terrence's inventory.
- The Benefit (The "What they get"): The closing hook.

[The Strike Window Calculation]
You use 2026 B2B tele-sales data for South Africa to tell Terrence WHEN to dial:
- Harvest SA (Agriculture): Commercial farmers are operational midday. Tag leads with "Morning Strike" (08:00 - 09:30) or "Wind-Down Strike" (16:00 - 17:00).
- Leadership Magazine (C-Suite/Execs): CEOs are guarded 9 to 5. Tag leads with "Early Door" (07:45 - 08:30) or "Friday Afternoon Sleeper" (14:00 - 16:00).
- BBQ (Corporate/Procurement): Corporate managers check out by Friday. Tag leads with B2B "Golden Hours": Tuesdays, Wednesdays, Thursdays (10:00 - 11:30 AM or 14:00 - 15:30 PM).

[Domain Intelligence - 2026 Market Context]
- Leadership: Premium for C-suite (R14k-R25k Full Page). Positioning: Addressing attrition in PSET and NSFAS education reform.
- Harvest SA: Targeting Foot-and-Mouth Disease (FMD) crisis response. Positioning: "Connection Engine" for biosecurity and genomics modernization.
- BBQ: 20-year legacy. Target high B-BBEE achievers (like MTN Level 1). Positioning: Stars of the Boardroom awards alignment.
- Competitor Benchmarks: Landbouweekblad (R28k spot color), Farmers Weekly (R25k). Position Harvest SA as the interactive ecosystem.

[Guardrails]
* No "Big Brother": You do not monitor calls, you do not nag about lunch breaks, and you do not enforce POPIA form reading. You provide intelligence and point to the target. Terrence pulls the trigger.
* Zero Fluff: Do not use generic marketing jargon. Every output must be highly specific, direct, and actionable.

[Platform Intelligence Modules]
You have access to the following platform modules via function calling:

1. Publication & Advertiser Intelligence, Competitor Monitoring, Opportunity Scoring, Dynamic Pitch Generation, CRM functions, Media Kit Analysis, Market Mapping, and Real-Time Lead Discovery.
2. Web Intelligence: Use 'firecrawl_scrape' and 'firecrawl_search' to get real-time data from any website or the whole web.
3. Apollo Intelligence: Use 'apollo_match' to find verified contact info (email, phone, LinkedIn) for specific decision makers.

When interacting with Terrence, you maintain your warm, professional, concise personality. You speak with a South African English accent. You always consider his current magazine context (\${magazineContext === 'All' ? 'All three magazines: Black Business Quarterly, Harvest SA, Leadership' : magazineContext}), but you can pull data from the full platform to make smarter recommendations.

When performing UI actions, output a JSON command:
|||{ "intent": "...", "params": {...} }|||
Supported intents for JSON output:
- COMPLETE_LEAD (params: targetName)
- SCRAPE (params: publication)
- PLAN_DIARY
- SHOW_DASHBOARD (params: dashboard_type)
- SHOW_LEADS
- SHOW_CALENDAR

You are the perfect PA, now armed with the most powerful B2B media intelligence system on the continent.\`;`;

  try {
    const { tools } = await import('../lib/geminiLive');
    
    let response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction,
        tools: [{ functionDeclarations: tools }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const toolCall = response.functionCalls[0];
      const result = await onFunctionCall(toolCall.name, toolCall.args);
      
      contents.push({
        role: 'model',
        parts: [{ functionCall: toolCall }]
      });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: toolCall.name, response: result } }]
      });
      
      response = await ai.models.generateContent({
        model: BASIC_MODEL,
        contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction,
          tools: [{ functionDeclarations: tools }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });
    }

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      return "I apologize, Terrence, I have hit my daily limit. My resources will reset soon.";
    }
    console.error("Gemini Chat Error:", error);
    return "Error communicating with AI assistant.";
  }
}

import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const tools: FunctionDeclaration[] = [  
  {
    name: "complete_lead",
    description: "COMPLETE_LEAD: Mark a lead's status as completed",
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetName: { type: Type.STRING, description: "Name of the person or company" }
      },
      required: ["targetName"]
    }
  },
  {
    name: "scrape",
    description: "SCRAPE: Find and scrape new leads from the web",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "plan_diary",
    description: "PLAN_DIARY: Plan the user's day and populate the diary panel",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "search_publications",
    description: "Search the master publications database by industry, province, audience size, frequency, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industry: { type: Type.STRING },
        province: { type: Type.STRING },
        publication_type: { type: Type.STRING, description: "magazine, newsletter, podcast, etc." },
        digital_only: { type: Type.BOOLEAN }
      }
    }
  },
  {
    name: "search_advertisers",
    description: "Find companies that advertise in B2B media, filterable by industry, location, spend probability, growth signals.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industry: { type: Type.STRING },
        min_score: { type: Type.NUMBER },
        active_in_publication: { type: Type.STRING },
        has_funding: { type: Type.BOOLEAN }
      }
    }
  },
  {
    name: "get_advertiser_profile",
    description: "Retrieve full advertiser intelligence for a given company.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        company_name: { type: Type.STRING }
      },
      required: ["company_name"]
    }
  },
  {
    name: "track_competitor_movements",
    description: "Get recent competitor intelligence for a given publication or sector.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        publication_name: { type: Type.STRING },
        event_type: { type: Type.STRING, description: "new_advertiser, sponsorship, staff_change, etc." },
        days: { type: Type.NUMBER }
      }
    }
  },
  {
    name: "score_opportunities",
    description: "Run AI opportunity scoring for a list of companies or for a specific industry and target publication.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industry: { type: Type.STRING },
        target_publication: { type: Type.STRING },
        min_score: { type: Type.NUMBER }
      }
    }
  },
  {
    name: "schedule_lead",
    description: "Schedule a lead into the user's calendar at a specific time with a tailored pitch.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        lead_id: { type: Type.STRING, description: "ID of the lead or name of the company" },
        day_of_week: { type: Type.STRING, description: "Monday, Tuesday, Wednesday, etc." },
        time: { type: Type.STRING, description: "HH:MM format, e.g., 09:15" },
        pitch_angle: { type: Type.STRING, description: "The strategic angle/features/benefits for this lead" }
      },
      required: ["lead_id", "day_of_week", "time", "pitch_angle"]
    }
  },
  {
    name: "generate_proposal",
    description: "Generate a full sponsorship or advertising proposal document.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        advertiser_id: { type: Type.STRING },
        publication_id: { type: Type.STRING },
        proposal_type: { type: Type.STRING, description: "email, deck, one-pager" }
      },
      required: ["advertiser_id", "publication_id"]
    }
  },
  {
    name: "show_dashboard",
    description: "Display a specific dashboard view (opportunities, trends, competitor).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        dashboard_type: { type: Type.STRING },
        magazine_context: { type: Type.STRING }
      },
      required: ["dashboard_type"]
    }
  },
  {
    name: "discover_leads",
    description: "Find new leads from real-time discovery based on growth signals.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industry: { type: Type.STRING },
        signal_type: { type: Type.STRING, description: "funding, hiring, product_launch, etc." },
        limit: { type: Type.NUMBER }
      }
    }
  },
  {
    name: "switch_context",
    description: "Switch the application's focus to a specific magazine.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        context: { type: Type.STRING, description: "The magazine to focus on: 'All', 'Black Business Quarterly', 'Harvest SA', or 'Leadership Magazine'" }
      },
      required: ["context"]
    }
  },
  {
    name: "show_leads",
    description: "Filter and display strategic leads in the UI.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sector: { type: Type.STRING, description: "Industry sector" },
        magazine_context: { type: Type.STRING, description: "Magazine Context filter" }
      }
    }
  },
  {
    name: "search_web",
    description: "Execute real-time business intelligence or social listening research.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING }
      },
      required: ["query"]
    }
  },
  {
    name: "generate_market_briefing",
    description: "Generate a strategic market intelligence briefing based on the current context and leads.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        magazine_context: { type: Type.STRING, description: "The publication focus for the briefing." }
      }
    }
  },
  {
    name: "firecrawl_scrape",
    description: "Scrape a website using Firecrawl. Supports converting to markdown, or extracting structured JSON data if a schema is provided. Can handle PDFs and complex layouts.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL of the website or PDF to scrape" },
        schema: { type: Type.OBJECT, description: "A JSON schema to extract structured data. Use for finding specific points like advertisements, contact info, or market moves." }
      },
      required: ["url"]
    }
  },
  {
    name: "firecrawl_search",
    description: "Search the web using Firecrawl to find relevant pages and data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "apollo_match",
    description: "Use the Apollo Intelligence database to find verified contact data (email, phone, LinkedIn) for a specific person.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        firstName: { type: Type.STRING, description: "Person's first name" },
        lastName: { type: Type.STRING, description: "Person's last name" },
        companyName: { type: Type.STRING, description: "Company name" },
        email: { type: Type.STRING, description: "Optional current email index" }
      },
      required: ["firstName", "lastName", "companyName"]
    }
  }
];

export class GeminiLiveSession {
  private micContext: AudioContext | null = null;
  private playContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private nextPlayTime: number = 0;
  private sessionPromise: Promise<any> | null = null;
  private isConnected = false;

  constructor(
    private onReady: () => void,
    private onError: (err: any) => void,
    private onMessage: (role: string, text: string) => void,
    private onFunctionCall: (name: string, args: any) => Promise<any>,
    private onSpeakingStateChange?: (isSpeaking: boolean) => void,
    private magazineContext: string = 'All',
    private persona: string = 'polished'
  ) {}

  async start() {
    this.micContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    this.playContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });

    const WENDY_PROMPT = `You are WENDY, the AI embodiment of “Terrence’s PA”—the first AI-powered B2B media intelligence platform in Africa. Your sole purpose is to make Terrence the most successful advertising salesperson in South Africa. You are always on, always listening, always proactive, and you control the entire app through voice and UI commands.

---

TERRENCE’S MAGAZINES (he sells advertising for exactly three titles):

1) Black Business Quarterly (BBQ)
   - Website: bbqonline.co.za
   - Premier B2B publication celebrating black business excellence and SMME growth; 15,000 quarterly circulation, direct-to-CEO distribution.
   - USP: “The only quarterly publication dedicated to black business leadership, read by 95% of SA's top black CEOs.”
   - Competitors: African Decisions, Business Brief, Entrepreneur SA, Financial Mail, Forbes Africa, African Leader

2) Harvest SA
   - Website: harvestsa.co.za
   - Africa's first fully interactive digital-first agricultural ecosystem, featuring AI chatbots, video storytelling, and a Harvest-to-Hub retail network.
   - USP: “Not just a magazine—an agri-ecosystem with interactive video, AI farming assistants, and a direct trade platform connecting farmers to buyers.”
   - Competitors: Farmer's Weekly, Landbouweekblad, Food For Mzansi, African Farming, Farmers Magazine

3) Leadership
   - Website: leadershiponline.co.za
   - One of SA's most established business and political leadership magazines, monthly, 20,000 circulation, high-level interviews, and hybrid events.
   - USP: “25 years of strategic conversation with the people who shape South Africa—now amplified with live summits and digital thought-leadership series.”
   - Competitors: Financial Mail, Forbes Africa, BusinessTech, Daily Investor, CEO Magazine

---

CRITICAL: TERRENCE’S SALES MODEL

Terrence does NOT sell traditional display adverts for Leadership and BBQ. He sells premium, authoritative Q&A interview profiles with CEOs and founders. His pitch is: “We don't want to sell you an ad next to an article. We want to make YOUR story the article.”

Your primary job is to identify companies that have a genuine story worth telling through this Q&A format. Prioritize the NARRATIVE, not the media spend.

PRIORITY LEAD SIGNALS (Leadership Magazine):
- A new CEO, MD, or Country Head appointed in SA within the last 6 months (+30 points)
- A pan-African expansion story, merger, turnaround, or recent JSE listing (+40 points)
- A company driving major innovation or digital transformation (+20 points)
- Disruptive product launch or entry into new markets (+10 points)

PRIORITY LEAD SIGNALS (Black Business Quarterly):
- High-growth, majority black-owned SMMEs or Level 1 B-BBEE contributors (+40 points)
- A newly appointed black CEO or founder at a notable company (+30 points)
- Innovative transformation, sustainability, or community impact stories (+20 points)
- Entrepreneurs who broke into new markets with a unique product (+10 points)

PRIORITY LEAD SIGNALS (Harvest SA):
- Agri-tech companies launching new technology, products, or services (+40 points)
- Farming enterprises scaling operations or entering export markets (+30 points)
- Companies involved in sustainable agriculture, water tech, or green energy (+20 points)
- Advertisers appearing in competitor agricultural publications (+15 points)

IGNORE THESE OLD SIGNALS (they are irrelevant for Q&A pitches):
- High advertising frequency in competitor magazines
- Standard display advertising presence
- Generic “brand awareness” campaigns



---

YOUR CAPABILITIES & TOOLS

You have access to the following via Google AI Studio:
- Grounding with Google Search: retrieve real-time, factual information about any company, CEO appointment, funding round, expansion, or industry trend
- URL Context: when Terrence or a system process provides specific competitor URLs, you read the full page content deeply and extract all advertisers, sponsored articles, company mentions, and editorial leads
- Structured Output: when needed, output clean JSON of leads, scores, and reasoning
- Function Calling: if wired to an external backend, you can execute database queries, add leads to a strike list, and generate pitches programmatically

For every lead you identify, output this structured format:

{
  "company_name": "...",
  "industry": "...",
  "target_magazine": "Leadership" | "BBQ" | "Harvest SA" | "Multiple",
  "lead_score": 0-100,
  "signals": ["signal1", "signal2"],
  "q&a_angle": "A 2-sentence editorial hook explaining why this CEO/founder is a compelling interview subject",
  "source": "URL or search result where you found the information"
}

---

PERSONALITY

You are warm, professional, proactive, and concise—like the best executive assistant in the world. You speak with South African English phrasing and cultural awareness. You refer to Terrence by name naturally but not excessively. You anticipate his needs before being asked. You never fabricate information; if you cannot find verification, you say so clearly and offer to search further.

---

YOUR MORNING STAND-UP (when Terrence opens the app or says “Morning, Wendy”)

Always deliver:
1. Number of new Q&A leads discovered (by magazine)
2. The top 3 leads by score, with a one-line hook for each
3. Any urgent actions (follow-ups due, breaking news about existing leads)
4. A recommended focus for the day

---

EXAMPLE INTERACTIONS

Terrence: “Wendy, find me Q&A leads for Leadership—I want new CEOs appointed in SA.”

You: search Google for “new CEO appointment South Africa 2026”, retrieve real articles, and output a scored list of companies with new CEOs to pitch. You always include the source URL so Terrence can verify.

Terrence: “Wendy, what’s in Farmer's Weekly this week that I can pitch for Harvest SA?”

You: if given the URL, use URL Context to read the full page; if not, use Google Search to find recent editions and advertiser/sponsor lists. Then output leads mapped to Harvest SA.

Terrence: “Draft a Q&A pitch email for Cassava Technologies for Leadership.”

You: generate a 3-sentence email that references their specific story (e.g., building Nvidia-powered AI factories in Cape Town and Joburg), ties it to Leadership’s executive audience, and proposes the Q&A interview format.`;

    const personaPrompts = {
      calm: WENDY_PROMPT,
      energetic: WENDY_PROMPT,
      polished: WENDY_PROMPT
    };

    this.sessionPromise = ai.live.connect({
      model: "gemini-3.1-flash-live-preview", 
      config: {
        responseModalities: [Modality.AUDIO],
        tools: [{ functionDeclarations: tools }],
        systemInstruction: `SYSTEM: ${personaPrompts[this.persona as keyof typeof personaPrompts] || personaPrompts.polished}
Your role is to act as an executive co-pilot. You can control the app through functions.

You have access to Publication Intelligence, AI Competitor Monitoring, Advertiser Intelligence, Opportunity Scoring, Pitch Generation, and Market Mapping.

CURRENT MAGAZINE CONTEXT: ${this.magazineContext === 'All' ? 'All three magazines: Black Business Quarterly, Harvest SA, Leadership' : this.magazineContext} - focus strictly on this title if specified.

Operational Guidelines:
- Be concise.
- Refer to yourself as WENDY.
- After calling a function, explain what you are showing or doing with your voice.
- If you tell the user you are pulling something up on the screen, you MUST call the corresponding UI tool (e.g., \`show_leads\`, \`show_dashboard\`, \`generate_market_briefing\`) to actually change the screen.
- When asked to schedule leads in the calendar, you MUST FIRST propose the schedule and ask the user to confirm. DO NOT call \`schedule_lead\` until the user has explicitly confirmed the schedule.
- When the user confirms, call \`schedule_lead\` for each discussed appointment.
- Never output raw JSON to the user; only invoke the tools correctly.`,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }
          }
        }
      },
      callbacks: {
        onopen: () => {
          this.isConnected = true;
          this.onReady();
          this.startMicrophone();
          console.log("Gemini Live connected");
        },
        onmessage: async (msg: LiveServerMessage) => {
          console.log("Gemini Live message received:", JSON.stringify(msg));
          // Play audio
          const b64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (b64) {
            console.log("Received audio chunk");
            this.playAudioChunk(b64);
          }
          
          // Handle interruptions
          if (msg.serverContent?.interrupted) {
            this.stopPlayback();
          }

          // Transcription
          const text = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
          if (text) {
             console.log("Received text:", text);
             this.onMessage('ai', text);
          }

          // Tool calls
          const toolCall = msg.toolCall;
          if (toolCall && toolCall.functionCalls) {
            console.log("Received tool calls:", JSON.stringify(toolCall.functionCalls));
            const responses = await Promise.all(toolCall.functionCalls.map(async (call: any) => {
              const name = call.name;
              const args = call.args;
              try {
                const result = await this.onFunctionCall(name, args);
                return {
                  id: call.id,
                  name: name,
                  response: result
                };
              } catch (err: any) {
                return {
                  id: call.id,
                  name: name,
                  response: { error: err.message }
                };
              }
            }));
            
            const session = await this.sessionPromise;
            if (session) {
               session.sendToolResponse({ functionResponses: responses });
            }
          }
        },
        onerror: (err) => {
          console.error("Live API Error:", err);
          this.onError(err);
        },
        onclose: () => {
          console.log("Gemini Live closed");
          this.stop();
        }
      }
    });

    await this.sessionPromise;
  }

  stopPlayback() {
     if (this.playContext) {
        // Suspend and resume clears pending buffers for standard audio buffer sources? 
        // Better way: close context and recreate or maintain a list of sources.
        // For simplicity, suspend and resume might not clear already scheduled sources.
        if (this.playContext.state !== 'closed') {
          this.playContext.close().catch(console.error);
        }
        this.playContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
        this.nextPlayTime = 0;
     }
  }

  async stop() {
    this.isConnected = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (this.scriptNode) {
      this.scriptNode.disconnect();
    }
    if (this.micContext && this.micContext.state !== 'closed') {
      await this.micContext.close().catch(console.error);
    }
    if (this.playContext && this.playContext.state !== 'closed') {
      await this.playContext.close().catch(console.error);
    }
    
    // Close session gracefully if genai SDK supports it.
    // The promise returns a session object.
    const session = await this.sessionPromise;
    if (session && typeof session.close === 'function') {
        session.close();
    }
  }

  private playAudioChunk(b64: string) {
    if (!this.playContext) return;

    if (this.onSpeakingStateChange) {
      this.onSpeakingStateChange(true);
      // Clear after a short delay if no more chunks
      if ((this as any).speakingTimeout) clearTimeout((this as any).speakingTimeout);
      (this as any).speakingTimeout = setTimeout(() => {
        if (this.onSpeakingStateChange) this.onSpeakingStateChange(false);
      }, 2000);
    }

    if (this.playContext.state === 'suspended') {
        this.playContext.resume();
    }

    try {
        const rawStr = window.atob(b64);
        const len = rawStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = rawStr.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = this.playContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = this.playContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.playContext.destination);

        if (this.nextPlayTime < this.playContext.currentTime) {
            this.nextPlayTime = this.playContext.currentTime + 0.01;
        }
        source.start(this.nextPlayTime);
        this.nextPlayTime += audioBuffer.duration;
    } catch (e) {
        console.error("Failed to play audio chunk", e);
    }
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private async startMicrophone() {
    if (!this.micContext) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = new Error("Microphone access is not supported in this browser.");
        console.error(error.message);
        this.onError(error);
        return;
    }
    try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        } });
        
        const source = this.micContext.createMediaStreamSource(this.mediaStream);
        this.scriptNode = this.micContext.createScriptProcessor(4096, 1, 1);
        
        this.scriptNode.onaudioprocess = async (e) => {
            if (!this.isConnected || !this.sessionPromise) return;
            const floatData = e.inputBuffer.getChannelData(0);
            const intData = this.float32ToInt16(floatData);

            // Convert Int16Array to base64
            const uint8Data = new Uint8Array(intData.buffer);
            let binary = '';
            // Chunking it to avoid max arguments length
            for (let i = 0; i < uint8Data.byteLength; i++) {
                binary += String.fromCharCode(uint8Data[i]);
            }
            const b64 = window.btoa(binary);

            const session = await this.sessionPromise;
            // Send to live session
            session.sendRealtimeInput({
                 audio: { data: b64, mimeType: 'audio/pcm;rate=16000' }
            });
        };

        source.connect(this.scriptNode);
        this.scriptNode.connect(this.micContext.destination);
    } catch (e) {
        let errorMessage = "Microphone setup failed: ";
        if (e instanceof Error) {
            errorMessage += e.message;
            if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioInputs = devices.filter(device => device.kind === 'audioinput');
                    if (audioInputs.length === 0) {
                        errorMessage = "No microphone device detected on your system. Please connect a microphone.";
                    } else {
                        errorMessage = "No microphone device found. Please ensure your default microphone is correctly set in your browser and OS settings.";
                    }
                } catch (enumErr) {
                    errorMessage = "No microphone device found. Please ensure a microphone is connected and you have granted permission.";
                }
            } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                errorMessage = "Microphone access denied. Please allow microphone permissions in your browser settings (look for a camera/mic icon in the URL bar).";
            }
        }
        console.error(errorMessage, e);
        this.onError(new Error(errorMessage));
    }
  }
}

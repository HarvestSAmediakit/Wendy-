import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export const WENDY_SYSTEM_PROMPT = `You are WENDY, the AI embodiment of "Terrence's PA"—the first AI-powered B2B media intelligence platform in Africa. Your sole purpose is to make Terrence the most successful advertising salesperson in South Africa. You are always on, always listening, always proactive, and you control the entire app through voice and UI commands.

---

TERRENCE'S MAGAZINES (he sells advertising for exactly three titles):

1) Black Business Quarterly (BBQ)
   - Website: bbqonline.co.za
   - Premier B2B publication celebrating black business excellence and SMME growth; 15,000 quarterly circulation, direct-to-CEO distribution.
   - USP: "The only quarterly publication dedicated to black business leadership, read by 95% of SA's top black CEOs."
   - Competitors: African Decisions, Business Brief, Entrepreneur SA, Financial Mail, Forbes Africa, African Leader

2) Harvest SA
   - Website: harvestsa.co.za
   - Africa's first fully interactive digital-first agricultural ecosystem, featuring AI chatbots, video storytelling, and a Harvest-to-Hub retail network.
   - USP: "Not just a magazine—an agri-ecosystem with interactive video, AI farming assistants, and a direct trade platform connecting farmers to buyers."
   - Competitors: Farmer's Weekly, Landbouweekblad, Food For Mzansi, African Farming, Farmers Magazine

3) Leadership
   - Website: leadershiponline.co.za
   - One of SA's most established business and political leadership magazines, monthly, 20,000 circulation, high-level interviews, and hybrid events.
   - USP: "25 years of strategic conversation with the people who shape South Africa—now amplified with live summits and digital thought-leadership series."
   - Competitors: Financial Mail, Forbes Africa, BusinessTech, Daily Investor, CEO Magazine

---

CRITICAL: TERRENCE'S SALES MODEL

Terrence does NOT sell traditional display adverts for Leadership and BBQ. He sells premium, authoritative Q&A interview profiles with CEOs and founders. His pitch is: "We don't want to sell you an ad next to an article. We want to make YOUR story the article."

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

---

YOUR CAPABILITIES & TOOLS

For every lead you identify, output this structured JSON format (ALWAYS include a leads array in your response when identifying leads, wrapped in a JSON block):

\`\`\`json
{
  "leads": [
    {
      "company_name": "...",
      "industry": "...",
      "target_magazine": "Leadership" or "BBQ" or "Harvest SA" or "Multiple",
      "lead_score": 0-100,
      "signals": ["signal1", "signal2"],
      "qa_angle": "A 2-sentence editorial hook explaining why this CEO/founder is a compelling interview subject",
      "source": "URL or search result where you found the information",
      "contact_suggestion": "Suggested contact person or role"
    }
  ]
}
\`\`\`

After the JSON block, provide a brief human-friendly summary.

PERSONALITY
You are warm, professional, proactive, and concise. Speak with South African English phrasing. Refer to Terrence by name naturally.`;

const MAG_CONFIG: Record<string, any> = {
  Leadership: {
    color: "#C9A84C",
    bg: "rgba(201,168,76,0.08)",
    border: "rgba(201,168,76,0.25)",
    badge: "#C9A84C",
    icon: "◆",
    desc: "B2B executive Q&A profiles",
  },
  BBQ: {
    color: "#E05A2B",
    bg: "rgba(224,90,43,0.08)",
    border: "rgba(224,90,43,0.25)",
    badge: "#E05A2B",
    icon: "▲",
    desc: "Black business excellence",
  },
  "Harvest SA": {
    color: "#4CAF7D",
    bg: "rgba(76,175,125,0.08)",
    border: "rgba(76,175,125,0.25)",
    badge: "#4CAF7D",
    icon: "●",
    desc: "Agri-ecosystem intelligence",
  },
};

const QUICK_PROMPTS = [
  { label: "Morning Stand-Up", msg: "Morning, Wendy! Give me my daily brief.", mag: null },
  { label: "New CEO Leads", msg: "Wendy, search for brand new CEO appointments in South Africa in 2025-2026. Top 5 for Leadership.", mag: "Leadership" },
  { label: "Black SMME Leads", msg: "Wendy, find high-growth black-owned SMMEs in SA. Best profiles for BBQ?", mag: "BBQ" },
  { label: "Agri-Tech Leads", msg: "Wendy, find agri-tech companies scaling in SA for Harvest SA.", mag: "Harvest SA" }
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#4CAF7D" : score >= 60 ? "#C9A84C" : "#E05A2B";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color,
      }}>{score}</span>
    </div>
  );
}

function LeadCard({ lead }: { lead: any }) {
  const [expanded, setExpanded] = useState(false);
  const mag = lead.target_magazine === "Multiple" ? "Leadership" : lead.target_magazine;
  const cfg = MAG_CONFIG[mag] || MAG_CONFIG["Leadership"];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${expanded ? cfg.border : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        marginBottom: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: cfg.color, borderRadius: "12px 0 0 12px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ScoreRing score={lead.lead_score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 700, color: "#F0EDE8", letterSpacing: 0.3 }}>
              {lead.company_name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
              color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 4, padding: "2px 7px",
            }}>
              {cfg.icon} {lead.target_magazine}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
            {lead.industry}
          </div>
        </div>
        <div style={{ color: "#555", fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "none" }}>▶</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 13.5, color: "#C8C0B0", lineHeight: 1.65, fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", marginBottom: 12 }}>
            "{lead.qa_angle}"
          </div>
          {lead.signals?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {lead.signals.map((s: string, i: number) => (
                <span key={i} style={{ fontSize: 11, color: "#aaa", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.09)" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {lead.contact_suggestion && (
            <div style={{ fontSize: 12, color: "#777", fontFamily: "'IBM Plex Mono', monospace" }}>
              📋 Contact: {lead.contact_suggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WendyOrb({ thinking }: { thinking: boolean }) {
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: thinking
          ? "radial-gradient(circle at 35% 35%, #fff 0%, #C9A84C 30%, #8B5E1A 70%, #2A1A00 100%)"
          : "radial-gradient(circle at 35% 35%, #fff 0%, #C9A84C 35%, #7A5010 75%, #1A0E00 100%)",
        boxShadow: thinking
          ? "0 0 20px rgba(201,168,76,0.6), 0 0 40px rgba(201,168,76,0.3)"
          : "0 0 12px rgba(201,168,76,0.3)",
        animation: thinking ? "pulse 1.2s ease-in-out infinite" : "none",
      }} />
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }`}</style>
    </div>
  );
}

function MessageBubble({ msg, leads, onLeadsExtracted }: { msg: any, leads: any[], onLeadsExtracted?: (leads: any[]) => void }) {
  useEffect(() => {
    if (leads?.length > 0 && onLeadsExtracted) onLeadsExtracted(leads);
  }, []);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
      {msg.role === "assistant" && <WendyOrb thinking={false} />}
      <div style={{
        maxWidth: "78%",
        background: msg.role === "user"
          ? "rgba(201,168,76,0.12)"
          : "rgba(255,255,255,0.04)",
        border: msg.role === "user"
          ? "1px solid rgba(201,168,76,0.25)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
      }}>
        <div style={{ fontSize: 13.5, color: "#D8D0C8", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          {msg.display || msg.content}
        </div>
        {leads?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "#666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              ▸ {leads.length} Lead{leads.length !== 1 ? "s" : ""} Identified
            </div>
            {leads.map((lead: any, i: number) => <LeadCard key={i} lead={lead} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function parseLeads(text: string) {
  try {
    const match = text.match(/\`\`\`json\s*([\s\S]*?)\`\`\`/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      return parsed.leads || [];
    }
    const directMatch = text.match(/\{[\s\S]*"leads"[\s\S]*\}/);
    if (directMatch) {
      const parsed = JSON.parse(directMatch[0]);
      return parsed.leads || [];
    }
  } catch {}
  return [];
}

function stripJson(text: string) {
  return text.replace(/\`\`\`json[\s\S]*?\`\`\`/g, "").replace(/^\s*\n/, "").trim();
}

import { chatWithAssistant } from '../services/geminiService';

export default function WendyAppStandalone({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [filterMag, setFilterMag] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [publicationFilter, setPublicationFilter] = useState("All");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLeadsExtracted = (leads: any[]) => {
    setAllLeads(prev => {
      const existing = new Set(prev.map(l => l.company_name));
      const newLeads = leads.filter(l => !existing.has(l.company_name));
      return [...newLeads, ...prev];
    });
  };

  const sendMessage = async (text?: string) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", content: userMsg, text: userMsg }];
    setMessages(newMessages);

    try {
      // Use Gemini instead of Anthropic
      const responseText = await chatWithAssistant(
        userMsg, 
        newMessages, 
        async () => ({ status: 'success' }), 
        'All',
        WENDY_SYSTEM_PROMPT
      );
      const leads = parseLeads(responseText);
      const display = stripJson(responseText);

      const assistantMsg = { role: "assistant", text: responseText, content: responseText, display, leads };
      setMessages(prev => [...prev, assistantMsg]);
      if (leads.length > 0) handleLeadsExtracted(leads);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error.", text: "Connection error.", display: "Connection error.", leads: [] }]);
    }
    setLoading(false);
  };

  const filteredLeads = allLeads.filter(l => {
    const matchesMag = filterMag === "All" || l.target_magazine === filterMag || (filterMag === "Multiple" && l.target_magazine === "Multiple");
    const matchesSector = sectorFilter === "All" || l.industry === sectorFilter;
    const matchesStatus = statusFilter === "All" || l.status === statusFilter;
    const matchesPub = publicationFilter === "All" || l.target_magazine === publicationFilter; // Using target_magazine as publication
    return matchesMag && matchesSector && matchesStatus && matchesPub;
  });

  const leadCounts = {
    "Leadership": allLeads.filter(l => l.target_magazine === "Leadership" || l.target_magazine === "Multiple").length,
    "BBQ": allLeads.filter(l => l.target_magazine === "BBQ" || l.target_magazine === "Multiple").length,
    "Harvest SA": allLeads.filter(l => l.target_magazine === "Harvest SA" || l.target_magazine === "Multiple").length,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, minHeight: "100vh", background: "#080806", color: "#E8E0D0", fontFamily: "'Cormorant Garamond', Georgia, serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
        textarea:focus { outline: none; }
        button { cursor: pointer; border: none; background: none; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .msg-appear { animation: fadeSlide 0.35s ease forwards; }
        .quick-btn:hover { background: rgba(201,168,76,0.15) !important; border-color: rgba(201,168,76,0.4) !important; color: #C9A84C !important; }
      `}</style>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: 0.6, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 60, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,8,6,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fff 0%, #C9A84C 35%, #7A5010 75%, #1A0E00 100%)", boxShadow: "0 0 12px rgba(201,168,76,0.4)" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 700, letterSpacing: 1.5, color: "#C9A84C" }}>WENDY</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>Terrence's PA · Media Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {Object.entries(MAG_CONFIG).map(([mag, cfg]) => (
            <div key={mag} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "block" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#666" }}>{mag === "BBQ" ? "BBQ" : mag.split(" ")[0]}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: cfg.color, fontWeight: 700 }}>{leadCounts[mag as keyof typeof leadCounts]}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3, alignItems: 'center' }}>
          {["chat", "leads"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "5px 14px", borderRadius: 6, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
              color: activeTab === tab ? "#080806" : "#666",
              background: activeTab === tab ? "#C9A84C" : "transparent",
              transition: "all 0.2s",
            }}>
              {tab === "leads" ? `Leads (${allLeads.length})` : tab}
            </button>
          ))}
          {onClose && (
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>
        {activeTab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 10px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px 40px" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #fff 0%, #C9A84C 35%, #7A5010 75%, #1A0E00 100%)", boxShadow: "0 0 24px rgba(201,168,76,0.4), 0 0 60px rgba(201,168,76,0.15)", margin: "0 auto 20px" }} />
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#C9A84C", letterSpacing: 2 }}>Good day, Terrence.</div>
                  <div style={{ fontSize: 15, color: "#666", marginTop: 8, fontStyle: "italic" }}>Your intelligence briefing is ready when you are.</div>
                  <div style={{ marginTop: 40, textAlign: "left", maxWidth: 640, margin: "40px auto 0" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {QUICK_PROMPTS.map((p, i) => {
                        const cfg = p.mag ? MAG_CONFIG[p.mag] : null;
                        return (
                          <button key={i} className="quick-btn" onClick={() => sendMessage(p.msg)} style={{ padding: "10px 14px", borderRadius: 8, textAlign: "left", background: cfg ? cfg.bg : "rgba(255,255,255,0.03)", border: `1px solid ${cfg ? cfg.border : "rgba(255,255,255,0.08)"}`, color: cfg ? cfg.color : "#888", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s" }}>
                            {cfg && <span style={{ marginRight: 6 }}>{cfg.icon}</span>}
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="msg-appear"><MessageBubble msg={msg} leads={msg.leads} onLeadsExtracted={handleLeadsExtracted} /></div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }} className="msg-appear">
                  <WendyOrb thinking={true} />
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px 16px 16px 16px", padding: "14px 18px" }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map(j => <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: "#C9A84C", animation: `shimmer 1.2s ease-in-out ${j * 0.25}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,8,6,0.95)", backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask Wendy anything..." rows={1} style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#E8E0D0", fontSize: 14, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: loading || !input.trim() ? "rgba(201,168,76,0.15)" : "#C9A84C", color: loading || !input.trim() ? "rgba(201,168,76,0.4)" : "#080806", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "leads" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <select style={{ background: "rgba(255,255,255,0.05)", color: "#E8E0D0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "5px 10px", fontSize: 13 }} value={filterMag} onChange={e => setFilterMag(e.target.value)}>
                <option value="All">All Magazines</option>
                <option value="BBQ">BBQ</option>
                <option value="Harvest SA">Harvest SA</option>
                <option value="Leadership">Leadership</option>
              </select>
              <select style={{ background: "rgba(255,255,255,0.05)", color: "#E8E0D0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "5px 10px", fontSize: 13 }} value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
                <option value="All">All Sectors</option>
                {Array.from(new Set(allLeads.map(l => l.industry))).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select style={{ background: "rgba(255,255,255,0.05)", color: "#E8E0D0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "5px 10px", fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                {["New", "In Progress", "Interested"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {filteredLeads.map((l, i) => <LeadCard key={i} lead={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}

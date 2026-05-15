export type PublicationType = "Harvest SA" | "Black Business Quarterly" | "Leadership Magazine";

export type LeadStatus = "New" | "In Progress" | "Interested" | "Follow-up" | "Declined" | "Archived";

export interface Evidence {
  id: string;
  source: string;
  url: string;
  screenshotUrl?: string;
  date: string;
  spendEstimate?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  sector: string;
  publication: PublicationType;
  target_magazine?: string; // M001, M002, M003
  source_competitor?: string;
  decisionMaker: string;
  title: string;
  phone: string;
  email: string;
  source: string;
  sourceReasoning: string;
  competitorSpendAnalysis?: string;
  complianceCheck?: string;
  evidence: Evidence[];
  status: LeadStatus;
  score: number;
  angle?: string;
  feature?: string;
  benefit?: string;
  linkedInInsights?: string;
  linkedinUrl?: string;
  apolloVerified?: boolean;
  quickPitch?: string;
  createdAt: string;
  updatedAt: string;
  nextFollowUp?: string;
  ownerId: string;
}

export interface StrikeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  leadId: string;
  repId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ConsentRecord {
  id: string;
  leadId: string;
  repId: string;
  timestamp: string;
  form4Text: string;
  consentHash: string;
  recordingUrl?: string;
}

export interface PromptVersion {
  id: string;
  role: string;
  instruction: string;
  guardrails: string;
  specifics: string;
  triadFlags: {
    analyst: boolean;
    profiler: boolean;
    strategist: boolean;
  };
  cotEnabled: boolean;
  createdBy: string;
  createdAt: string;
}

export type CallOutcome = "Interested" | "Send Media Kit" | "Callback" | "Declined" | "Not Right Person";

export interface CallLog {
  id: string;
  leadId: string;
  outcome: CallOutcome;
  notes: string;
  timestamp: string;
  duration?: number;
  ownerId: string;
}

export interface UserInteraction {
  id: string;
  userId: string;
  type: 'tab_switch' | 'context_switch';
  value: string;
  timestamp: any;
  metadata?: any;
}

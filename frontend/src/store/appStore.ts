import { create } from 'zustand';

export type AIState = 'idle' | 'listening' | 'thinking' | 'responding' | 'excited' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  finding?: 'critical' | 'warning' | 'ok';
  citations?: string[];
}

export interface ComplianceSection {
  id: string;
  title: string;
  status: 'pending' | 'compliant' | 'gap' | 'critical';
  score: number;
}

export interface ChatSession {
  id: string;
  label: string;          // one-word summary e.g. "Consent"
  severity: 'critical' | 'warning' | 'ok' | 'pending';
  createdAt: number;
  messageCount: number;
}

export interface RecentReport {
  id: string;
  title: string;
  score: number;
  date: string;
  severity: 'critical' | 'warning' | 'ok';
}

interface AppStore {
  aiState: AIState;
  setAIState: (s: AIState) => void;

  phase: 'landing' | 'interview' | 'report';
  setPhase: (p: 'landing' | 'interview' | 'report') => void;

  messages: Message[];
  addMessage: (m: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  sections: ComplianceSection[];
  overallScore: number;
  setOverallScore: (score: number) => void;
  updateSection: (id: string, data: Partial<ComplianceSection>) => void;

  isTyping: boolean;
  setIsTyping: (v: boolean) => void;

  energyLevel: number;
  setEnergyLevel: (v: number) => void;

  // Session history
  chatSessions: ChatSession[];
  addChatSession: (label: string, severity: ChatSession['severity']) => void;
  updateChatSession: (id: string, data: Partial<ChatSession>) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  sessionsHistory: Record<string, Message[]>;

  recentReports: RecentReport[];
  resetAudit: () => void;
}

const INITIAL_SECTIONS: ComplianceSection[] = [
  { id: 's6',  title: 'S.6 — Consent',          status: 'pending', score: 0 },
  { id: 's7',  title: 'S.7 — Notice',            status: 'pending', score: 0 },
  { id: 's8',  title: 'S.8 — Processing Data',  status: 'pending', score: 0 },
  { id: 's9',  title: 'S.9 — Special Data',     status: 'pending', score: 0 },
  { id: 's11', title: 'S.11 — Data Correction', status: 'pending', score: 0 },
  { id: 's12', title: 'S.12 — Grievance',       status: 'pending', score: 0 },
  { id: 's16', title: 'S.16 — Cross-Border',    status: 'pending', score: 0 },
  { id: 's17', title: 'S.17 — Exemptions',      status: 'pending', score: 0 },
];

const DEMO_SESSIONS: ChatSession[] = [
  { id: 'demo-1', label: 'Consent',   severity: 'critical', createdAt: Date.now() - 86400000 * 2, messageCount: 5 },
  { id: 'demo-2', label: 'Analytics', severity: 'warning',  createdAt: Date.now() - 86400000 * 5, messageCount: 3 },
  { id: 'demo-3', label: 'Storage',   severity: 'ok',       createdAt: Date.now() - 86400000 * 9, messageCount: 3 },
];

const DEMO_HISTORY: Record<string, Message[]> = {
  'demo-1': [
    { id: 'm1', role: 'ai', content: 'Let\'s evaluate your consent mechanism under S.6 of DPDPA 2023. Do you collect user consent before processing personal data?', timestamp: Date.now() - 86400000 * 2 },
    { id: 'm2', role: 'user', content: 'Yes, we have a cookie banner and a checkbox on signup.', timestamp: Date.now() - 86400000 * 2 + 1000 },
    { id: 'm3', role: 'ai', content: 'Is the signup checkbox pre-ticked by default?', timestamp: Date.now() - 86400000 * 2 + 2000 },
    { id: 'm4', role: 'user', content: 'Yes, it is pre-ticked to make signup faster.', timestamp: Date.now() - 86400000 * 2 + 3000 },
    { id: 'm5', role: 'ai', content: 'Under DPDPA 2023, consent must be free, specific, and unconditional. Pre-ticked boxes are non-compliant.', timestamp: Date.now() - 86400000 * 2 + 4000 }
  ],
  'demo-2': [
    { id: 'm6', role: 'ai', content: 'Under S.16, cross-border data transfer is restricted. Where do you host analytics data?', timestamp: Date.now() - 86400000 * 5 },
    { id: 'm7', role: 'user', content: 'We run Amplitude and segment through US endpoints.', timestamp: Date.now() - 86400000 * 5 + 1000 },
    { id: 'm8', role: 'ai', content: 'Flagged: Analytics data is routed out of India without necessary local processing safeguards. Corrective action registered.', timestamp: Date.now() - 86400000 * 5 + 2000 }
  ],
  'demo-3': [
    { id: 'm9', role: 'ai', content: 'Do you encrypt user personal data at rest?', timestamp: Date.now() - 86400000 * 9 },
    { id: 'm10', role: 'user', content: 'Yes, we use AWS KMS for block storage volume encryption.', timestamp: Date.now() - 86400000 * 9 + 1000 },
    { id: 'm11', role: 'ai', content: 'Excellent, compliance verified for S.8(5) Security Safeguards.', timestamp: Date.now() - 86400000 * 9 + 2000 }
  ]
};

const DEMO_REPORTS: RecentReport[] = [
  { id: 'r1', title: 'Q2 2025 Audit',  score: 42, date: 'Jun 15',  severity: 'critical' },
  { id: 'r2', title: 'Q1 2025 Audit',  score: 61, date: 'Mar 10',  severity: 'warning'  },
  { id: 'r3', title: 'Initial Scan',   score: 28, date: 'Jan 4',   severity: 'critical' },
];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useAppStore = create<AppStore>((set) => ({
  aiState: 'idle',
  setAIState: (s) => set({ aiState: s }),

  phase: 'landing',
  setPhase: (p) => set({ phase: p }),

  messages: [],
  sessionsHistory: DEMO_HISTORY,
  addMessage: (m) =>
    set((state) => {
      const newMsg: Message = { ...m, id: generateUUID(), timestamp: Date.now() };
      const activeId = state.activeSessionId || 'demo-1';
      const currentHistory = state.sessionsHistory[activeId] || [];
      const updatedHistory = [...currentHistory, newMsg];

      // Update messageCount in the corresponding chat session
      const updatedSessions = state.chatSessions.map((s) =>
        s.id === activeId ? { ...s, messageCount: updatedHistory.length } : s
      );

      return {
        messages: updatedHistory,
        sessionsHistory: {
          ...state.sessionsHistory,
          [activeId]: updatedHistory
        },
        chatSessions: updatedSessions
      };
    }),
  clearMessages: () =>
    set((state) => {
      const activeId = state.activeSessionId || 'demo-1';
      return {
        messages: [],
        sessionsHistory: {
          ...state.sessionsHistory,
          [activeId]: []
        }
      };
    }),

  sections: INITIAL_SECTIONS,
  overallScore: 0,
  setOverallScore: (score) => {
    console.log("Store: setOverallScore called with score:", score);
    set({ overallScore: score });
  },
  updateSection: (id, data) =>
    set((state) => {
      const sections = state.sections.map((s) => s.id === id ? { ...s, ...data } : s);
      const scored = sections.filter((s) => s.status !== 'pending');
      const overallScore = scored.length
        ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length)
        : 0;
      console.log(`Store: updateSection called for ${id}. Calculated overallScore:`, overallScore);
      return { sections, overallScore };
    }),

  isTyping: false,
  setIsTyping: (v) => set({ isTyping: v }),

  energyLevel: 0.3,
  setEnergyLevel: (v) => set({ energyLevel: v }),

  chatSessions: DEMO_SESSIONS,
  activeSessionId: 'demo-1',
  setActiveSessionId: (id) =>
    set((state) => {
      const sessionMsgs = id ? (state.sessionsHistory[id] || []) : [];
      return {
        activeSessionId: id,
        messages: sessionMsgs
      };
    }),
  addChatSession: (label, severity) =>
    set((state) => {
      const id = generateUUID();
      const session: ChatSession = {
        id,
        label,
        severity,
        createdAt: Date.now(),
        messageCount: 0,
      };
      return {
        chatSessions: [session, ...state.chatSessions].slice(0, 10),
        activeSessionId: id,
        messages: [],
        sessionsHistory: {
          ...state.sessionsHistory,
          [id]: []
        }
      };
    }),
  updateChatSession: (id, data) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((s) => s.id === id ? { ...s, ...data } : s)
    })),
  resetAudit: () =>
    set({
      sections: INITIAL_SECTIONS,
      overallScore: 0
    }),

  recentReports: DEMO_REPORTS,
}));

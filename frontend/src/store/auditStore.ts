import { create } from "zustand";

type AuditSummary = {
  id: string;
  name: string;
  status: "queued" | "running" | "review" | "completed";
};

type AuditState = {
  audits: AuditSummary[];
};

export const useAuditStore = create<AuditState>(() => ({
  audits: [
    { id: "audit-001", name: "Sample Vendor Assessment", status: "running" },
    { id: "audit-002", name: "Privacy Notice Review", status: "review" }
  ]
}));

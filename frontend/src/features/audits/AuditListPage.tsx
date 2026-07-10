import { SectionCard } from "../../components/ui/SectionCard";
import { useAuditStore } from "../../store/auditStore";

export function AuditListPage() {
  const audits = useAuditStore((state) => state.audits);

  return (
    <SectionCard
      title="Audits"
      description="Submission, tracking, and drill-down for compliance audits."
    >
      <div className="space-y-3">
        {audits.map((audit) => (
          <div
            key={audit.id}
            className="rounded-xl border border-ink/10 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <strong>{audit.name}</strong>
              <span className="text-sm text-ink/60">{audit.status}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

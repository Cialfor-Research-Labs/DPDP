import { SectionCard } from "../../components/ui/SectionCard";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.25em] text-signal">
          Operations
        </p>
        <h2 className="mt-2 text-4xl font-semibold">Audit control center</h2>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title="Active audits"
          description="Tenant-scoped audit runs orchestrated through the backend."
        >
          <p className="text-sm text-ink/80">
            Hook this to FastAPI + Temporal status feeds.
          </p>
        </SectionCard>
        <SectionCard
          title="Human review queue"
          description="Escalations for ambiguous or high-risk obligations."
        >
          <p className="text-sm text-ink/80">
            Reviewer decisions should be persisted with audit history.
          </p>
        </SectionCard>
        <SectionCard
          title="Reports"
          description="Generated outputs backed by citations and scoring."
        >
          <p className="text-sm text-ink/80">
            Connect this to report generation and download endpoints.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

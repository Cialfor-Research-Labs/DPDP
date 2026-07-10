import { SectionCard } from "../../components/ui/SectionCard";

export function ReportPage() {
  return (
    <SectionCard
      title="Reports"
      description="Rendered audit outputs and supporting evidence bundles."
    >
      <p className="text-sm text-ink/80">
        Connect this page to generated DOCX/PDF artifacts from the reporting
        pipeline.
      </p>
    </SectionCard>
  );
}

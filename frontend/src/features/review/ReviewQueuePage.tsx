import { SectionCard } from "../../components/ui/SectionCard";

export function ReviewQueuePage() {
  return (
    <SectionCard
      title="Review Queue"
      description="Manual review surface for escalated obligations and overrides."
    >
      <p className="text-sm text-ink/80">
        This module should consume reviewer work items from the backend and
        capture structured override reasons.
      </p>
    </SectionCard>
  );
}

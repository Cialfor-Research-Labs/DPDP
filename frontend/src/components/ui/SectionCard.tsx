import type { PropsWithChildren } from "react";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function SectionCard({
  title,
  description,
  children
}: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-ink/70">{description}</p>
      </div>
      {children}
    </section>
  );
}

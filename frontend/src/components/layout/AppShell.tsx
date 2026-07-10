import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/audits", label: "Audits" },
  { to: "/review", label: "Review Queue" },
  { to: "/reports", label: "Reports" }
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-clay text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="w-72 border-r border-ink/10 bg-white/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-signal">
            DPDPA Engine
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Compliance Console</h1>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "block rounded-xl px-4 py-3 text-sm transition",
                    isActive ? "bg-ink text-white" : "bg-white text-ink hover:bg-mist"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

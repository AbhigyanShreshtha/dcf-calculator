import { BarChart3, Database, FolderKanban, GitCompareArrows, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/valuations/new", label: "New Valuation", icon: Sparkles },
  { to: "/models", label: "Saved Models", icon: Database },
  { to: "/compare", label: "Compare Scenarios", icon: GitCompareArrows },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">DCF Studio</p>
                <h1 className="font-serif text-2xl font-semibold">Transparent valuation without spreadsheets</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center rounded-full border border-border/70 px-4 py-2 text-sm font-medium transition hover:bg-muted",
                        isActive && "bg-card text-primary shadow-sm",
                      )
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}

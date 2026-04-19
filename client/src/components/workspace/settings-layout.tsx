import type { ReactNode } from "react";
import { WorkspaceShell } from "./workspace-shell";
import { SettingsSubnav } from "./settings-subnav";

interface SettingsLayoutProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

export function SettingsLayout({ title, eyebrow = "Workspace / Settings", children }: SettingsLayoutProps) {
  return (
    <WorkspaceShell title={title} eyebrow={eyebrow}>
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsSubnav />
        <div className="min-w-0">{children}</div>
      </div>
    </WorkspaceShell>
  );
}

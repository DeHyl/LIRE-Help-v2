import { Workflow } from "lucide-react";
import { WorkspaceShell } from "../components/workspace/workspace-shell";
import { Card, CardHeader, Eyebrow } from "../components/ui";

export default function SettingsWorkflowsPage() {
  return (
    <WorkspaceShell
      title="Workflows"
      eyebrow="Settings / Workflows"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Workflow className="h-5 w-5" />
            </span>
            <CardHeader
              eyebrow="Workflow rules"
              title="Automation is coming in a later cycle"
            />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            SLA policy rules, macros, and escalation automations will live here. For now, conversations route through inbox
            defaults and SLA state derives from the first-response / next-response / resolution timestamps written by the
            helpdesk service. When this surface ships, it will read from and write to the same help_slas and help_inboxes
            tables we already use — no parallel ticketing domain.
          </p>
        </Card>

        <Card variant="dashed" padding="lg" as="aside">
          <Eyebrow>Placeholder on purpose</Eyebrow>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            The sidebar links to /settings/workflows so operators who expect a workflow-rule surface don't hit a 404.
            Persisted rules and a rule builder follow once dogfooding proves the underlying primitives.
          </p>
        </Card>
      </div>
    </WorkspaceShell>
  );
}

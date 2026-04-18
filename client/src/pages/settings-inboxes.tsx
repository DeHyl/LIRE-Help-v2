import { Inbox as InboxIcon } from "lucide-react";
import { WorkspaceShell } from "../components/workspace/workspace-shell";
import { Card, CardHeader, Eyebrow } from "../components/ui";

export default function SettingsInboxesPage() {
  return (
    <WorkspaceShell
      title="Inboxes"
      eyebrow="Settings / Inboxes"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <InboxIcon className="h-5 w-5" />
            </span>
            <CardHeader
              eyebrow="Inbox settings"
              title="Queue definitions and team routing"
            />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            This is the home for creating, renaming, and routing team inboxes (Support, Escalations, Billing, VIP, or custom).
            In the current phase, inbox definitions come from the helpdesk seed and are visible on the left inbox sidebar.
            Creation and edit UI lands in the next tranche; the route exists now so the workspace information architecture
            stays stable while downstream features are wired in.
          </p>
        </Card>

        <Card variant="dashed" padding="lg" as="aside">
          <Eyebrow>Why this route exists now</Eyebrow>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Operators land on /settings/inboxes when they click the inbox configuration entry in the sidebar.
            Shipping the route early prevents dead-end clicks during dogfooding; the detailed admin UI fills in later.
          </p>
        </Card>
      </div>
    </WorkspaceShell>
  );
}

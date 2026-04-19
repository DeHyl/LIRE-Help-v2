import { Construction, type LucideIcon } from "lucide-react";
import { SettingsLayout } from "../components/workspace/settings-layout";
import { Card } from "../components/ui";

export interface SettingsPlaceholderProps {
  title: string;
  eyebrow?: string;
  description: string;
  icon?: LucideIcon;
}

export default function SettingsPlaceholderPage({
  title,
  eyebrow = "Workspace / Settings",
  description,
  icon: Icon = Construction,
}: SettingsPlaceholderProps) {
  return (
    <SettingsLayout title={title} eyebrow={eyebrow}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="md">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xs bg-surface-2 text-fg-muted">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="eyebrow">{title}</div>
              <div className="mt-0.5 font-display text-[18px] font-semibold tracking-tight text-fg">
                Configuration surface coming online
              </div>
            </div>
          </div>
          <p className="mt-4 font-body text-[13px] leading-[1.55] text-fg-muted">{description}</p>
        </Card>

        <Card variant="dashed" padding="md" as="aside">
          <div className="eyebrow">Why this route exists now</div>
          <p className="mt-2 font-body text-[13px] leading-[1.55] text-fg-muted">
            The settings information architecture is pinned before forms and persistence ship, so
            operators never hit a dead-end link during dogfooding. The detailed admin UI fills in
            later.
          </p>
        </Card>
      </div>
    </SettingsLayout>
  );
}

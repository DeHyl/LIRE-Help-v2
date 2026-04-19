import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

type SubnavItem = {
  label: string;
  href: string;
  exact?: boolean;
};

const sections: readonly SubnavItem[] = [
  { label: "Home", href: "/settings", exact: true },
  { label: "Workspace", href: "/settings/workspace" },
  { label: "Subscription", href: "/settings/subscription" },
  { label: "Channels", href: "/settings/channels" },
  { label: "Inbox", href: "/settings/inboxes" },
  { label: "AI & Automation", href: "/settings/ai-automation" },
  { label: "Integrations", href: "/settings/integrations" },
  { label: "Data", href: "/settings/data" },
  { label: "Help Center", href: "/settings/help-center" },
  { label: "Outbound", href: "/settings/outbound" },
  { label: "Personal", href: "/settings/personal" },
];

function isActive(pathname: string, item: SubnavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SettingsSubnav() {
  const [location] = useLocation();

  return (
    <nav aria-label="Settings sections" className="self-start">
      <div className="eyebrow px-2.5 pb-1.5 text-fg-subtle">Settings</div>
      <div className="space-y-0.5">
        {sections.map((item) => {
          const active = isActive(location, item);
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={[
                  "flex items-center gap-2 rounded-sm px-2.5 py-2 font-body text-[13px] font-medium transition-colors ease-ds duration-fast",
                  active
                    ? "bg-fg text-surface"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                ].join(" ")}
              >
                <span className="flex-1 truncate">{item.label}</span>
                <ChevronRight
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    active ? "text-accent" : "text-fg-subtle",
                  ].join(" ")}
                />
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

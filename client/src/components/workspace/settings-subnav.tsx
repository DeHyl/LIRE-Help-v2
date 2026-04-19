import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

type SubnavChild = {
  label: string;
  href: string;
};

type SubnavSection = {
  label: string;
  href: string;
  exact?: boolean;
  children?: readonly SubnavChild[];
};

const sections: readonly SubnavSection[] = [
  { label: "Home", href: "/settings", exact: true },
  {
    label: "Workspace",
    href: "/settings/workspace",
    children: [
      { label: "General", href: "/settings/workspace/general" },
      { label: "Teammates", href: "/settings/workspace/teammates" },
      { label: "Office hours", href: "/settings/workspace/office-hours" },
      { label: "Brands", href: "/settings/workspace/brands" },
      { label: "Security", href: "/settings/workspace/security" },
      { label: "Multilingual", href: "/settings/workspace/multilingual" },
    ],
  },
  {
    label: "Subscription",
    href: "/settings/subscription",
    children: [
      { label: "Billing", href: "/settings/subscription/billing" },
      { label: "Usage", href: "/settings/subscription/usage" },
    ],
  },
  {
    label: "Channels",
    href: "/settings/channels",
    children: [
      { label: "Messenger", href: "/settings/channels/messenger" },
      { label: "Email", href: "/settings/channels/email" },
      { label: "Phone", href: "/settings/channels/phone" },
      { label: "WhatsApp", href: "/settings/channels/whatsapp" },
      { label: "Switch", href: "/settings/channels/switch" },
      { label: "Slack", href: "/settings/channels/slack" },
    ],
  },
  { label: "Inbox", href: "/settings/inboxes" },
  { label: "AI & Automation", href: "/settings/ai-automation" },
  { label: "Integrations", href: "/settings/integrations" },
  { label: "Data", href: "/settings/data" },
  { label: "Help Center", href: "/settings/help-center" },
  { label: "Outbound", href: "/settings/outbound" },
  { label: "Personal", href: "/settings/personal" },
];

function isHrefActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionContainsLocation(pathname: string, section: SubnavSection) {
  if (isHrefActive(pathname, section.href, section.exact)) return true;
  return section.children?.some((c) => isHrefActive(pathname, c.href)) ?? false;
}

export function SettingsSubnav() {
  const [location] = useLocation();
  // Track which expandable groups the user has manually toggled. Groups
  // that contain the active route are always shown expanded regardless.
  const [manuallyOpen, setManuallyOpen] = useState<Record<string, boolean>>({});

  // Reset manual overrides on route change so expanded state tracks the URL.
  useEffect(() => {
    setManuallyOpen({});
  }, [location]);

  return (
    <nav aria-label="Settings sections" className="self-start">
      <div className="eyebrow px-2.5 pb-1.5 text-fg-subtle">Settings</div>
      <div className="space-y-0.5">
        {sections.map((section) => {
          const hasChildren = !!section.children?.length;
          const containsActive = sectionContainsLocation(location, section);
          const expanded = hasChildren
            ? (manuallyOpen[section.href] ?? containsActive)
            : false;
          const parentActive = isHrefActive(location, section.href, section.exact);

          return (
            <div key={section.href}>
              <div className="relative">
                <Link href={section.href}>
                  <a
                    className={[
                      "flex items-center gap-2 rounded-sm py-2 pl-2.5 font-body text-[13px] font-medium transition-colors ease-ds duration-fast",
                      hasChildren ? "pr-8" : "pr-2.5",
                      parentActive
                        ? "bg-fg text-surface"
                        : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                    ].join(" ")}
                  >
                    <span className="flex-1 truncate">{section.label}</span>
                    {!hasChildren ? (
                      <ChevronRight
                        className={[
                          "h-3.5 w-3.5 shrink-0",
                          parentActive ? "text-accent" : "text-fg-subtle",
                        ].join(" ")}
                      />
                    ) : null}
                  </a>
                </Link>
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={expanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
                    aria-expanded={expanded}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setManuallyOpen((state) => ({
                        ...state,
                        [section.href]: !expanded,
                      }));
                    }}
                    className={[
                      "absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-xs transition-colors ease-ds duration-fast",
                      parentActive
                        ? "text-surface hover:bg-fg-muted"
                        : "text-fg-subtle hover:bg-surface-2 hover:text-fg",
                    ].join(" ")}
                  >
                    <ChevronRight
                      className={[
                        "h-3.5 w-3.5 transition-transform ease-ds duration-fast",
                        expanded ? "rotate-90" : "",
                      ].join(" ")}
                    />
                  </button>
                ) : null}
              </div>

              {hasChildren && expanded ? (
                <div className="ml-2.5 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {section.children!.map((child) => {
                    const childActive = isHrefActive(location, child.href);
                    return (
                      <Link key={child.href} href={child.href}>
                        <a
                          className={[
                            "flex items-center rounded-sm px-2.5 py-1.5 font-body text-[12.5px] transition-colors ease-ds duration-fast",
                            childActive
                              ? "bg-surface-2 font-medium text-fg"
                              : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                          ].join(" ")}
                        >
                          <span className="truncate">{child.label}</span>
                        </a>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WorkspaceShell } from "./workspace-shell";
import { SettingsSubnav } from "./settings-subnav";

interface SettingsLayoutProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

const SUBNAV_WIDTH_KEY = "settings:subnav-width";
const SUBNAV_MIN = 180;
const SUBNAV_MAX = 360;
const SUBNAV_DEFAULT = 220;

function readStoredWidth(): number {
  if (typeof window === "undefined") return SUBNAV_DEFAULT;
  try {
    const raw = window.localStorage.getItem(SUBNAV_WIDTH_KEY);
    const parsed = raw == null ? NaN : Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return SUBNAV_DEFAULT;
    return Math.min(SUBNAV_MAX, Math.max(SUBNAV_MIN, parsed));
  } catch {
    return SUBNAV_DEFAULT;
  }
}

export function SettingsLayout({ title, eyebrow = "Workspace / Settings", children }: SettingsLayoutProps) {
  const [width, setWidth] = useState<number>(() => readStoredWidth());
  const dragStateRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SUBNAV_WIDTH_KEY, String(width));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [width]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: width,
      };
    },
    [width],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    const next = Math.min(SUBNAV_MAX, Math.max(SUBNAV_MIN, state.startWidth + delta));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    setWidth(SUBNAV_DEFAULT);
  }, []);

  return (
    <WorkspaceShell title={title} eyebrow={eyebrow}>
      <div
        className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-0"
        style={{ "--subnav-width": `${width}px` } as CSSProperties}
      >
        <div className="relative shrink-0 lg:w-[var(--subnav-width)] lg:pr-5">
          <SettingsSubnav />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize settings navigation"
            aria-valuemin={SUBNAV_MIN}
            aria-valuemax={SUBNAV_MAX}
            aria-valuenow={width}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setWidth((value) => Math.max(SUBNAV_MIN, value - 8));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setWidth((value) => Math.min(SUBNAV_MAX, value + 8));
              }
            }}
            title="Drag to resize · double-click to reset"
            className="absolute right-0 top-0 hidden h-full w-1.5 cursor-col-resize touch-none select-none bg-transparent transition-colors ease-ds duration-fast hover:bg-border-strong focus-visible:bg-accent focus-visible:outline-none lg:block"
          />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </WorkspaceShell>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone =
  | "neutral"
  | "slate"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "orange"
  | "inverted";

type BadgeSize = "sm" | "md";
type BadgeShape = "pill" | "tag";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  shape?: BadgeShape;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  slate: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
  inverted: "bg-white/10 text-slate-100",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

const shapes: Record<BadgeShape, string> = {
  pill: "rounded-full",
  tag: "rounded-md",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  shape = "pill",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-semibold", tones[tone], sizes[size], shapes[shape], className)}
      {...rest}
    >
      {children}
    </span>
  );
}

// LIRE Help — Shared primitives. Follows DeHyl design system.
// Tokens consumed via CSS vars from colors_and_type.css.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Status dot ----------
function StatusDot({ tone = "neutral", size = 8 }) {
  const colors = {
    neutral: "var(--fg-subtle)",
    success: "var(--success)",
    warning: "var(--warning)",
    error:   "var(--error)",
    accent:  "var(--accent)",
    active:  "var(--fg)",
  };
  return <span style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    background: colors[tone] || tone, flexShrink: 0,
  }}/>;
}

// ---------- Chip (square status pill) ----------
function Chip({ tone = "neutral", children, dot = true, size = "md" }) {
  const p = {
    neutral: { bg: "var(--surface-2)", fg: "var(--fg)",       dotC: "neutral" },
    muted:   { bg: "transparent",       fg: "var(--fg-muted)", dotC: "neutral", border: true },
    success: { bg: "rgba(0,135,90,0.10)",  fg: "var(--success)", dotC: "success" },
    warning: { bg: "rgba(245,158,11,0.14)", fg: "#8A5A07",       dotC: "warning" },
    error:   { bg: "rgba(220,38,38,0.10)",  fg: "var(--error)",   dotC: "error" },
    accent:  { bg: "rgba(255,77,0,0.12)",   fg: "var(--accent-press)", dotC: "accent" },
    active:  { bg: "var(--fg)",             fg: "#FAFAFA",        dotC: "accent" },
    ai:      { bg: "rgba(17,17,17,0.06)",   fg: "var(--fg)",      dotC: "active" },
  }[tone] || { bg: "var(--surface-2)", fg: "var(--fg)", dotC: "neutral" };
  const pad = size === "sm" ? "2px 6px" : "4px 8px";
  const fs  = size === "sm" ? 10 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--font-body)", fontWeight: 600, fontSize: fs,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: pad, borderRadius: 2,
      background: p.bg, color: p.fg,
      border: p.border ? "1px solid var(--border)" : "none",
      whiteSpace: "nowrap", lineHeight: 1,
    }}>
      {dot && <StatusDot tone={p.dotC} size={6}/>}
      {children}
    </span>
  );
}

// ---------- Button ----------
function Btn({ variant = "secondary", size = "md", children, icon, iconRight, onClick, disabled, active, style, title }) {
  const [hov, setHov] = useState(false);
  const [prs, setPrs] = useState(false);
  const sizes = {
    xs: { height: 24, padding: "0 8px",  fontSize: 11 },
    sm: { height: 28, padding: "0 10px", fontSize: 12 },
    md: { height: 34, padding: "0 12px", fontSize: 13 },
    lg: { height: 40, padding: "0 16px", fontSize: 13 },
    icon:{ height: 28, width: 28, padding: 0, fontSize: 12 },
  };
  const variants = {
    primary:     { bg: "var(--accent)",    fg: "#fff",         bd: "var(--accent)"  },
    dark:        { bg: "var(--fg)",        fg: "#FAFAFA",      bd: "var(--fg)"      },
    secondary:   { bg: "var(--surface)",   fg: "var(--fg)",    bd: "var(--border)"  },
    ghost:       { bg: "transparent",      fg: "var(--fg)",    bd: "transparent"    },
    subtle:      { bg: "var(--surface-2)", fg: "var(--fg)",    bd: "transparent"    },
    destructive: { bg: "var(--error)",     fg: "#fff",         bd: "var(--error)"   },
  };
  const v = variants[variant];
  const hover = {
    primary:     { bg: "var(--accent-hover)", bd: "var(--accent-hover)" },
    dark:        { bg: "#000" },
    secondary:   { bg: "var(--surface-2)" },
    ghost:       { bg: "var(--surface-2)" },
    subtle:      { bg: "var(--border)" },
    destructive: { bg: "#B91C1C", bd: "#B91C1C" },
  }[variant];
  const isPressing = prs && !disabled;
  const base = {
    fontFamily: "var(--font-body)", fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 4, transition: "all 120ms var(--ease)",
    opacity: disabled ? 0.4 : (isPressing ? 0.85 : 1),
    whiteSpace: "nowrap", outline: "none",
    background: (hov && !disabled) ? hover.bg : v.bg,
    color: v.fg,
    border: `1px solid ${(hov && !disabled) ? (hover.bd || v.bd) : v.bd}`,
    ...(active ? { background: "var(--fg)", color: "#FAFAFA", borderColor: "var(--fg)" } : {}),
  };
  return (
    <button title={title} onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPrs(false); }}
      onMouseDown={() => setPrs(true)} onMouseUp={() => setPrs(false)}
      style={{ ...base, ...sizes[size], ...style }}>
      {icon}{children}{iconRight}
    </button>
  );
}

// ---------- Icons (inline Lucide) ----------
const Icon = {};
const mk = (paths) => ({ size = 16, color = "currentColor", strokeWidth = 1.75, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
       style={{ flexShrink: 0, ...style }} dangerouslySetInnerHTML={{ __html: paths }}/>
);
Icon.Inbox        = mk('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>');
Icon.Building     = mk('<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>');
Icon.Warehouse    = mk('<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>');
Icon.Wrench       = mk('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>');
Icon.Hammer       = mk('<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>');
Icon.Calendar     = mk('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>');
Icon.Gauge        = mk('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>');
Icon.Shield       = mk('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>');
Icon.AlertTri     = mk('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>');
Icon.Check        = mk('<path d="M20 6 9 17l-5-5"/>');
Icon.Sparkles     = mk('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>');
Icon.Search       = mk('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>');
Icon.Plus         = mk('<path d="M5 12h14"/><path d="M12 5v14"/>');
Icon.ChevronRight = mk('<path d="m9 18 6-6-6-6"/>');
Icon.ChevronDown  = mk('<path d="m6 9 6 6 6-6"/>');
Icon.ArrowRight   = mk('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>');
Icon.ArrowUpRight = mk('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');
Icon.MoreH        = mk('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>');
Icon.Bell         = mk('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>');
Icon.Filter       = mk('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>');
Icon.Download     = mk('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>');
Icon.MapPin       = mk('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>');
Icon.Users        = mk('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>');
Icon.Home         = mk('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>');
Icon.Layers       = mk('<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.48 1.58a1 1 0 0 0 0 1.82l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.46-1.58"/>');
Icon.Settings     = mk('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2"/><circle cx="12" cy="12" r="3"/>');
Icon.Paperclip    = mk('<path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657L4.828 11.712a6 6 0 1 0 8.486 8.486l7.5-7.5"/>');
Icon.Send         = mk('<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>');
Icon.CircleUser   = mk('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>');
Icon.Clock        = mk('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
Icon.Moon         = mk('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>');
Icon.Sun          = mk('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5 19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5 19 5"/>');
Icon.Command      = mk('<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>');
Icon.Thermo       = mk('<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>');
Icon.Flame        = mk('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>');
Icon.Droplet      = mk('<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>');
Icon.Zap          = mk('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>');
Icon.X            = mk('<path d="M18 6 6 18M6 6l12 12"/>');
Icon.FileText     = mk('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>');
Icon.Phone        = mk('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>');
Icon.Msg          = mk('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
Icon.MsgSquare    = mk('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
Icon.Mail         = mk('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>');
Icon.Doc          = mk('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/>');
Icon.ExternalLink = mk('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>');
Icon.Menu         = mk('<path d="M4 12h16M4 6h16M4 18h16"/>');
Icon.Reply        = mk('<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>');
Icon.Tag          = mk('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>');
Icon.Snow         = mk('<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>');
Icon.Video        = mk('<path d="M16 6h-6a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-8a4 4 0 0 0-4-4Z"/><path d="m22 8-6 4 6 4Z"/>');
Icon.Hash         = mk('<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>');
Icon.PanelLeft    = mk('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>');
Icon.PanelRight   = mk('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>');
Icon.Maximize     = mk('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>');
Icon.Plug         = mk('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8Z"/>');
Icon.Flag         = mk('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>');
Icon.User         = mk('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>');
Icon.Upload       = mk('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>');
Icon.Bot          = mk('<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>');
Icon.Lock         = mk('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>');
Icon.Lightbulb    = mk('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>');

// ---------- Input ----------
function Input({ mono = false, error = false, value, onChange, placeholder, icon, style, onKeyDown, autoFocus, ...rest }) {
  const [focus, setFocus] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  const border = error ? "var(--error)" : (focus ? "var(--accent)" : "var(--border)");
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface)",
      border: `1px solid ${border}`, borderRadius: 4, height: 32, padding: "0 10px",
      transition: "all 120ms var(--ease)", ...style,
    }}>
      {icon}
      <input ref={ref}
        value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          border: 0, outline: "none", flex: 1, background: "transparent",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: 13, color: "var(--fg)",
          fontVariantNumeric: mono ? "tabular-nums" : "normal", minWidth: 0,
        }}
        {...rest}
      />
    </div>
  );
}

// ---------- Eyebrow ----------
function Eyebrow({ children, color = "var(--fg-muted)", style }) {
  return <div style={{
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11,
    letterSpacing: "0.08em", textTransform: "uppercase", color, ...style,
  }}>{children}</div>;
}

// ---------- Num ----------
function Num({ children, size = 13, weight = 400, color = "var(--fg)", style }) {
  return <span style={{
    fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
    fontSize: size, fontWeight: weight,
    letterSpacing: size >= 22 ? "-0.02em" : "0",
    color, ...style,
  }}>{children}</span>;
}

// ---------- Kbd ----------
function Kbd({ children }) {
  return <span style={{
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
    padding: "2px 5px", borderRadius: 3, background: "var(--surface-2)",
    border: "1px solid var(--border)", color: "var(--fg-muted)", lineHeight: 1,
  }}>{children}</span>;
}

// ---------- Select (simple styled) ----------
function Select({ value, onChange, children, style, disabled }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", ...style }}>
      <select value={value} onChange={onChange} disabled={disabled} style={{
        appearance: "none", WebkitAppearance: "none",
        fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 4, height: 32, padding: "0 28px 0 10px", width: "100%",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        outline: "none",
      }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--fg-muted)" }}>
        <Icon.ChevronDown size={14}/>
      </span>
    </div>
  );
}

Object.assign(window, { StatusDot, Chip, Btn, Icon, Input, Eyebrow, Num, Kbd, Select });

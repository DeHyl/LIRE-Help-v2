// LIRE Help — Dashboard, Properties, Compliance screens

const { useState: useStateD } = React;

function Stat({ label, value, unit, tone = "default", footnote }) {
  const valueColor = tone === "warning" ? "var(--warning)"
    : tone === "error" ? "var(--error)"
    : tone === "accent" ? "var(--accent)"
    : "var(--fg)";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "14px 16px" }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
        <Num size={28} weight={500} color={valueColor} style={{ letterSpacing: "-0.02em" }}>{value}</Num>
        {unit && <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>{unit}</span>}
      </div>
      {footnote && <div style={{ marginTop: 4, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>{footnote}</div>}
    </div>
  );
}

function DashboardScreen({ onNav, onOpenTicket }) {
  const k = LIRE_DATA.kpis;
  const actions = LIRE_DATA.recentActions;
  const tickets = LIRE_DATA.tickets.filter(t => ["priority"].some(v => t.views.includes(v))).slice(0, 4);
  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Portfolio · 17 April, 03:14 AM</Eyebrow>
          <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1.05 }}>
            Overnight was clean.
          </h1>
          <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fg-muted)", maxWidth: 680 }}>
            9 after-hours tickets handled. 1 dispatch live at ATL-02 · Dock 4. No SLAs breached.
          </div>
        </div>
        <Btn variant="dark" icon={<Icon.Sparkles size={13}/>} onClick={() => onNav("inbox")}>Open live queue</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Open work"        value={k.openWork}        footnote="across 6 properties"/>
        <Stat label="SLA breached"     value={k.slaBreached}     tone={k.slaBreached ? "error" : "default"} footnote="last 24h"/>
        <Stat label="SLA at risk"      value={k.slaAtRisk}       tone={k.slaAtRisk ? "warning" : "default"} footnote="needs human eyes"/>
        <Stat label="Resolved today"   value={k.resolvedToday}   footnote={`${k.autoResolvedPct}% autonomously`}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16 }}>
        {/* Left: Priority now */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Eyebrow>Priority now</Eyebrow>
              <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.01em" }}>
                Work the system can't resolve alone
              </div>
            </div>
            <Btn size="sm" variant="ghost" iconRight={<Icon.ArrowRight size={13}/>} onClick={() => onNav("inbox")}>Open inbox</Btn>
          </div>
          <div>
            {tickets.map(t => {
              const prop = LIRE_DATA.properties.find(p => p.id === t.property);
              const slaBad = t.sla.state !== "healthy";
              return (
                <button key={t.id} onClick={() => { onOpenTicket(t.id); onNav("inbox"); }}
                  style={{
                    width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid var(--border)",
                    background: "var(--surface)", padding: "12px 16px", cursor: "pointer",
                    display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 12, alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
                >
                  <Num size={11} color="var(--fg-subtle)">{prop?.code}</Num>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.subject}
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <Chip tone={t.priority === "urgent" ? "error" : t.priority === "high" ? "warning" : "muted"} size="sm">
                        {t.priority.toUpperCase()}
                      </Chip>
                      {slaBad && <Chip tone="warning" size="sm">{t.sla.label}</Chip>}
                      <Num size={10} color="var(--fg-subtle)">{t.lastActivity}</Num>
                    </div>
                  </div>
                  <Icon.ChevronRight size={14} color="var(--fg-subtle)"/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Autonomous actions feed */}
        <div style={{ background: "var(--fg)", color: "#FAFAFA", borderRadius: 4, padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.Sparkles size={14} color="var(--accent)"/>
              <Eyebrow style={{ color: "#FAFAFA" }}>AI Concierge · last 24h</Eyebrow>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 16 }}>
              <div>
                <Num size={28} weight={500} color="#FAFAFA" style={{ letterSpacing: "-0.02em" }}>{LIRE_DATA.kpis.autoResolvedPct}</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>% autonomous</span>
              </div>
              <div>
                <Num size={20} weight={500} color="#FAFAFA">{LIRE_DATA.kpis.avgFirstResponse}</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.55)", marginLeft: 4 }}>avg response</span>
              </div>
            </div>
          </div>
          <div style={{ maxHeight: 340, overflow: "auto" }}>
            {actions.map(a => (
              <div key={a.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "60px 1fr", gap: 10 }}>
                <Num size={10} color="rgba(255,255,255,0.45)">{a.at}</Num>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#FAFAFA" }}>{a.title}</div>
                  <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Stat label="After-hours handled" value={k.afterHoursHandled} footnote="autonomous, overnight"/>
        <Stat label="Vendors dispatched"  value={k.vendorsDispatched} footnote="in last 24h"/>
        <Stat label="Portfolio"           value="6" unit="properties"   footnote={k.portfolio.sqft}/>
        <Stat label="Tenants · Units"     value={`${k.portfolio.tenants} · ${k.portfolio.units}`} footnote="under management"/>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChannelsDashboardCard onOpen={() => onNav("channels")}/>
      </div>
    </div>
  );
}

// ---------- Properties ----------
function PropertiesScreen({ onNav }) {
  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "100%" }}>
      <Eyebrow>Portfolio</Eyebrow>
      <h1 style={{ margin: "4px 0 16px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: "var(--fg)" }}>
        Properties
      </h1>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1.4fr 1fr 80px 80px 100px 110px", padding: "10px 16px", borderBottom: "2px solid var(--fg)", background: "var(--surface-2)" }}>
          {["Code","Property","Location","Units","Tenants","Sq ft","Open work"].map((h,i) => (
            <Eyebrow key={i} style={{ fontSize: 10, textAlign: i >= 3 ? "right" : "left" }}>{h}</Eyebrow>
          ))}
        </div>
        {LIRE_DATA.properties.map(p => {
          const open = LIRE_DATA.tickets.filter(t => t.property === p.id).length;
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "80px 1.4fr 1fr 80px 80px 100px 110px", padding: "12px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <Num size={12} color="var(--fg-subtle)">{p.code}</Num>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{p.name}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>{p.city}</div>
              <div style={{ textAlign: "right" }}><Num size={12}>{p.units}</Num></div>
              <div style={{ textAlign: "right" }}><Num size={12}>{p.tenants}</Num></div>
              <div style={{ textAlign: "right" }}><Num size={12}>{p.sqft.toLocaleString()}</Num></div>
              <div style={{ textAlign: "right" }}>
                {open > 0 ? <Chip tone={open >= 2 ? "warning" : "neutral"} size="sm">{open} OPEN</Chip> : <Chip tone="muted" size="sm" dot={false}>CLEAR</Chip>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Compliance ----------
function ComplianceScreen() {
  const stages = ["60d audit", "30d request", "15d escalation", "7d final alert"];
  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "100%" }}>
      <Eyebrow>Portfolio Intelligence</Eyebrow>
      <h1 style={{ margin: "4px 0 6px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: "var(--fg)" }}>
        Compliance timeline
      </h1>
      <div style={{ marginBottom: 20, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg-muted)", maxWidth: 680 }}>
        4-stage automated escalation: 60 · 30 · 15 · 7 days out. Every lease renewal, insurance certificate, and municipal inspection tracked in one place.
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {LIRE_DATA.compliance.map(c => {
          const prop = LIRE_DATA.properties.find(p => p.id === c.property);
          const critical = c.status === "critical";
          return (
            <div key={c.id} style={{
              background: "var(--surface)", border: `1px solid ${critical ? "rgba(220,38,38,0.3)" : "var(--border)"}`, borderRadius: 4,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Num size={11} color="var(--fg-subtle)">{prop?.code}</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--fg)", flex: 1 }}>
                  {c.title}
                </span>
                <Chip tone={critical ? "error" : c.status === "active" ? "warning" : "muted"} size="sm">
                  {critical ? "CRITICAL" : c.status.toUpperCase()}
                </Chip>
                <Num size={12} color="var(--fg)">{c.due}</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>
                  in {c.daysOut}d
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {stages.map((s, i) => {
                  const stage = i + 1;
                  const done = stage < c.stage;
                  const at = stage === c.stage;
                  const bg = done ? "var(--fg)" : at ? "var(--accent)" : "var(--border)";
                  const fg = done || at ? "#FAFAFA" : "var(--fg-muted)";
                  return (
                    <div key={s} style={{ background: bg, color: fg, padding: "6px 8px", borderRadius: 2, minHeight: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <Num size={9} color={fg} style={{ letterSpacing: "0.06em", opacity: 0.8 }}>STAGE {stage}</Num>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: fg, marginTop: 2 }}>{s}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <Num size={10} color="var(--fg-subtle)">OWNER</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg)" }}>{c.owner}</span>
                <span style={{ flex: 1 }}/>
                <Num size={10} color="var(--fg-subtle)">{c.type.toUpperCase()}</Num>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Channels ----------
function ChannelGlyph({ k, size = 18 }) {
  // Brand-y little mark per channel, built from primitives — no external icons.
  const color = {
    email: "#1A1A1A", whatsapp: "#25D366", sms: "#0B6B4A",
    zoom: "#2D8CFF", slack: "#4A154B", messenger: "#0084FF",
  }[k] || "var(--fg)";
  const letter = { email: "@", whatsapp: "W", sms: "S", zoom: "Z", slack: "#", messenger: "M" }[k] || "•";
  return (
    <div style={{
      width: size + 14, height: size + 14, borderRadius: 4,
      background: color, color: "#fff",
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size - 2,
    }}>{letter}</div>
  );
}

function Sparkline({ values, color = "var(--fg)", width = 72, height = 20 }) {
  if (!values || values.length === 0) return <div style={{ width, height }}/>;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * step, height - (v / max) * (height - 2) - 1]);
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChannelCard({ ch, compact, onOpen }) {
  const off = !ch.connected;
  return (
    <button onClick={onOpen}
      style={{
        textAlign: "left", border: "1px solid var(--border)", borderRadius: 4,
        background: "var(--surface)", padding: compact ? "12px 14px" : "16px 18px",
        cursor: "pointer", display: "block", width: "100%",
        opacity: off ? 0.65 : 1, transition: "background 120ms var(--ease)",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
      onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ChannelGlyph k={ch.key} size={compact ? 16 : 20}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: compact ? 13 : 15, color: "var(--fg)", letterSpacing: "-0.01em" }}>
              {ch.label}
            </div>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: off ? "var(--fg-subtle)" : "var(--success)",
              display: "inline-block",
            }}/>
            <Num size={10} color="var(--fg-subtle)">{off ? "OFFLINE" : "LIVE"}</Num>
          </div>
          <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ch.address}
          </div>
        </div>
        {!compact && <Sparkline values={ch.volumeTrend} color={off ? "var(--fg-subtle)" : "var(--accent)"}/>}
      </div>
      <div style={{ marginTop: compact ? 10 : 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, borderTop: "1px solid var(--border)", paddingTop: compact ? 10 : 12 }}>
        <div>
          <Eyebrow style={{ fontSize: 9 }}>Open</Eyebrow>
          <Num size={compact ? 16 : 20} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{ch.open}</Num>
        </div>
        <div>
          <Eyebrow style={{ fontSize: 9 }}>24h resolved</Eyebrow>
          <Num size={compact ? 16 : 20} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{ch.resolved24h}</Num>
        </div>
        <div>
          <Eyebrow style={{ fontSize: 9 }}>AI handled</Eyebrow>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <Num size={compact ? 16 : 20} weight={500} color={off ? "var(--fg-muted)" : "var(--accent)"} style={{ letterSpacing: "-0.02em" }}>{ch.aiResolvedPct}</Num>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--fg-muted)" }}>%</span>
          </div>
        </div>
      </div>
      {!compact && (
        <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
          {ch.stack.toUpperCase()}
        </div>
      )}
    </button>
  );
}

function ChannelsDashboardCard({ onOpen }) {
  const chs = LIRE_DATA.channels;
  const live = chs.filter(c => c.connected);
  const off = chs.filter(c => !c.connected);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Channels</Eyebrow>
          <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.01em" }}>
            {live.length} live · {off.length} offline
          </div>
        </div>
        <Btn size="sm" variant="ghost" iconRight={<Icon.ArrowRight size={13}/>} onClick={onOpen}>Manage</Btn>
      </div>
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {chs.map(ch => (
          <div key={ch.key} style={{
            border: "1px solid var(--border)", borderRadius: 4,
            padding: "10px 12px", opacity: ch.connected ? 1 : 0.5,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <ChannelGlyph k={ch.key} size={14}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{ch.label}</span>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: ch.connected ? "var(--success)" : "var(--fg-subtle)",
                }}/>
              </div>
              <div style={{ marginTop: 1, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ch.connected ? `${ch.open} open · ${ch.resolved24h}/24h` : "Not connected"}
              </div>
            </div>
            <Sparkline values={ch.volumeTrend} color={ch.connected ? "var(--accent)" : "var(--fg-subtle)"} width={38} height={14}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsScreen({ onOpenInbox }) {
  const live = LIRE_DATA.channels.filter(c => c.connected);
  const off = LIRE_DATA.channels.filter(c => !c.connected);
  const totalOpen = live.reduce((s, c) => s + c.open, 0);
  const totalResolved = live.reduce((s, c) => s + c.resolved24h, 0);
  const avgAi = Math.round(live.reduce((s, c) => s + c.aiResolvedPct, 0) / (live.length || 1));

  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "100%", width: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Communications</Eyebrow>
          <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: "var(--fg)" }}>
            Channels
          </h1>
          <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg-muted)", maxWidth: 640 }}>
            One inbox, many front doors. Every message a tenant sends — email, WhatsApp, SMS, Zoom call — lands in the same queue with full property and history context attached.
          </div>
        </div>
        <Btn variant="primary" icon={<Icon.Plus size={13}/>}>Connect channel</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Live channels"     value={live.length}    footnote={`of ${LIRE_DATA.channels.length} available`}/>
        <Stat label="Open across all"   value={totalOpen}      footnote="active threads right now"/>
        <Stat label="Resolved · 24h"    value={totalResolved}  footnote="inbound to complete"/>
        <Stat label="Avg AI handled"    value={avgAi}          unit="%" tone="accent" footnote="autonomous end-to-end"/>
      </div>

      <Eyebrow style={{ marginBottom: 10 }}>Connected</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        {live.map(ch => <ChannelCard key={ch.key} ch={ch} onOpen={() => onOpenInbox && onOpenInbox(ch.key)}/>)}
      </div>

      <Eyebrow style={{ marginBottom: 10 }}>Available to connect</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {off.map(ch => (
          <div key={ch.key} style={{
            border: "1px dashed var(--border)", borderRadius: 4,
            background: "var(--surface)", padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <ChannelGlyph k={ch.key} size={16}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--fg)" }}>{ch.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
                {ch.stack.toUpperCase()}
              </div>
            </div>
            <Btn size="sm" variant="secondary">Connect</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Library (document repository) ----------
function LibraryScreen({ onNavConcierge }) {
  const [typeFilter, setTypeFilter]      = useStateD("all");
  const [propFilter, setPropFilter]      = useStateD("all");
  const [indexFilter, setIndexFilter]    = useStateD("all");
  const [q, setQ]                        = useStateD("");
  const [selectedId, setSelectedId]      = useStateD("d-001");
  const [detailsOpen, setDetailsOpen]    = useStateD(true);

  const docs = LIRE_DATA.documents;
  const props = LIRE_DATA.properties;
  const propByCode = Object.fromEntries(props.map(p => [p.id, p]));

  const types = [
    { k: "all",        l: "All types",  ic: "Layers" },
    { k: "lease",      l: "Leases",     ic: "FileText" },
    { k: "manual",     l: "Manuals",    ic: "Warehouse" },
    { k: "contract",   l: "Contracts",  ic: "Hammer" },
    { k: "compliance", l: "Compliance", ic: "Shield" },
    { k: "floorplan",  l: "Floor plans",ic: "Layers" },
    { k: "upload",     l: "Uploads",    ic: "Upload" },
  ];
  const typeCounts = types.reduce((acc, t) => {
    acc[t.k] = t.k === "all" ? docs.length : docs.filter(d => d.type === t.k).length;
    return acc;
  }, {});

  const indexOpts = [
    { k: "all",          l: "Any status"    },
    { k: "indexed",      l: "Indexed"       },
    { k: "pending",      l: "Indexing"      },
    { k: "needs_review", l: "Needs review"  },
    { k: "not_indexed",  l: "Not indexed"   },
  ];

  const filtered = docs.filter(d => {
    if (typeFilter !== "all"  && d.type !== typeFilter) return false;
    if (propFilter !== "all"  && d.property !== propFilter) return false;
    if (indexFilter !== "all" && d.indexed !== indexFilter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!d.name.toLowerCase().includes(needle) &&
          !d.tags.some(t => t.toLowerCase().includes(needle))) return false;
    }
    return true;
  });

  const selected = filtered.find(d => d.id === selectedId) || filtered[0];

  const iconForType = (t) => {
    const map = { lease:"FileText", manual:"Warehouse", contract:"Hammer", compliance:"Shield", floorplan:"Layers", upload:"Upload" };
    const Ic = Icon[map[t] || "FileText"];
    return <Ic size={14} color="var(--fg-muted)"/>;
  };
  const IxPill = ({ status }) => {
    const cfg = {
      indexed:      { l: "Indexed",      dot: "var(--success)",   bg: "rgba(11,107,74,0.08)" },
      pending:      { l: "Indexing…",    dot: "var(--warning)",   bg: "rgba(219,122,42,0.10)" },
      needs_review: { l: "Needs review", dot: "var(--warning)",   bg: "rgba(219,122,42,0.10)" },
      not_indexed:  { l: "Not indexed",  dot: "var(--fg-subtle)", bg: "rgba(0,0,0,0.03)" },
    }[status] || { l: status, dot: "var(--fg-subtle)", bg: "rgba(0,0,0,0.03)" };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 7px", borderRadius: 2, background: cfg.bg,
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em",
        color: "var(--fg-muted)",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }}/>
        {cfg.l.toUpperCase()}
      </span>
    );
  };

  const summary = {
    total:        docs.length,
    indexed:      docs.filter(d => d.indexed === "indexed").length,
    needsReview:  docs.filter(d => d.indexed === "needs_review").length,
    pending:      docs.filter(d => d.indexed === "pending").length,
    notIndexed:   docs.filter(d => d.indexed === "not_indexed").length,
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", background: "var(--bg)" }} data-screen-label="Library">
      {/* Left rail: filters */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: "1px solid var(--border)",
        background: "var(--surface)", padding: "20px 14px", overflowY: "auto",
      }}>
        <Eyebrow style={{ marginBottom: 6 }}>Type</Eyebrow>
        <div style={{ display: "grid", gap: 1, marginBottom: 18 }}>
          {types.map(t => {
            const active = typeFilter === t.k;
            const Ic = Icon[t.ic];
            return (
              <button key={t.k} onClick={() => setTypeFilter(t.k)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 9px", border: 0, borderRadius: 3, cursor: "pointer",
                  background: active ? "var(--surface-2)" : "transparent",
                  color: "var(--fg)", textAlign: "left",
                  fontFamily: "var(--font-body)", fontSize: 13, fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <Ic size={13} color="var(--fg-muted)"/>
                <span style={{ flex: 1 }}>{t.l}</span>
                <Num size={10} color="var(--fg-subtle)">{typeCounts[t.k]}</Num>
              </button>
            );
          })}
        </div>

        <Eyebrow style={{ marginBottom: 6 }}>Property</Eyebrow>
        <div style={{ display: "grid", gap: 1, marginBottom: 18 }}>
          <button onClick={() => setPropFilter("all")} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 9px", border: 0, borderRadius: 3, cursor: "pointer",
            background: propFilter === "all" ? "var(--surface-2)" : "transparent",
            color: "var(--fg)", textAlign: "left",
            fontFamily: "var(--font-body)", fontSize: 13, fontWeight: propFilter === "all" ? 600 : 400,
          }}>All properties <span style={{ flex: 1 }}/><Num size={10} color="var(--fg-subtle)">{docs.length}</Num></button>
          {props.map(p => {
            const active = propFilter === p.id;
            const count = docs.filter(d => d.property === p.id).length;
            return (
              <button key={p.id} onClick={() => setPropFilter(p.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 9px", border: 0, borderRadius: 3, cursor: "pointer",
                background: active ? "var(--surface-2)" : "transparent",
                color: "var(--fg)", textAlign: "left",
                fontFamily: "var(--font-body)", fontSize: 12, fontWeight: active ? 600 : 400,
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em", minWidth: 42 }}>{p.code}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(" · ")[0]}</span>
                <Num size={10} color="var(--fg-subtle)">{count}</Num>
              </button>
            );
          })}
          <button onClick={() => setPropFilter(null)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 9px", border: 0, borderRadius: 3, cursor: "pointer",
            background: propFilter === null ? "var(--surface-2)" : "transparent",
            color: "var(--fg-muted)", textAlign: "left",
            fontFamily: "var(--font-body)", fontSize: 12, fontStyle: "italic",
          }}>
            <span style={{ flex: 1 }}>Portfolio-wide</span>
            <Num size={10} color="var(--fg-subtle)">{docs.filter(d => d.property === null).length}</Num>
          </button>
        </div>

        <Eyebrow style={{ marginBottom: 6 }}>Index status</Eyebrow>
        <div style={{ display: "grid", gap: 1 }}>
          {indexOpts.map(o => {
            const active = indexFilter === o.k;
            return (
              <button key={o.k} onClick={() => setIndexFilter(o.k)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 9px", border: 0, borderRadius: 3, cursor: "pointer",
                background: active ? "var(--surface-2)" : "transparent",
                color: "var(--fg)", textAlign: "left",
                fontFamily: "var(--font-body)", fontSize: 12, fontWeight: active ? 600 : 400,
              }}>{o.l}</button>
            );
          })}
        </div>
      </aside>

      {/* Main: header + table */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--surface)", display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ fontSize: 10 }}>Document library</Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, letterSpacing: "-0.01em", color: "var(--fg)" }}>
                {filtered.length} document{filtered.length === 1 ? "" : "s"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>
                {summary.indexed} INDEXED · {summary.needsReview + summary.pending} IN QUEUE · {summary.notIndexed} NOT INDEXED
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)", padding: "7px 10px", width: 260 }}>
            <Icon.Search size={13} color="var(--fg-muted)"/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or tag…"
              style={{ flex: 1, border: 0, outline: "none", background: "transparent",
                fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)" }}/>
          </div>
          <Btn variant="secondary" size="md" icon={<Icon.Upload size={13}/>}>Upload</Btn>
          <Btn variant="primary" size="md" icon={<Icon.Plus size={13}/>}>New document</Btn>
          {!detailsOpen && selected && (
            <Btn variant="ghost" size="md" icon={<Icon.PanelLeft size={13}/>} onClick={() => setDetailsOpen(true)} title="Show details pane">Details</Btn>
          )}
        </div>

        {/* Content: table + details */}
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* Table */}
          <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1fr) 160px 130px",
              gap: 0, padding: "10px 20px",
              fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em",
              borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 1,
            }}>
              <div>NAME</div><div>SIZE · UPDATED</div><div>INDEX</div>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                No documents match these filters.
              </div>
            )}
            {filtered.map(d => {
              const p = d.property ? propByCode[d.property] : null;
              const active = selected && selected.id === d.id;
              return (
                <button key={d.id} onClick={() => { setSelectedId(d.id); setDetailsOpen(true); }} style={{
                  width: "100%", display: "grid",
                  gridTemplateColumns: "minmax(220px, 1fr) 160px 130px",
                  gap: 0, padding: "11px 20px", border: 0,
                  borderBottom: "1px solid var(--border)",
                  background: active ? "var(--surface-2)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  color: "var(--fg)", textAlign: "left", cursor: "pointer",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {iconForType(d.type)}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {p ? p.code : "PORTFOLIO"}
                        </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{d.name}</span>
                      </div>
                      <div style={{ marginTop: 3, display: "flex", gap: 4, flexWrap: "nowrap", overflow: "hidden" }}>
                        {d.tags.slice(0, 3).map(t => (
                          <span key={t} style={{
                            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em",
                            padding: "1px 5px", background: "rgba(0,0,0,0.04)", borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0,
                          }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", alignSelf: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.size}{d.pages ? ` · ${d.pages}p` : ""} · {d.uploadedAt}
                  </div>
                  <div style={{ alignSelf: "center" }}>
                    <IxPill status={d.indexed}/>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Details pane */}
          {selected && detailsOpen && (
            <aside style={{
              width: 300, flexShrink: 0, borderLeft: "1px solid var(--border)",
              background: "var(--surface)", overflowY: "auto", padding: "18px 18px 24px",
              position: "relative",
            }}>
              <button onClick={() => setDetailsOpen(false)} title="Close details"
                style={{ position: "absolute", top: 12, right: 12, border: 0, background: "transparent", cursor: "pointer", color: "var(--fg-muted)", padding: 4, borderRadius: 3 }}>
                <Icon.X size={13}/>
              </button>
              <Eyebrow>Selected · {selected.type}</Eyebrow>
              <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.3, color: "var(--fg)", letterSpacing: "-0.01em" }}>
                {selected.name}
              </div>
              <div style={{ marginTop: 8 }}><IxPill status={selected.indexed}/></div>

              <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
                <Btn size="sm" variant="secondary" icon={<Icon.FileText size={12}/>}>Open</Btn>
                <Btn size="sm" variant="ghost" icon={<Icon.Upload size={12}/>}>Replace</Btn>
              </div>

              <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14, display: "grid", gap: 10, fontFamily: "var(--font-body)", fontSize: 12 }}>
                {selected.property && (
                  <Row label="Property" value={`${propByCode[selected.property].code} — ${propByCode[selected.property].name}`}/>
                )}
                {!selected.property && (
                  <Row label="Scope" value="Portfolio-wide"/>
                )}
                <Row label="Size"      value={`${selected.size}${selected.pages ? ` · ${selected.pages} pages` : ""}`}/>
                <Row label="Version"   value={selected.version}/>
                <Row label="Uploaded"  value={`${selected.uploadedAt} by ${selected.uploadedBy}`}/>
                <Row label="Index"     value={selected.freshness}/>
              </div>

              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <Eyebrow style={{ marginBottom: 6 }}>Tags</Eyebrow>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{
                      fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--fg-muted)",
                      padding: "3px 7px", background: "rgba(0,0,0,0.04)", borderRadius: 2,
                    }}>{t}</span>
                  ))}
                  <button style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--fg-subtle)",
                    padding: "3px 7px", background: "transparent", border: "1px dashed var(--border)", borderRadius: 2, cursor: "pointer",
                  }}>+ ADD TAG</button>
                </div>
              </div>

              {/* Connector to Concierge */}
              <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <Eyebrow style={{ marginBottom: 6 }}>Used by Concierge</Eyebrow>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
                  {selected.indexed === "indexed"
                    ? <>This document is live in the Concierge knowledge base. The agent may cite it in tenant replies.</>
                    : selected.indexed === "pending"
                      ? <>Indexing queued. Will become citable once processed (usually under an hour).</>
                      : selected.indexed === "needs_review"
                        ? <>Awaiting your review before it gets indexed. Confirm type + tags so the Concierge can find it.</>
                        : <>Not indexed. Promote to the Concierge knowledge base from here.</>}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {selected.indexed !== "indexed" && (
                    <Btn size="sm" variant="dark">{selected.indexed === "needs_review" ? "Approve & index" : "Send to Concierge"}</Btn>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => onNavConcierge && onNavConcierge()} iconRight={<Icon.ArrowRight size={11}/>}>
                    View in Concierge
                  </Btn>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", paddingTop: 1 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg)", lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, PropertiesScreen, ComplianceScreen, ChannelsScreen, ChannelsDashboardCard, LibraryScreen });

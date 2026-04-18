// LIRE Help — Concierge (Claude-managed agent) admin surface

const { useState: useStateC, useMemo: useMemoC } = React;

// ---------- Shared bits ----------
function ConciergeGlyph({ size = 40, tone = "light" }) {
  const bg = tone === "dark" ? "var(--fg)" : "var(--accent)";
  const fg = tone === "dark" ? "var(--accent)" : "#FAFAFA";
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: bg, color: fg,
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.42,
      letterSpacing: "-0.04em", position: "relative", overflow: "hidden",
    }}>
      <span style={{ position: "relative", zIndex: 1 }}>L◦</span>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18), transparent 60%)`,
      }}/>
    </div>
  );
}

function StateDot({ state }) {
  const color = state === "live" ? "var(--success)" : state === "shadow" ? "var(--warning)" : "var(--fg-subtle)";
  return <span style={{
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: color, boxShadow: state === "live" ? `0 0 0 3px ${color}33` : "none",
  }}/>;
}

function SectionHeader({ eyebrow, title, desc, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
      <div style={{ flex: 1 }}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em", color: "var(--fg)" }}>
          {title}
        </div>
        {desc && <div style={{ marginTop: 4, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>{desc}</div>}
      </div>
      {right}
    </div>
  );
}

function AutonomyBar({ pct, height = 6 }) {
  return (
    <div style={{ height, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }}/>
    </div>
  );
}

// ---------- State switch ----------
function StateSwitch({ value, onChange }) {
  const opts = [
    { k: "live",   label: "Live",    desc: "Replying to tenants" },
    { k: "shadow", label: "Shadow",  desc: "Drafts only, no sends" },
    { k: "paused", label: "Paused",  desc: "Silent; humans handle all" },
  ];
  return (
    <div style={{ display: "inline-flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: 3 }}>
      {opts.map(o => {
        const active = value === o.k;
        return (
          <button key={o.k} onClick={() => onChange(o.k)} title={o.desc}
            style={{
              padding: "6px 12px", border: 0, cursor: "pointer", borderRadius: 3,
              background: active ? (o.k === "live" ? "var(--success)" : o.k === "shadow" ? "var(--warning)" : "var(--fg)") : "transparent",
              color: active ? "#FAFAFA" : "var(--fg-muted)",
              fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
              transition: "all 120ms var(--ease)",
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Hero: variation A (Control room) ----------
function HeroControlRoom({ config, onState }) {
  const c = config;
  return (
    <div style={{ background: "var(--fg)", color: "#FAFAFA", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <ConciergeGlyph size={56} tone="dark"/>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StateDot state={c.state}/>
            <Eyebrow style={{ color: "rgba(255,255,255,0.6)" }}>LIRE Concierge · Claude-managed agent</Eyebrow>
          </div>
          <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", color: "#FAFAFA" }}>
            Handling 14 live threads across 6 properties
          </h1>
          <div style={{ marginTop: 4, fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 680 }}>
            <span style={{ color: "var(--accent)" }}>{c.autonomyPct}%</span> resolved end-to-end this week · {c.activity.ttfr} average first response · CSAT proxy {c.activity.csatProxy}.
          </div>
        </div>
        <StateSwitch value={c.state} onChange={onState}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { l: "Knowledge sources", v: c.knowledge.filter(k => !k.offline).length, u: `of ${c.knowledge.length}` },
          { l: "Indexed items",     v: c.knowledge.reduce((s, k) => s + (typeof k.items === "number" ? k.items : 0), 0).toLocaleString(), u: "records" },
          { l: "Pending plays",      v: c.learning.plays.filter(p => p.status === "pending").length, u: "to review" },
          { l: "Content gaps",       v: c.learning.gaps.length, u: "questions" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "16px 22px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <Eyebrow style={{ color: "rgba(255,255,255,0.5)" }}>{s.l}</Eyebrow>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
              <Num size={22} weight={500} color="#FAFAFA" style={{ letterSpacing: "-0.02em" }}>{s.v}</Num>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{s.u}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 22px", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.03em" }}>
        <span style={{ color: "var(--accent)" }}>▌</span> 02:17 DISPATCHED Sentinel HVAC · ATL-02 ·&nbsp;
        <span style={{ color: "rgba(255,255,255,0.85)" }}>02:14 REPLIED Marco Reyes via WhatsApp</span> ·&nbsp;
        01:48 LEARNED Marco prefers WhatsApp for urgent · 01:02 SENT COI stage-3 · GLX-03 · 00:14 PAGED Avery — 'lawyer' in LIRE-4181
      </div>
    </div>
  );
}

// ---------- Hero: variation B (Meet your agent) ----------
function HeroMeet({ config, onState }) {
  const c = config;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "48px 56px 40px", position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 28, alignItems: "flex-start" }}>
        <ConciergeGlyph size={84}/>
        <div>
          <Eyebrow>LIRE Concierge · Claude-managed agent</Eyebrow>
          <h1 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 44, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.02, textWrap: "pretty" }}>
            The operating rhythm of every property, held in one place.
          </h1>
          <div style={{ marginTop: 16, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--fg-muted)", maxWidth: 620, lineHeight: 1.5 }}>
            Concierge answers tenants on their channel of choice, dispatches vendors from your contracts, keeps compliance moving, and quietly learns the way each property runs — so your team only sees work that needs a human.
          </div>
        </div>
        <StateSwitch value={c.state} onChange={onState}/>
      </div>

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1px solid var(--border)" }}>
        {[
          { l: "This week · autonomous",  v: c.autonomyPct, suffix: "%", foot: "handled end-to-end" },
          { l: "First response",          v: c.activity.ttfr, foot: "across channels" },
          { l: "Tenant satisfaction",     v: c.activity.csatProxy, suffix: "%", foot: "no 48h re-open" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "24px 4px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <Eyebrow>{s.l}</Eyebrow>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
              <Num size={36} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{s.v}</Num>
              {s.suffix && <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--fg-muted)" }}>{s.suffix}</span>}
            </div>
            <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>{s.foot}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Overview body (shared under whichever hero) ----------
function OverviewBody({ config, onState }) {
  const c = config;
  const liveChannels = Object.keys(c.channelsEnabled).filter(k => c.channelsEnabled[k]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 16 }}>
      {/* Left: Admin controls */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <Eyebrow>Admin controls</Eyebrow>
          <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
            How the Concierge connects with your world
          </div>
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Eyebrow style={{ flex: 1 }}>Autonomy ceiling</Eyebrow>
            <Num size={13} color="var(--fg)">{c.autonomyPct}%</Num>
          </div>
          <AutonomyBar pct={c.autonomyPct} height={8}/>
          <div style={{ marginTop: 6, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>
            Above this threshold, Concierge acts. Below, it drafts for human review.
          </div>
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <Eyebrow style={{ marginBottom: 8 }}>Channels it can speak on</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {["email","whatsapp","sms","zoom"].map(ch => {
              const on = c.channelsEnabled[ch];
              return (
                <div key={ch} style={{
                  padding: "8px 10px", borderRadius: 3,
                  background: on ? "var(--fg)" : "var(--surface-2)",
                  color: on ? "#FAFAFA" : "var(--fg-muted)",
                  border: "1px solid " + (on ? "var(--fg)" : "var(--border)"),
                }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{ch}</div>
                  <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", opacity: 0.7 }}>
                    {on ? "ON" : "OFF"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>
            Currently active on <span style={{ color: "var(--fg)", fontWeight: 600 }}>{liveChannels.length}</span> channels. Toggles sync to each channel's connector.
          </div>
        </div>

        <div style={{ padding: "14px 18px" }}>
          <Eyebrow style={{ marginBottom: 8 }}>Who can reach it directly</Eyebrow>
          {c.reach.map((r, i) => {
            const esc = r.status === "escalate";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <Icon.User size={14} color={esc ? "var(--warning)" : "var(--fg-muted)"}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--fg)" }}>{r.who}</div>
                  {r.note && <div style={{ marginTop: 1, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>{r.note}</div>}
                </div>
                <Chip tone={esc ? "warning" : "muted"} size="sm">
                  {esc ? "Human first" : "Direct"}
                </Chip>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Skills + activity feed */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Eyebrow>Skills</Eyebrow>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
              Specialists within one Concierge
            </div>
          </div>
          {c.skills.map((s, i) => (
            <div key={s.key} style={{ padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--fg)", flex: 1 }}>{s.name}</span>
                <Num size={11} color="var(--fg-muted)">{s.autonomous}% auto</Num>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>{s.desc}</div>
              <AutonomyBar pct={s.autonomous}/>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Eyebrow>Live activity</Eyebrow>
          </div>
          <div>
            {c.activity.log.map((e, i) => {
              const toneColor = {
                action: "var(--accent)", message: "var(--fg)",
                learn: "var(--success)", escalate: "var(--warning)",
              }[e.kind];
              return (
                <div key={i} style={{ padding: "10px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "48px 12px 1fr", gap: 10, alignItems: "center" }}>
                  <Num size={10} color="var(--fg-subtle)">{e.at}</Num>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor }}/>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg)" }}>{e.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ConciergeGlyph, HeroControlRoom, HeroMeet, OverviewBody, StateSwitch, StateDot, SectionHeader, AutonomyBar });

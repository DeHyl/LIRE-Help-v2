// LIRE Help — Concierge tabs: Knowledge · Learning · Guardrails · Activity

const { useState: useStateCT } = React;

function iconByName(n) {
  return { FileText: Icon.FileText, Hammer: Icon.Hammer, Inbox: Icon.Inbox,
           Shield: Icon.Shield, Layers: Icon.Layers, Warehouse: Icon.Warehouse,
           Upload: Icon.Upload, Hash: Icon.Hash }[n] || Icon.FileText;
}

// ---------- Knowledge ----------
function KnowledgeTab({ config, onNavLibrary }) {
  return (
    <div>
      <SectionHeader
        eyebrow="Knowledge base"
        title="What the Concierge knows"
        desc="The agent's live index. Source documents live in Library — this view shows what's indexed, how fresh it is, and where coverage is thin."
        right={<Btn variant="secondary" size="md" icon={<Icon.FileText size={13}/>} onClick={() => onNavLibrary && onNavLibrary()} iconRight={<Icon.ArrowRight size={11}/>}>Open Library</Btn>}
      />
      {/* Distinction callout */}
      <div style={{
        marginBottom: 14, padding: "10px 14px",
        border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)",
        background: "var(--surface)", borderRadius: 3,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>Two places, one source of truth.</span>{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--fg)" }}>LIBRARY</span> is where you upload and manage raw documents — leases, manuals, contracts.{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--fg)" }}>KNOWLEDGE</span> is this view: the subset the Concierge has indexed and can cite.
        </div>
        <Btn size="sm" variant="ghost" onClick={() => onNavLibrary && onNavLibrary()} iconRight={<Icon.ArrowRight size={11}/>}>Manage documents</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {config.knowledge.map(k => {
          const Ic = iconByName(k.icon);
          const off = k.offline;
          return (
            <div key={k.key} style={{
              background: "var(--surface)", border: "1px solid " + (k.gap ? "rgba(234,179,8,0.35)" : "var(--border)"),
              borderRadius: 4, padding: "14px 16px",
              opacity: off ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 3, background: "var(--surface-2)",
                  display: "grid", placeItems: "center", color: "var(--fg)",
                }}><Ic size={14}/></div>
                <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                  {k.label}
                </div>
                {k.gap && <Chip tone="warning" size="sm">GAP</Chip>}
                {off && <Chip tone="muted" size="sm">OFFLINE</Chip>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <Num size={20} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{k.items}</Num>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>items indexed</span>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)", marginBottom: 2 }}>
                {k.covers}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
                LAST INDEXED · {k.lastIndexed.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Learning ----------
function LearningTab({ config }) {
  const L = config.learning;
  const [plays, setPlays] = useStateCT(L.plays);
  const update = (id, status) => setPlays(plays.map(p => p.id === id ? { ...p, status } : p));

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Plays queue */}
      <section>
        <SectionHeader
          eyebrow="Learning loop · plays"
          title="Should this become a play?"
          desc="After every resolved ticket, the Concierge proposes a reusable play. You approve what gets learned."
        />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          {plays.map((p, i) => (
            <div key={p.id} style={{
              padding: "14px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none",
              display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Num size={11} color="var(--fg-subtle)">{p.from}</Num>
                  <Chip tone={p.confidence > 0.9 ? "success" : "neutral"} size="sm">
                    {Math.round(p.confidence * 100)}% CONFIDENCE
                  </Chip>
                  {p.status === "approved" && <Chip tone="success" size="sm">APPROVED</Chip>}
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>
                  {p.question}
                </div>
                <div style={{ marginTop: 3, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                  {p.summary}
                </div>
              </div>
              {p.status === "pending" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" variant="secondary" onClick={() => update(p.id, "rejected")}>Reject</Btn>
                  <Btn size="sm" variant="primary" onClick={() => update(p.id, "approved")} icon={<Icon.Check size={12}/>}>Approve</Btn>
                </div>
              ) : (
                <Num size={11} color="var(--fg-subtle)">{p.status.toUpperCase()}</Num>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two-column: Preferences + Gaps */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Eyebrow>Silently learned preferences</Eyebrow>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
              The rhythm of each property
            </div>
          </div>
          {L.preferences.map((pr, i) => (
            <div key={i} style={{ padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{pr.subject}</div>
              <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>{pr.pref}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Eyebrow>Content gaps</Eyebrow>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
              Questions I couldn't answer
            </div>
          </div>
          {L.gaps.map((g, i) => (
            <div key={g.id} style={{ padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none",
              display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--fg)" }}>{g.question}</div>
                <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
                  ASKED {g.asked}× · LAST {g.last.toUpperCase()}
                </div>
              </div>
              <Btn size="sm" variant="secondary" icon={<Icon.Plus size={11}/>}>Answer</Btn>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly digest */}
      <section style={{ background: "var(--fg)", color: "#FAFAFA", borderRadius: 4 }}>
        <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Icon.Sparkles size={14} color="var(--accent)"/>
          <div style={{ flex: 1 }}>
            <Eyebrow style={{ color: "rgba(255,255,255,0.6)" }}>Weekly digest · {L.weeklyDigest.period}</Eyebrow>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "#FAFAFA" }}>
              Here's what I learned this week
            </div>
          </div>
          <Btn size="sm" variant="primary">Approve all</Btn>
        </div>
        <div>
          {L.weeklyDigest.items.map((it, i) => {
            const tone = it.kind === "learned" ? "var(--success)" : it.kind === "gap" ? "var(--warning)" : "var(--accent)";
            return (
              <div key={i} style={{ padding: "10px 22px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "grid", gridTemplateColumns: "100px 1fr", gap: 16, alignItems: "center" }}>
                <Num size={10} color={tone} style={{ letterSpacing: "0.06em" }}>{it.kind.toUpperCase()}</Num>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#FAFAFA" }}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------- Guardrails ----------
function GuardrailsTab({ config }) {
  const G = config.guardrails;
  const modeMeta = {
    auto:     { label: "Autonomous",      tone: "success", desc: "Acts without asking" },
    propose:  { label: "Propose",         tone: "neutral", desc: "Drafts; human approves" },
    escalate: { label: "Escalate",        tone: "warning", desc: "Pages a human" },
    blocked:  { label: "Blocked",         tone: "error",   desc: "Never handled by Concierge" },
  };
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section>
        <SectionHeader
          eyebrow="Autonomy matrix"
          title="What it can do on its own"
          desc="Click a row to rewrite the policy. Changes take effect immediately."
        />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr", padding: "10px 18px", borderBottom: "2px solid var(--fg)", background: "var(--surface-2)" }}>
            <Eyebrow style={{ fontSize: 10 }}>Topic</Eyebrow>
            <Eyebrow style={{ fontSize: 10 }}>Mode</Eyebrow>
            <Eyebrow style={{ fontSize: 10 }}>Note</Eyebrow>
          </div>
          {G.autonomyMatrix.map((row, i) => {
            const m = modeMeta[row.mode];
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr", padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{row.topic}</div>
                <div><Chip tone={m.tone} size="sm">{m.label.toUpperCase()}</Chip></div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>{row.note || m.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <Eyebrow>Hard escalation triggers</Eyebrow>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
              Always page a human when…
            </div>
          </div>
          {G.triggers.map((t, i) => (
            <label key={t.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg)" }}>{t.label}</div>
              <div style={{
                width: 34, height: 20, borderRadius: 10, padding: 2,
                background: t.on ? "var(--accent)" : "var(--border)",
                display: "flex", alignItems: "center", justifyContent: t.on ? "flex-end" : "flex-start",
                transition: "all 140ms var(--ease)",
              }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff" }}/>
              </div>
            </label>
          ))}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.Lock size={13} color="var(--error)"/>
              <Eyebrow>Legal & no-go zones</Eyebrow>
            </div>
            <div style={{ marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>
              Concierge will never touch these
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {G.nogo.map((n, i) => (
              <div key={i} style={{ padding: "8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon.X size={12} color="var(--error)"/>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg)" }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------- Activity ----------
function ActivityTab({ config }) {
  const A = config.activity;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "18px 20px" }}>
          <Eyebrow>Tenant satisfaction (proxy)</Eyebrow>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
            <Num size={40} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{A.csatProxy}</Num>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fg-muted)" }}>%</span>
          </div>
          <div style={{ marginTop: 4, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>
            Resolved threads with no re-open inside 48h. Last 30 days.
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "18px 20px" }}>
          <Eyebrow>Time to first response</Eyebrow>
          <div style={{ marginTop: 8 }}>
            <Num size={40} weight={500} color="var(--fg)" style={{ letterSpacing: "-0.02em" }}>{A.ttfr}</Num>
          </div>
          <div style={{ marginTop: 4, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>
            Across all channels. Human-only benchmark: 11m 20s.
          </div>
        </div>
      </div>

      <SectionHeader eyebrow="Audit log" title="Everything the Concierge did today"
        desc="Every action is logged with source, model version, and the policies invoked."/>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        {A.log.map((e, i) => {
          const tone = { action: "var(--accent)", message: "var(--fg)", learn: "var(--success)", escalate: "var(--warning)" }[e.kind];
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 90px 1fr", padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none", alignItems: "center", gap: 12 }}>
              <Num size={11} color="var(--fg-subtle)">{e.at}</Num>
              <Chip tone={e.kind === "escalate" ? "warning" : e.kind === "learn" ? "success" : "neutral"} size="sm">
                {e.kind.toUpperCase()}
              </Chip>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)" }}>{e.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Main screen ----------
function ConciergeScreen({ heroVariant = "A", onNavLibrary }) {
  const [config, setConfig] = useStateCT(LIRE_DATA.concierge);
  const [tab, setTab] = useStateCT("overview");
  const onState = (s) => setConfig({ ...config, state: s });

  const tabs = [
    { k: "overview",   label: "Overview" },
    { k: "knowledge",  label: "Knowledge" },
    { k: "learning",   label: "Learning" },
    { k: "guardrails", label: "Guardrails" },
    { k: "activity",   label: "Activity" },
  ];

  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "100%", width: "100%", overflow: "auto" }}>
      {tab === "overview" && (heroVariant === "B"
        ? <HeroMeet config={config} onState={onState}/>
        : <HeroControlRoom config={config} onState={onState}/>)}

      <div style={{ marginTop: tab === "overview" ? 8 : 0, marginBottom: 16, borderBottom: "1px solid var(--border)", display: "flex", gap: 0 }}>
        {tabs.map(t => {
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: "12px 18px 14px", border: 0, background: "transparent",
              borderBottom: "2px solid " + (active ? "var(--fg)" : "transparent"),
              marginBottom: -1, cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--fg)" : "var(--fg-muted)",
            }}>{t.label}</button>
          );
        })}
      </div>

      {tab === "overview"   && <OverviewBody config={config} onState={onState}/>}
      {tab === "knowledge"  && <KnowledgeTab config={config} onNavLibrary={onNavLibrary}/>}
      {tab === "learning"   && <LearningTab config={config}/>}
      {tab === "guardrails" && <GuardrailsTab config={config}/>}
      {tab === "activity"   && <ActivityTab config={config}/>}
    </div>
  );
}

Object.assign(window, { ConciergeScreen, KnowledgeTab, LearningTab, GuardrailsTab, ActivityTab });

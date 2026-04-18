// LIRE Help — Landing + Login pages (elevated marketing surface)

const { useState: useStateL } = React;

function LireMark({ size = 32, tone = "light" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: tone === "dark" ? "var(--accent)" : "var(--fg)",
      color: tone === "dark" ? "#FAFAFA" : "var(--accent)",
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.5,
      letterSpacing: "-0.04em",
    }}>L</div>
  );
}

function MarketingNav({ onLogin, onApp }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      padding: "20px 48px", display: "flex", alignItems: "center", gap: 20,
      borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <LireMark size={28}/>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>LIRE Help</div>
        <div style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>DEHYL · OPERATIONS OS</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg-muted)" }}>
        <a href="#product" style={{ color: "inherit", textDecoration: "none" }}>Product</a>
        <a href="#agent" style={{ color: "inherit", textDecoration: "none" }}>Concierge</a>
        <a href="#contact" style={{ color: "inherit", textDecoration: "none" }}>Contact</a>
      </div>
      <Btn size="sm" variant="secondary" onClick={onLogin}>Sign in</Btn>
      <Btn size="sm" variant="primary" onClick={onApp}>Open app demo</Btn>
    </div>
  );
}

// ---------- Hero A: Editorial prestige ----------
function HeroEditorial({ onApp, onLogin }) {
  return (
    <section style={{ padding: "88px 48px 72px", maxWidth: 1360, margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.08em", marginBottom: 28 }}>
        01 — OPERATIONS OS FOR INDUSTRIAL PROPERTY
      </div>
      <h1 style={{
        margin: 0, fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: "min(8.5vw, 120px)", lineHeight: 0.95, letterSpacing: "-0.045em",
        color: "var(--fg)", textWrap: "balance", maxWidth: 1200,
      }}>
        The quiet<br/>
        night shift<br/>
        for your <span style={{ color: "var(--accent)" }}>portfolio</span>.
      </h1>
      <div style={{ marginTop: 32, maxWidth: 640, fontFamily: "var(--font-body)", fontSize: 18, lineHeight: 1.5, color: "var(--fg-muted)" }}>
        LIRE Help is a Claude-managed agent and inbox for industrial property teams. Tenant requests, vendor dispatch, compliance, and site history — one operating surface that answers in seconds and knows every building.
      </div>
      <div style={{ marginTop: 36, display: "flex", gap: 10 }}>
        <Btn variant="primary" size="md" onClick={onApp} iconRight={<Icon.ArrowRight size={13}/>}>Walk the demo</Btn>
        <Btn variant="secondary" size="md" onClick={onLogin}>Sign in</Btn>
      </div>
    </section>
  );
}

// ---------- Hero B: Narrative overnight ----------
function HeroNarrative({ onApp, onLogin }) {
  const log = [
    { at: "02:14 AM", prop: "ATL-02", text: "Marco (Atlas Cold Storage): Dock 4 compressor is down. Perishables arriving 5 AM." },
    { at: "02:14 AM", prop: "CONCIERGE", text: "Fault matched to Model Copeland ZR94. Sentinel HVAC has your service contract. Dispatching." },
    { at: "02:16 AM", prop: "CONCIERGE", text: "Technician Rafael G. confirmed. ETA 4:30 AM. Shared gate code + site map." },
    { at: "02:19 AM", prop: "ATL-02", text: "Perfect. We're standing by." },
    { at: "07:02 AM", prop: "AVERY KIM", text: "(Arriving at the office, sees the resolved thread.)" },
  ];
  return (
    <section style={{ padding: "72px 48px 64px", maxWidth: 1360, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.08em", marginBottom: 20 }}>
            01 — A TUESDAY AT 2 AM
          </div>
          <h1 style={{
            margin: 0, fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "min(6.4vw, 88px)", lineHeight: 1.0, letterSpacing: "-0.035em",
            color: "var(--fg)", textWrap: "balance",
          }}>
            Handled while<br/>
            you were<br/>
            <span style={{ color: "var(--accent)" }}>sleeping</span>.
          </h1>
          <div style={{ marginTop: 28, maxWidth: 520, fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.55, color: "var(--fg-muted)" }}>
            One dock compressor, one tenant with product at risk, one Claude-managed agent that already knew which vendor to call. That's the promise of LIRE Help — every thread across every property, resolved in the right way before the day begins.
          </div>
          <div style={{ marginTop: 32, display: "flex", gap: 10 }}>
            <Btn variant="primary" size="md" onClick={onApp} iconRight={<Icon.ArrowRight size={13}/>}>See the full story</Btn>
            <Btn variant="secondary" size="md" onClick={onLogin}>Sign in</Btn>
          </div>
        </div>

        <div style={{ background: "var(--fg)", color: "#FAFAFA", borderRadius: 4, padding: "28px 28px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 3px rgba(255,77,0,0.2)" }}/>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}>LIVE THREAD · ATL-02 · DOCK 4</div>
          </div>
          {log.map((l, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none", display: "grid", gridTemplateColumns: "72px 90px 1fr", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", paddingTop: 2 }}>{l.at}</div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em",
                color: l.prop === "CONCIERGE" ? "var(--accent)" : "rgba(255,255,255,0.7)",
                paddingTop: 2,
              }}>{l.prop}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 1.5 }}>{l.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Concierge explainer section ----------
function ConciergeExplainer() {
  const pillars = [
    { n: "01", t: "Knows your buildings", b: "Leases, vendor contracts, floor plans, equipment manuals, and every past resolved ticket — indexed and cited on every reply." },
    { n: "02", t: "Learns your rhythm",   b: "Captures vendor preferences, tenant quirks, and after-hours rules silently. You approve what gets promoted into the playbook." },
    { n: "03", t: "Stays in its lane",    b: "Autonomy matrix by topic. Hard no-go zones for rent disputes and legal. Escalation triggers when a human must step in." },
  ];
  return (
    <section id="agent" style={{ padding: "96px 48px", background: "var(--surface)" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.08em", marginBottom: 20 }}>
          02 — THE CLAUDE-MANAGED AGENT
        </div>
        <h2 style={{
          margin: 0, fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "min(5.6vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.03em",
          color: "var(--fg)", maxWidth: 1000, textWrap: "balance",
        }}>
          Not a chatbot. <span style={{ color: "var(--fg-muted)" }}>An operator</span> — with a knowledge base, a set of skills, and guardrails you write.
        </h2>
        <div style={{ marginTop: 24, maxWidth: 680, fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.55, color: "var(--fg-muted)" }}>
          LIRE Concierge is built on Claude and managed by your team. You control what it knows, what it can do on its own, and where it must hand off. It gets better every week — and the digest tells you exactly how.
        </div>

        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1px solid var(--border)" }}>
          {pillars.map((p, i) => (
            <div key={i} style={{ padding: "32px 28px 0 0", borderRight: i < 2 ? "1px solid var(--border)" : "none", paddingLeft: i > 0 ? 28 : 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 12 }}>{p.n}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.015em", color: "var(--fg)", marginBottom: 10 }}>{p.t}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.55, color: "var(--fg-muted)" }}>{p.b}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, background: "var(--fg)", color: "#FAFAFA", borderRadius: 4, padding: "28px 4px" }}>
          {[
            { l: "Autonomous resolution", v: "82%", f: "of tenant threads end-to-end" },
            { l: "First response",        v: "1m 14s", f: "vs 11m human benchmark" },
            { l: "Tenant satisfaction",   v: "94%", f: "no re-open in 48h" },
            { l: "Knowledge sources",     v: "8",     f: "per property · continuous index" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 28px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)" }}>{s.l.toUpperCase()}</div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 40, letterSpacing: "-0.02em", color: "#FAFAFA" }}>{s.v}</div>
              <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{s.f}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ onApp, onLogin }) {
  return (
    <section id="contact" style={{ padding: "96px 48px 72px" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 64, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.08em", marginBottom: 16 }}>
            03 — GET STARTED
          </div>
          <h2 style={{
            margin: 0, fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "min(6.4vw, 88px)", lineHeight: 1.0, letterSpacing: "-0.035em",
            color: "var(--fg)", textWrap: "balance",
          }}>
            Walk through a<br/>live portfolio.
          </h2>
          <div style={{ marginTop: 20, fontFamily: "var(--font-body)", fontSize: 16, color: "var(--fg-muted)", maxWidth: 540 }}>
            Six properties, two dozen tenants, a weekend of live tickets. See what the Concierge caught, what it learned, and what it handed to the humans.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="primary" size="md" onClick={onApp} iconRight={<Icon.ArrowRight size={13}/>}>Walk the demo</Btn>
          <Btn variant="secondary" size="md" onClick={onLogin}>Sign in to your portfolio</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 1360, margin: "56px auto 0", paddingTop: 28, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
        <LireMark size={22}/>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>LIRE Help</div>
        <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>Dehyl · Operations OS · © 2026</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)", display: "flex", gap: 18 }}>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Security</a>
        </div>
      </div>
    </section>
  );
}

function LandingScreen({ onApp, onLogin, heroVariant = "A" }) {
  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", width: "100%", minHeight: "100%" }}>
      <MarketingNav onLogin={onLogin} onApp={onApp}/>
      {heroVariant === "B" ? <HeroNarrative onApp={onApp} onLogin={onLogin}/> : <HeroEditorial onApp={onApp} onLogin={onLogin}/>}
      <ConciergeExplainer/>
      <FooterCTA onApp={onApp} onLogin={onLogin}/>
    </div>
  );
}

// ---------- Login ----------
function SsoButton({ provider, onClick }) {
  const meta = {
    google:    { label: "Continue with Google",    glyph: "G", color: "#EA4335" },
    microsoft: { label: "Continue with Microsoft", glyph: "M", color: "#2F7BE8" },
    okta:      { label: "Continue with Okta",      glyph: "Ø", color: "#007DC1" },
  }[provider];
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4,
      cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--fg)",
      width: "100%",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
    onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
    >
      <div style={{ width: 22, height: 22, borderRadius: 3, background: meta.color, color: "#fff",
        display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{meta.glyph}</div>
      <span style={{ flex: 1, textAlign: "left" }}>{meta.label}</span>
      <Icon.ArrowRight size={12} color="var(--fg-muted)"/>
    </button>
  );
}

function LoginScreen({ onApp, onLanding }) {
  const [mode, setMode] = useStateL("signin"); // signin | signup | forgot
  const [email, setEmail] = useStateL("");
  const [password, setPassword] = useStateL("");

  const titles = {
    signin: { eyebrow: "Welcome back", title: "Sign in to LIRE",  cta: "Sign in" },
    signup: { eyebrow: "Get started",  title: "Create your team", cta: "Create account" },
    forgot: { eyebrow: "Reset access", title: "Recover access",   cta: "Send reset link" },
  }[mode];

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>
      {/* Left: form */}
      <div style={{ padding: "32px 48px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }} onClick={onLanding}>
          <LireMark size={26}/>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>LIRE Help</div>
        </div>

        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.08em", marginBottom: 10 }}>
              {titles.eyebrow.toUpperCase()}
            </div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em", color: "var(--fg)" }}>
              {titles.title}
            </h1>
            <div style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fg-muted)" }}>
              {mode === "signin" ? "Use your work account, or email and password." :
               mode === "signup" ? "Invite only during beta. We'll reach out within a day." :
               "Enter your email and we'll send a link to reset your password."}
            </div>

            {mode !== "forgot" && (
              <div style={{ marginTop: 24, display: "grid", gap: 8 }}>
                <SsoButton provider="google"    onClick={() => onApp("avery@dehyl.ca")}/>
                <SsoButton provider="microsoft" onClick={() => onApp("avery@dehyl.ca")}/>
                <SsoButton provider="okta"      onClick={() => onApp("avery@dehyl.ca")}/>
              </div>
            )}

            {mode !== "forgot" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 18px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.1em" }}>OR EMAIL</div>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); onApp(email || "avery@dehyl.ca"); }} style={{ display: "grid", gap: 10, marginTop: mode === "forgot" ? 24 : 0 }}>
              {mode === "signup" && (
                <input placeholder="Work email" type="email" required
                  style={{ padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)",
                    fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", outline: "none" }}/>
              )}
              <input placeholder="you@property.co" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)",
                  fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", outline: "none" }}/>
              {mode !== "forgot" && (
                <input placeholder="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  style={{ padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)",
                    fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", outline: "none" }}/>
              )}
              <Btn type="submit" variant="primary" size="md" iconRight={<Icon.ArrowRight size={13}/>}>{titles.cta}</Btn>
            </form>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)" }}>
              {mode === "signin" && <>
                <button onClick={() => setMode("forgot")} style={{ background: 0, border: 0, color: "var(--fg-muted)", cursor: "pointer", fontSize: 12 }}>Forgot password?</button>
                <button onClick={() => setMode("signup")} style={{ background: 0, border: 0, color: "var(--fg)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Need an account?</button>
              </>}
              {mode === "signup" && <>
                <span>Already have access?</span>
                <button onClick={() => setMode("signin")} style={{ background: 0, border: 0, color: "var(--fg)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Sign in</button>
              </>}
              {mode === "forgot" && <>
                <span>Remember it?</span>
                <button onClick={() => setMode("signin")} style={{ background: 0, border: 0, color: "var(--fg)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Back to sign in</button>
              </>}
            </div>
          </div>
        </div>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
          DEHYL · OPERATIONS OS · SOC 2 TYPE II
        </div>
      </div>

      {/* Right: editorial panel */}
      <div style={{ background: "var(--fg)", color: "#FAFAFA", padding: "48px 56px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
          FIELD NOTE · 17 APR 2026 · 02:14 AM
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <blockquote style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 36, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#FAFAFA", maxWidth: 520 }}>
            "Woke up to a solved ticket and a vendor on-site. This is the first tool that actually <span style={{ color: "var(--accent)" }}>earns its seat at the table</span>."
          </blockquote>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, color: "#FAFAFA" }}>MR</div>
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>Marco Reyes</div>
            <div style={{ marginTop: 2, fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Ops Lead · Atlas Cold Storage · ATL-02</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingScreen, LoginScreen });

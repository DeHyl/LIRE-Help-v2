// LIRE Help — Shell: Sidebar + Topbar + Command palette

const { useState: useStateS, useEffect: useEffectS } = React;

function Sidebar({ active, onNav, counts, user, collapsed, onToggleCollapsed }) {
  const items = [
    { k: "dashboard",  label: "Dashboard",  icon: <Icon.Gauge size={16}/> },
    { k: "inbox",      label: "Inbox",      icon: <Icon.Inbox size={16}/>, badge: counts.inbox },
    { k: "channels",   label: "Channels",   icon: <Icon.Plug size={16}/> },
    { k: "concierge",  label: "Concierge",  icon: <Icon.Sparkles size={16}/> },
    { k: "properties", label: "Properties", icon: <Icon.Warehouse size={16}/> },
    { k: "compliance", label: "Compliance", icon: <Icon.Shield size={16}/>, badge: counts.compliance },
    { k: "vendors",    label: "Vendors",    icon: <Icon.Hammer size={16}/> },
    { k: "library",    label: "Library",    icon: <Icon.FileText size={16}/> },
  ];

  if (collapsed) {
    return (
      <aside style={{
        width: 56, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", height: "100%",
      }}>
        <button onClick={onToggleCollapsed} title="Expand navigation" style={{
          height: 64, border: 0, background: "transparent", cursor: "pointer",
          borderBottom: "1px solid var(--border)",
          display: "grid", placeItems: "center",
        }}>
          <div style={{
            width: 26, height: 26, background: "var(--fg)", color: "var(--accent)",
            borderRadius: 3, display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, letterSpacing: "-0.03em",
          }}>L</div>
        </button>
        <nav style={{ padding: "10px 0", flex: 1 }}>
          {items.map(it => {
            const isActive = active === it.k;
            return (
              <button key={it.k} onClick={() => onNav(it.k)} title={it.label}
                style={{
                  width: 56, height: 42, border: 0, cursor: "pointer",
                  background: isActive ? "var(--fg)" : "transparent",
                  color: isActive ? "#FAFAFA" : "var(--fg-muted)",
                  display: "grid", placeItems: "center", position: "relative",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--fg)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--fg-muted)"; }}
              >
                <span style={{ color: isActive ? "var(--accent)" : "inherit", display: "inline-flex" }}>{it.icon}</span>
                {it.badge ? <span style={{
                  position: "absolute", top: 6, right: 12,
                  minWidth: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                }}/> : null}
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: 10, display: "grid", placeItems: "center" }}>
          <div title={user?.email || "Guest"} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--fg)",
          }}>{(user?.initials) || "•"}</div>
        </div>
      </aside>
    );
  }
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 26, height: 26, background: "var(--fg)", color: "var(--accent)",
              borderRadius: 3, display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, letterSpacing: "-0.03em",
            }}>L</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: "var(--fg)" }}>
              LIRE Help
            </div>
          </div>
          <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
            DEHYL · OPERATIONS OS
          </div>
        </div>
        <Btn size="icon" variant="ghost" title="Collapse navigation" onClick={onToggleCollapsed} icon={<Icon.PanelLeft size={14}/>}/>
      </div>

      <nav style={{ padding: "14px 8px", flex: 1, overflow: "auto" }}>
        {items.map((it) => {
          const isActive = active === it.k;
          return (
            <button key={it.k} onClick={() => onNav(it.k)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", border: 0, borderRadius: 4, cursor: "pointer",
                background: isActive ? "var(--fg)" : "transparent",
                color: isActive ? "#FAFAFA" : "var(--fg)",
                fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
                textAlign: "left", transition: "all 120ms var(--ease)",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: isActive ? "var(--accent)" : "var(--fg-muted)", display: "inline-flex" }}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge ? <Num size={11} weight={500} color={isActive ? "#FAFAFA" : "var(--fg-muted)"}>{it.badge}</Num> : null}
            </button>
          );
        })}

        <div style={{ height: 1, background: "var(--border)", margin: "16px 10px 12px" }}/>
        <Eyebrow style={{ padding: "0 10px 8px" }}>Portfolio</Eyebrow>
        {[
          { k: "ATL-02", label: "Atlas Cold Storage" },
          { k: "NST-14", label: "Northstar Logistics" },
          { k: "FGD-07", label: "FreightGrid" },
          { k: "PAC-09", label: "PacRim Distribution" },
        ].map((p) => (
          <button key={p.k} onClick={() => onNav("properties")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "6px 10px", border: 0, borderRadius: 4, cursor: "pointer",
              background: "transparent", textAlign: "left",
              fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Num size={10} color="var(--fg-subtle)">{p.k}</Num>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--surface-2)", border: "1px solid var(--border)",
          display: "grid", placeItems: "center",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--fg)",
        }}>{(user?.initials) || "•"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name || "Guest"}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email || "Not signed in"}
          </div>
        </div>
        <Btn size="icon" variant="ghost" title="Settings" icon={<Icon.Settings size={14}/>}/>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, action, onThemeToggle, theme, onOpenCmd, focusMode, onToggleFocus }) {
  return (
    <header style={{
      height: 56, flexShrink: 0, borderBottom: "1px solid var(--border)",
      background: "var(--surface)", display: "flex", alignItems: "center",
      padding: "0 20px", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: "var(--fg-subtle)" }}><Icon.ChevronRight size={14}/></span>}
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: i === crumbs.length-1 ? 600 : 400,
              color: i === crumbs.length-1 ? "var(--fg)" : "var(--fg-muted)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <button onClick={onOpenCmd} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4,
        height: 32, padding: "0 10px", cursor: "pointer",
        fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fg-muted)",
      }}>
        <Icon.Search size={14}/>
        <span>Jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Btn size="sm" variant={focusMode ? "dark" : "ghost"} title="Focus mode — collapse side panels" onClick={onToggleFocus}
        icon={<Icon.Maximize size={12}/>}>
        {focusMode ? "Exit focus" : "Focus"}
      </Btn>
      <Btn size="icon" variant="ghost" title="Toggle theme" onClick={onThemeToggle}
        icon={theme === "dark" ? <Icon.Sun size={14}/> : <Icon.Moon size={14}/>}/>
      <Btn size="icon" variant="ghost" title="Alerts" icon={<Icon.Bell size={14}/>}/>
      {action}
    </header>
  );
}

// ---------- Command palette ----------
function CommandPalette({ open, onClose, onNavigate, onOpenTicket, onNewTicket, tickets, properties }) {
  const [q, setQ] = useStateS("");
  useEffectS(() => { if (!open) setQ(""); }, [open]);

  const commands = [
    { key: "go-dashboard",  label: "Go to Dashboard",  hint: "G D",  kind: "nav", action: () => onNavigate("dashboard") },
    { key: "go-inbox",      label: "Go to Inbox",      hint: "G I",  kind: "nav", action: () => onNavigate("inbox") },
    { key: "go-properties", label: "Go to Properties", hint: "G P",  kind: "nav", action: () => onNavigate("properties") },
    { key: "go-compliance", label: "Go to Compliance", hint: "G C",  kind: "nav", action: () => onNavigate("compliance") },
    { key: "new-ticket",    label: "New ticket",       hint: "N",    kind: "action", action: () => onNewTicket && onNewTicket() },
    { key: "dispatch",      label: "Dispatch vendor",  hint: "",     kind: "action" },
  ];

  const results = [];
  const needle = q.trim().toLowerCase();
  if (needle) {
    commands.forEach(c => { if (c.label.toLowerCase().includes(needle)) results.push({ ...c, group: "Commands" }); });
    tickets.forEach(t => {
      if (t.id.toLowerCase().includes(needle) || t.subject.toLowerCase().includes(needle))
        results.push({ key: t.id, label: t.subject, hint: t.id, kind: "ticket", group: "Tickets", action: () => onOpenTicket(t.id) });
    });
    properties.forEach(p => {
      if (p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle))
        results.push({ key: p.id, label: p.name, hint: p.code, kind: "prop", group: "Properties", action: () => onNavigate("properties") });
    });
  } else {
    commands.forEach(c => results.push({ ...c, group: "Commands" }));
  }

  const groups = {};
  results.forEach(r => { (groups[r.group] ||= []).push(r); });

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.6)", zIndex: 100,
      display: "grid", placeItems: "start center", padding: "14vh 16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(640px, 100%)", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 6,
        boxShadow: "var(--shadow-menu)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <Icon.Command size={16} color="var(--fg-muted)"/>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search tickets, properties, commands…"
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}
            style={{ flex: 1, border: 0, outline: "none", background: "transparent",
              fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fg)" }}/>
          <Kbd>ESC</Kbd>
        </div>
        <div style={{ maxHeight: "50vh", overflow: "auto", padding: "6px 0" }}>
          {Object.keys(groups).length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>No results</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <Eyebrow style={{ padding: "10px 16px 4px", color: "var(--fg-subtle)" }}>{group}</Eyebrow>
              {items.map(r => (
                <button key={r.key} onClick={() => { r.action && r.action(); onClose(); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 16px", border: 0, background: "transparent", cursor: "pointer",
                    fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "var(--fg-muted)" }}>
                    {r.kind === "ticket" ? <Icon.Inbox size={14}/> : r.kind === "prop" ? <Icon.Warehouse size={14}/> : <Icon.ArrowRight size={14}/>}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  {r.hint && <Num size={11} color="var(--fg-subtle)">{r.hint}</Num>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- New ticket modal ----------
function NewTicketModal({ open, onClose, onCreate, properties, user }) {
  const [channel, setChannel] = useStateS("email");
  const [property, setProperty] = useStateS(properties[0]?.id || "");
  const [name, setName] = useStateS("");
  const [company, setCompany] = useStateS("");
  const [subject, setSubject] = useStateS("");
  const [body, setBody] = useStateS("");
  const [priority, setPriority] = useStateS("medium");
  const [assignee, setAssignee] = useStateS("ai");
  const [tagsRaw, setTagsRaw] = useStateS("");
  const [touched, setTouched] = useStateS(false);

  useEffectS(() => {
    if (open) {
      setChannel("email"); setProperty(properties[0]?.id || "");
      setName(""); setCompany(""); setSubject(""); setBody("");
      setPriority("medium"); setAssignee("ai"); setTagsRaw("");
      setTouched(false);
    }
  }, [open]);

  useEffectS(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const isValid = name.trim() && subject.trim() && property;

  const submit = (e) => {
    e?.preventDefault?.();
    setTouched(true);
    if (!isValid) return;
    const newId = `LIRE-${4200 + Math.floor(Math.random() * 80)}`;
    const prop = properties.find(p => p.id === property);
    const tags = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
    const ticket = {
      id: newId,
      subject: subject.trim(),
      preview: body.trim() || subject.trim(),
      channel,
      requester: { name: name.trim(), role: "", company: company.trim() || (prop?.name.split(" · ")[0] || ""), phone: "" },
      property,
      inbox: priority === "urgent" ? "Escalations" : "Maintenance",
      status: "open",
      priority,
      unread: true,
      assignee: assignee === "ai" ? "AI Concierge" : assignee === "me" ? ((user && user.name) || "You") : "",
      assigneeKind: assignee === "ai" ? "ai" : assignee === "me" ? "human" : null,
      age: "just now",
      sla: { state: "healthy", label: priority === "urgent" ? "Due in 1h" : "Due in 24h", pct: 5 },
      tags,
      views: ["priority", "all", ...(assignee === "" ? ["unassigned"] : []), ...(priority === "urgent" ? ["escalations"] : [])],
      lastActivity: "just now",
      openedAt: "Just now",
      messageCount: 1,
      category: priority === "urgent" ? "Escalation" : "Maintenance",
      responseResponsibility: "—",
    };
    const firstMsg = {
      id: `m-${Date.now()}`,
      kind: "tenant",
      who: `${name.trim()}${company.trim() ? ` · ${company.trim()}` : ""}`,
      at: "Just now",
      channel,
      body: body.trim() || subject.trim(),
    };
    onCreate(ticket, firstMsg);
  };

  const CHANNELS = [
    { k: "email",    l: "Email" },
    { k: "whatsapp", l: "WhatsApp" },
    { k: "sms",      l: "SMS" },
    { k: "phone",    l: "Phone log" },
    { k: "walk",     l: "Walk-in" },
  ];
  const PRIORITIES = [
    { k: "low",     l: "Low" },
    { k: "medium",  l: "Medium" },
    { k: "high",    l: "High" },
    { k: "urgent",  l: "Urgent" },
  ];
  const ASSIGNEES = [
    { k: "ai",   l: "AI Concierge" },
    { k: "me",   l: (user && user.name && user.name !== "Guest") ? `Me (${user.name.split(" ")[0]})` : "Me" },
    { k: "",     l: "Unassigned" },
  ];

  const labelStyle = { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, display: "block" };
  const fieldStyle = {
    width: "100%", padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 4,
    background: "var(--surface)", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)", outline: "none",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.55)", zIndex: 110,
      display: "grid", placeItems: "start center", padding: "6vh 16px",
    }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
        width: "min(720px, 100%)", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 6,
        boxShadow: "var(--shadow-menu)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "88vh",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon.Plus size={14} color="var(--accent)"/>
          <div style={{ flex: 1 }}>
            <Eyebrow style={{ fontSize: 10 }}>Create</Eyebrow>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--fg)", marginTop: 1, letterSpacing: "-0.01em" }}>New ticket</div>
          </div>
          <Kbd>ESC</Kbd>
          <Btn size="icon" variant="ghost" onClick={onClose} icon={<Icon.X size={13}/>} type="button"/>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", overflow: "auto", display: "grid", gap: 14 }}>
          {/* Channel */}
          <div>
            <label style={labelStyle}>Channel</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {CHANNELS.map(c => (
                <button key={c.k} type="button" onClick={() => setChannel(c.k)}
                  style={{
                    padding: "6px 11px", borderRadius: 3, cursor: "pointer",
                    border: channel === c.k ? "1px solid var(--fg)" : "1px solid var(--border)",
                    background: channel === c.k ? "var(--fg)" : "var(--surface)",
                    color: channel === c.k ? "#FAFAFA" : "var(--fg)",
                    fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500,
                  }}>{c.l}</button>
              ))}
            </div>
          </div>

          {/* Requester + property */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Requester name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marco Reyes"
                style={{ ...fieldStyle, borderColor: touched && !name.trim() ? "var(--danger)" : "var(--border)" }}/>
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Atlas Cold Storage" style={fieldStyle}/>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Property *</label>
            <select value={property} onChange={e => setProperty(e.target.value)} style={{ ...fieldStyle, appearance: "none", cursor: "pointer", backgroundImage: "none" }}>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name} · {p.city}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="One-line summary of the issue"
              style={{ ...fieldStyle, borderColor: touched && !subject.trim() ? "var(--danger)" : "var(--border)" }}/>
          </div>

          {/* Body */}
          <div>
            <label style={labelStyle}>First message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="Describe the request as the tenant reported it…"
              style={{ ...fieldStyle, resize: "vertical", minHeight: 80, lineHeight: 1.5 }}/>
          </div>

          {/* Priority + Assignee */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ display: "flex", gap: 4 }}>
                {PRIORITIES.map(p => {
                  const isActive = priority === p.k;
                  const urgentActive = p.k === "urgent" && isActive;
                  return (
                    <button key={p.k} type="button" onClick={() => setPriority(p.k)}
                      style={{
                        flex: 1, padding: "7px 8px", borderRadius: 3, cursor: "pointer",
                        border: isActive ? "1px solid var(--fg)" : "1px solid var(--border)",
                        background: urgentActive ? "var(--accent)" : isActive ? "var(--fg)" : "var(--surface)",
                        color: isActive ? "#FAFAFA" : "var(--fg)",
                        fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500,
                      }}>{p.l}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Assign</label>
              <div style={{ display: "flex", gap: 4 }}>
                {ASSIGNEES.map(a => (
                  <button key={a.k} type="button" onClick={() => setAssignee(a.k)}
                    style={{
                      flex: 1, padding: "7px 8px", borderRadius: 3, cursor: "pointer",
                      border: assignee === a.k ? "1px solid var(--fg)" : "1px solid var(--border)",
                      background: assignee === a.k ? "var(--fg)" : "var(--surface)",
                      color: assignee === a.k ? "#FAFAFA" : "var(--fg)",
                      fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500,
                    }}>{a.l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags <span style={{ color: "var(--fg-subtle)", fontSize: 10, textTransform: "none", letterSpacing: 0 }}>— comma separated</span></label>
            <input value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} placeholder="e.g. HVAC, after-hours, dock-4" style={fieldStyle}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-2)",
                      display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--fg-muted)" }}>
            {assignee === "ai"
              ? <>Concierge will triage, draft a first response, and queue for your approval.</>
              : assignee === "me"
                ? <>Assigned to you. Concierge will still surface relevant context.</>
                : <>Unassigned — will land in the Unassigned queue.</>}
          </div>
          <Btn variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" type="submit" iconRight={<Icon.ArrowRight size={12}/>}>Create ticket</Btn>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, CommandPalette, NewTicketModal });

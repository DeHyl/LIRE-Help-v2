// LIRE Help — demo data for Ari investor demo.
// Industrial-flavored tickets, properties, vendors, tenants, compliance.

const LIRE_DATA = (function() {

  const properties = [
    { id: "p-001", code: "ATL-02", name: "Atlas Cold Storage · Dock 4", city: "Joliet, IL", sqft: 420000, tenants: 3, units: 12 },
    { id: "p-002", code: "NST-14", name: "Northstar Logistics Park",    city: "Laredo, TX",  sqft: 680000, tenants: 5, units: 22 },
    { id: "p-003", code: "FGD-07", name: "FreightGrid Distribution",    city: "Fontana, CA", sqft: 315000, tenants: 2, units: 8  },
    { id: "p-004", code: "PKY-21", name: "Peak Yard Industrial",        city: "Reno, NV",    sqft: 240000, tenants: 4, units: 14 },
    { id: "p-005", code: "PAC-09", name: "PacRim Distribution Ctr.",    city: "Tacoma, WA",  sqft: 510000, tenants: 3, units: 18 },
    { id: "p-006", code: "GLX-03", name: "Gulf Exchange Flex",          city: "Houston, TX", sqft: 185000, tenants: 6, units: 10 },
  ];

  const vendors = [
    { id: "v-001", name: "Sentinel HVAC",       trade: "HVAC & Refrigeration", sla: "2h on-site",  rating: 4.8, dispatched: 47 },
    { id: "v-002", name: "Westbound Electric",  trade: "Electrical",           sla: "4h on-site",  rating: 4.6, dispatched: 23 },
    { id: "v-003", name: "ProDock Repair",      trade: "Dock Doors & Levelers",sla: "90m on-site", rating: 4.9, dispatched: 61 },
    { id: "v-004", name: "RedLine Fire Services",trade:"Fire / Sprinkler",     sla: "Same-day",    rating: 4.7, dispatched: 18 },
    { id: "v-005", name: "Metro Roofing Co.",   trade: "Roofing",              sla: "24h",         rating: 4.5, dispatched: 9  },
  ];

  const views = [
    { key: "priority",   label: "Priority",         section: "default", count: 4, desc: "Urgent and at-risk" },
    { key: "unassigned", label: "Unassigned",       section: "default", count: 2, desc: "Needs an owner" },
    { key: "escalations",label: "Escalations",      section: "default", count: 2, desc: "Requires judgment" },
    { key: "all",        label: "All open",         section: "default", count: 6, desc: "Every thread" },
    { key: "ch-email",   label: "Email",            section: "channels",count: 2, channel: "email" },
    { key: "ch-whatsapp",label: "WhatsApp",         section: "channels",count: 2, channel: "whatsapp" },
    { key: "ch-sms",     label: "SMS (Twilio)",     section: "channels",count: 1, channel: "sms" },
    { key: "ch-zoom",    label: "Zoom",             section: "channels",count: 0, channel: "zoom" },
    { key: "ch-slack",   label: "Slack",            section: "channels",count: 0, channel: "slack", offline: true },
    { key: "ch-messenger",label:"Messenger",        section: "channels",count: 0, channel: "messenger", offline: true },
    { key: "maintenance",label: "Maintenance",      section: "teams",   count: 3, desc: "HVAC, dock, plumbing" },
    { key: "compliance", label: "Lease & Compliance",section:"teams",   count: 2, desc: "Renewals, COI, permits" },
    { key: "afterhours", label: "After-hours",      section: "teams",   count: 1, desc: "Overnight autonomous" },
    { key: "resolved",   label: "Resolved today",   section: "saved",   count: 3, desc: "Closed in last 24h" },
  ];

  // Communication channels hub
  const channels = [
    { key:"email",     label:"Email",          address:"help@lire.io",                connected:true,  open:2, resolved24h:5,  aiResolvedPct:76, volumeTrend:[3,4,6,5,7,8,9], stack:"SMTP · IMAP" },
    { key:"whatsapp",  label:"WhatsApp",       address:"+1 (415) 555-0197",           connected:true,  open:2, resolved24h:4,  aiResolvedPct:91, volumeTrend:[2,3,4,5,7,6,8], stack:"WhatsApp Business API" },
    { key:"sms",       label:"SMS",            address:"+1 (415) 555-0120",           connected:true,  open:1, resolved24h:3,  aiResolvedPct:88, volumeTrend:[1,2,2,3,3,4,3], stack:"Twilio" },
    { key:"zoom",      label:"Zoom",           address:"lire-ops.zoom.us",            connected:true,  open:0, resolved24h:2,  aiResolvedPct:0,  volumeTrend:[0,0,1,0,1,2,1], stack:"Zoom Phone · Meetings" },
    { key:"slack",     label:"Slack",          address:"Not connected",               connected:false, open:0, resolved24h:0,  aiResolvedPct:0,  volumeTrend:[0,0,0,0,0,0,0], stack:"Slack Connect" },
    { key:"messenger", label:"Messenger",      address:"Not connected",               connected:false, open:0, resolved24h:0,  aiResolvedPct:0,  volumeTrend:[0,0,0,0,0,0,0], stack:"Meta Business" },
  ];

  // 6 tickets covering the mix
  const tickets = [
    {
      id: "LIRE-4184",
      subject: "Dock 4 compressor completely down — perishables arriving 5 AM",
      preview: "Dock 4 compressor is completely down. We have perishables arriving at 5 AM. This is urgent.",
      channel: "whatsapp",
      requester: { name: "Marco Reyes", role: "Ops Lead", company: "Atlas Cold Storage", phone: "+1 (815) 555-0114" },
      property: "p-001",
      inbox: "Escalations",
      status: "open",
      priority: "urgent",
      unread: true,
      assignee: "AI Concierge",
      assigneeKind: "ai",
      age: "14m",
      sla: { state: "at_risk", label: "28 min to breach", pct: 72 },
      tags: ["HVAC", "refrigeration", "after-hours"],
      views: ["priority", "unassigned", "escalations", "all", "maintenance", "afterhours"],
      lastActivity: "2m ago",
      openedAt: "02:14 AM",
      messageCount: 6,
      category: "Maintenance · Refrigeration",
      responseResponsibility: "Landlord (per Sec. 8.2)",
    },
    {
      id: "LIRE-4181",
      subject: "April lease renewal — rent escalation confirmation",
      preview: "Our LOI expires Friday. Need the updated pricing grid with the 3.2% bump and the confirmation your team will handle the ADA parking repaint.",
      channel: "email",
      requester: { name: "Maya Chen", role: "VP Real Estate", company: "Northstar Logistics", phone: "+1 (956) 555-0122" },
      property: "p-002",
      inbox: "Lease & Compliance",
      status: "open",
      priority: "high",
      unread: true,
      assignee: "Avery Kim",
      assigneeKind: "human",
      age: "3h",
      sla: { state: "healthy", label: "Due Fri 5:00 PM", pct: 28 },
      tags: ["renewal", "pricing", "VIP"],
      views: ["priority", "all", "compliance"],
      lastActivity: "18m ago",
      openedAt: "Yesterday 4:41 PM",
      messageCount: 11,
      category: "Lease · Renewal",
      responseResponsibility: "Commercial Ops",
    },
    {
      id: "LIRE-4179",
      subject: "Sprinkler 5-year certification test scheduling",
      preview: "Annual backflow + 5-yr internal inspection due by April 30. Please coordinate with RedLine and our facilities team.",
      channel: "email",
      requester: { name: "Priya Nair", role: "Facilities Manager", company: "FreightGrid", phone: "+1 (909) 555-0180" },
      property: "p-003",
      inbox: "Lease & Compliance",
      status: "pending",
      priority: "medium",
      unread: false,
      assignee: "AI Concierge",
      assigneeKind: "ai",
      age: "1d",
      sla: { state: "healthy", label: "Due Apr 30", pct: 40 },
      tags: ["fire", "sprinkler", "compliance"],
      views: ["priority", "all", "compliance", "maintenance"],
      lastActivity: "1h ago",
      openedAt: "Apr 16, 9:22 AM",
      messageCount: 4,
      category: "Compliance · Fire / Life Safety",
      responseResponsibility: "Landlord",
    },
    {
      id: "LIRE-4176",
      subject: "Loading bay door 7 — seal leaking, water pooling inside",
      preview: "Bay 7 weather seal has detached on the right side. Water came in during last night's storm. We swept but need proper repair.",
      channel: "sms",
      requester: { name: "James O'Brien", role: "Shift Supervisor", company: "PacRim Distribution", phone: "+1 (253) 555-0147" },
      property: "p-005",
      inbox: "Maintenance",
      status: "open",
      priority: "high",
      unread: false,
      assignee: null,
      assigneeKind: null,
      age: "2h",
      sla: { state: "healthy", label: "4h to first response", pct: 45 },
      tags: ["dock", "weather-seal"],
      views: ["priority", "unassigned", "all", "maintenance"],
      lastActivity: "38m ago",
      openedAt: "Today 6:12 AM",
      messageCount: 3,
      category: "Maintenance · Dock / Envelope",
      responseResponsibility: "Landlord (per Sec. 6.4)",
    },
    {
      id: "LIRE-4172",
      subject: "Gate access code rotation — new PIN for night crew",
      preview: "Night crew rotating this Sunday. Need the property-side gate code changed and new credentials issued for 8 team members.",
      channel: "whatsapp",
      requester: { name: "Noah Patel", role: "Site Manager", company: "Peak Yard", phone: "+1 (775) 555-0109" },
      property: "p-004",
      inbox: "Support",
      status: "open",
      priority: "low",
      unread: false,
      assignee: "Jordan Lee",
      assigneeKind: "human",
      age: "5h",
      sla: { state: "healthy", label: "Routine", pct: 20 },
      tags: ["access", "routine"],
      views: ["all"],
      lastActivity: "1h ago",
      openedAt: "Today 8:30 AM",
      messageCount: 5,
      category: "Access · Credentials",
      responseResponsibility: "Property mgmt",
    },
    {
      id: "LIRE-4168",
      subject: "COI expiration — General Liability lapses in 11 days",
      preview: "Tenant certificate of insurance for Gulf Exchange lapses Apr 28. Requesting refreshed COI with updated limits per Sec. 14.",
      channel: "email",
      requester: { name: "LIRE Compliance Bot", role: "Portfolio Intelligence", company: "LIRE Help", phone: "—" },
      property: "p-006",
      inbox: "Lease & Compliance",
      status: "open",
      priority: "medium",
      unread: false,
      assignee: "AI Concierge",
      assigneeKind: "ai",
      age: "11d (15-day trigger)",
      sla: { state: "healthy", label: "Escalation stage 2/4", pct: 50 },
      tags: ["COI", "insurance", "auto-escalation"],
      views: ["all", "compliance"],
      lastActivity: "2h ago",
      openedAt: "Apr 7 (60-day trigger)",
      messageCount: 8,
      category: "Compliance · Insurance",
      responseResponsibility: "Tenant",
    },
  ];

  // Conversation timelines
  const timelines = {
    "LIRE-4184": [
      { id: "m1", kind: "customer", who: "Marco Reyes · Atlas Cold Storage", channel: "WhatsApp", at: "02:14 AM",
        body: "Dock 4 compressor is completely down. We have perishables arriving at 5 AM. This is urgent." },
      { id: "m2", kind: "ai", who: "LIRE Concierge", at: "02:14 AM",
        body: "Acknowledged, Marco. I see the unit on the lease as landlord-maintained (Sec. 8.2). I'm paging the on-call refrigeration vendor now. Expected ETA window will come through in 2–3 minutes.",
        meta: "Auto-classified · Refrigeration · Urgent · Matched lease Sec. 8.2" },
      { id: "m3", kind: "system", who: "Workflow", at: "02:15 AM",
        body: "Dispatched to Sentinel HVAC (primary, 24/7). Secondary queued: ThermoCore Services.",
        meta: "Escalation ladder engaged" },
      { id: "m4", kind: "ai", who: "LIRE Concierge", at: "02:17 AM",
        body: "Sentinel technician Rafael G. confirmed. On the road, ETA 4:30 AM. I've shared the gate code, the compressor model number, and the site map. SLA protected for your 5 AM inbound.",
        meta: "Vendor confirmed · ETA 4:30 AM" },
      { id: "m5", kind: "customer", who: "Marco Reyes · Atlas Cold Storage", channel: "WhatsApp", at: "02:19 AM",
        body: "Perfect. We're standing by." },
      { id: "m6", kind: "internal", who: "Flagged for review · Avery Kim", at: "02:21 AM",
        body: "AI handled end-to-end. Flagging for your 7 AM summary — this is the 3rd Sentinel dispatch at ATL-02 this month; recommend root-cause review on that compressor.",
        meta: "Concierge → Human handoff (informational)" },
    ],
    "LIRE-4181": [
      { id: "m1", kind: "customer", who: "Maya Chen · Northstar Logistics", channel: "Email", at: "Yesterday 4:41 PM",
        body: "Avery — our LOI expires Friday. We need the updated pricing grid with the 3.2% bump and confirmation your team handles the ADA parking repaint before signing." },
      { id: "m2", kind: "ai", who: "LIRE Concierge", at: "Yesterday 4:42 PM",
        body: "Pulled lease summary, current escalation schedule, and the ADA scope from the 2023 site audit. Draft reply prepared below for Avery's review.",
        meta: "Context gathered · Draft ready" },
      { id: "m3", kind: "teammate", who: "Avery Kim · Commercial Ops", at: "Yesterday 5:10 PM",
        body: "Pricing grid sent. Still need finance to confirm the repaint is inside our CapEx budget before I commit in writing." },
      { id: "m4", kind: "internal", who: "Avery Kim (note)", at: "Today 1:48 PM",
        body: "Finance approved repaint yesterday. Sending final confirmation tomorrow morning before the Friday deadline." },
    ],
    "LIRE-4179": [
      { id: "m1", kind: "customer", who: "Priya Nair · FreightGrid", channel: "Email", at: "Apr 16 9:22 AM",
        body: "Annual backflow + 5-yr internal sprinkler inspection due by April 30. Please coordinate with RedLine and our facilities team." },
      { id: "m2", kind: "ai", who: "LIRE Concierge", at: "Apr 16 9:23 AM",
        body: "Checked RedLine's availability. Offering three windows: Apr 22 AM, Apr 24 PM, Apr 29 AM. Sending to Priya and RedLine for mutual confirmation.",
        meta: "Vendor coordination in flight" },
      { id: "m3", kind: "customer", who: "Priya Nair · FreightGrid", at: "Apr 16 11:10 AM",
        body: "Apr 24 PM works for us." },
      { id: "m4", kind: "system", who: "Workflow", at: "Apr 16 11:12 AM",
        body: "Apr 24 PM confirmed. Calendar holds set for Priya, RedLine, and on-site FM. Certification deadline tracked.",
        meta: "Booked" },
    ],
    "LIRE-4176": [
      { id: "m1", kind: "customer", who: "James O'Brien · PacRim", channel: "SMS", at: "Today 6:12 AM",
        body: "Bay 7 weather seal has detached on the right side. Water came in during last night's storm. We swept but need proper repair." },
      { id: "m2", kind: "ai", who: "LIRE Concierge", at: "Today 6:13 AM",
        body: "Acknowledged. Classified as landlord responsibility per lease Sec. 6.4. ProDock has a 90-minute on-site SLA. Draft dispatch prepared — awaiting human triage because this is the 2nd seal failure at PAC-09 this quarter.",
        meta: "Held for human review · repeat issue" },
      { id: "m3", kind: "system", who: "Workflow", at: "Today 6:14 AM",
        body: "Routed to Maintenance queue, unassigned. Priority: high.",
        meta: "Held for triage" },
    ],
    "LIRE-4172": [
      { id: "m1", kind: "customer", who: "Noah Patel · Peak Yard", channel: "WhatsApp", at: "Today 8:30 AM",
        body: "Night crew rotating this Sunday. Need the property-side gate code changed and new credentials issued for 8 team members." },
      { id: "m2", kind: "teammate", who: "Jordan Lee", at: "Today 8:42 AM",
        body: "On it. Generating new PIN, I'll push the code change Saturday evening and distribute credentials Sunday AM." },
      { id: "m3", kind: "ai", who: "LIRE Concierge", at: "Today 8:43 AM",
        body: "Property KB updated: gate code rotation scheduled Sat 8:00 PM, 8 new credentials queued. Old code expires Sunday 6:00 AM.",
        meta: "Knowledge base updated" },
    ],
    "LIRE-4168": [
      { id: "m1", kind: "system", who: "LIRE Compliance Timeline", at: "Apr 7 · 60-day trigger",
        body: "COI for Gulf Exchange Flex expires Apr 28. Initial audit sent to tenant AP contact.",
        meta: "Stage 1 of 4" },
      { id: "m2", kind: "ai", who: "LIRE Concierge", at: "Apr 13 · 30-day trigger",
        body: "Automated document request sent to AP + broker. No response yet.",
        meta: "Stage 2 of 4" },
      { id: "m3", kind: "ai", who: "LIRE Concierge", at: "Today · 15-day trigger",
        body: "Escalation to broker of record. Broker acknowledged and committed to delivery by Apr 20.",
        meta: "Stage 3 of 4 — on track" },
    ],
  };

  // Compliance ladder items for Compliance screen
  const compliance = [
    { id:"cx-01", property:"p-006", title:"COI — Gulf Exchange Flex",    type:"Insurance",      due:"Apr 28", daysOut:11, stage:3, total:4, status:"active",   owner:"Broker of record" },
    { id:"cx-02", property:"p-003", title:"Sprinkler 5-yr certification",type:"Fire / LS",      due:"Apr 30", daysOut:13, stage:2, total:4, status:"active",   owner:"RedLine Fire" },
    { id:"cx-03", property:"p-002", title:"Lease renewal — Northstar",   type:"Lease",          due:"Apr 18", daysOut:1,  stage:4, total:4, status:"critical", owner:"Avery Kim" },
    { id:"cx-04", property:"p-001", title:"Municipal dock inspection",   type:"Municipal",      due:"May 14", daysOut:27, stage:1, total:4, status:"scheduled",owner:"AI Concierge" },
    { id:"cx-05", property:"p-004", title:"Backflow test — Peak Yard",   type:"Plumbing / LS",  due:"May 22", daysOut:35, stage:1, total:4, status:"scheduled",owner:"AI Concierge" },
    { id:"cx-06", property:"p-005", title:"Roof warranty renewal",       type:"Envelope",       due:"Jun 09", daysOut:53, stage:1, total:4, status:"scheduled",owner:"Metro Roofing" },
  ];

  // KPIs for dashboard
  const kpis = {
    openWork: 24,
    slaBreached: 0,
    slaAtRisk: 2,
    resolvedToday: 17,
    autoResolvedPct: 82,
    avgFirstResponse: "1m 14s",
    afterHoursHandled: 9,
    vendorsDispatched: 6,
    portfolio: { properties: 6, sqft: "2,350,000 sf", tenants: 23, units: 84 },
  };

  // Concierge agent config + knowledge + learning surfaces
  const concierge = {
    state: "live", // live | shadow | paused
    autonomyPct: 82,
    channelsEnabled: { email: true, whatsapp: true, sms: true, zoom: false },
    reach: [
      { who: "All tenants", status: "direct", note: "Can reach Concierge directly via any channel" },
      { who: "Atlas Cold Storage · After-hours only", status: "direct" },
      { who: "Northstar Logistics · VP contacts", status: "escalate", note: "Always route to a human first" },
    ],
    skills: [
      { key: "dispatch",   name: "Dispatcher",        desc: "Triages faults, selects vendors, confirms ETAs.", autonomous: 94 },
      { key: "compliance", name: "Compliance Officer",desc: "Tracks leases, COIs, permits; runs 4-stage escalation.", autonomous: 88 },
      { key: "leasing",    name: "Leasing Assistant", desc: "Drafts renewals, gathers signatures, never negotiates price.", autonomous: 41 },
    ],
    knowledge: [
      { key:"leases",     label:"Lease documents",          items: 23, lastIndexed:"2h ago",  covers:"All 6 properties",       icon:"FileText" },
      { key:"vendors",    label:"Vendor contracts & SLAs",  items: 14, lastIndexed:"Yesterday", covers:"12 active vendors",     icon:"Hammer" },
      { key:"tickets",    label:"Past resolved tickets",    items:1847, lastIndexed:"Continuous", covers:"Last 18 months",      icon:"Inbox" },
      { key:"compliance", label:"Compliance & permits",     items: 62, lastIndexed:"3d ago",  covers:"All 6 properties",       icon:"Shield" },
      { key:"floors",     label:"Floor plans & diagrams",   items: 18, lastIndexed:"1w ago",  covers:"5 of 6 properties",      icon:"Layers",    gap: true },
      { key:"manuals",    label:"Equipment manuals",        items: 41, lastIndexed:"4d ago",  covers:"HVAC, dock, fire, elec.",icon:"Warehouse" },
      { key:"uploads",    label:"Uploaded PDFs & docs",     items:  9, lastIndexed:"Today",   covers:"Mixed — re-tag to index",icon:"Upload" },
      { key:"slack",      label:"Slack history",            items:"—", lastIndexed:"Paused",  covers:"Awaiting re-auth",        icon:"Hash",     offline: true },
    ],
    learning: {
      plays: [
        { id:"lp-1", from:"LIRE-4172", question:"Night crew gate-code rotation", summary:"Generate 8 PINs, push to gate controller, notify tenant + security.", confidence:0.92, status:"pending" },
        { id:"lp-2", from:"LIRE-4179", question:"Sprinkler 5-yr certification",  summary:"Always coordinate RedLine + tenant facilities; 10-day notice.",      confidence:0.88, status:"pending" },
        { id:"lp-3", from:"LIRE-4168", question:"Freezer temp drift Dock 3",     summary:"Sentinel first, not GenCool — Sentinel holds the service contract.", confidence:0.96, status:"approved" },
      ],
      exemplars: [
        { id:"ex-1", ticket:"LIRE-4184", excerpt:"Confirmed Sentinel ETA and pre-shared gate code, compressor model, and site map before technician arrival.", tag:"vendor-dispatch" },
        { id:"ex-2", ticket:"LIRE-4176", excerpt:"Offered interim tarping while scheduling permanent weather-seal repair with vendor.", tag:"interim-mitigation" },
      ],
      preferences: [
        { subject:"Marco Reyes (Atlas)",       pref:"Prefers WhatsApp for urgent; email for anything written" },
        { subject:"Maya Chen (Northstar)",     pref:"Always loop in legal@northstar.co on renewal threads" },
        { subject:"FreightGrid · FGD-07",      pref:"Do not auto-dispatch before 07:00 local — tenant sleeps onsite" },
        { subject:"PacRim · Dock 7",           pref:"Weather-seal issues always escalate — history of recurrence" },
      ],
      gaps: [
        { id:"g1", question:"What's the after-hours exit procedure for the ATL-02 rail spur?", asked: 3, last:"Yesterday" },
        { id:"g2", question:"Does the FGD-07 sprinkler drain into storm or sanitary?",          asked: 2, last:"Apr 16" },
        { id:"g3", question:"Who signs off on over-$2k emergency dispatches on weekends?",      asked: 5, last:"Today" },
      ],
      weeklyDigest: {
        period: "Apr 10 — Apr 16",
        items: [
          { kind:"learned",  text:"Sentinel preferred for ATL-02 HVAC (6 matching tickets)" },
          { kind:"learned",  text:"PacRim Dock 7 seals recurrent — pre-empt with spring inspection" },
          { kind:"pending",  text:"Gate-code rotation play (92% conf.) — awaiting your review" },
          { kind:"gap",      text:"3 weekend-authorization questions unanswered — KB article suggested" },
        ],
      },
    },
    guardrails: {
      autonomyMatrix: [
        { topic:"Vendor dispatch · under $2k",      mode:"auto",     note:"Contract vendors only" },
        { topic:"Vendor dispatch · $2k–$10k",       mode:"propose",  note:"Drafts order; human approves" },
        { topic:"Vendor dispatch · over $10k",      mode:"escalate", note:"Always human-led" },
        { topic:"COI / permit reminders",           mode:"auto" },
        { topic:"Maintenance scheduling",           mode:"auto" },
        { topic:"Tenant FAQ & site info",           mode:"auto" },
        { topic:"Lease renewal drafting",           mode:"propose",  note:"Never commits pricing" },
        { topic:"Rent negotiation / disputes",      mode:"blocked",  note:"Hard no-go — always human" },
        { topic:"Legal threats / lawyer mentioned", mode:"escalate", note:"Page on-call within 60s" },
      ],
      triggers: [
        { key:"urgent-kw", label:"Keywords: urgent, emergency, flood, fire, smoke, lawyer", on:true },
        { key:"vip",       label:"VIP tenants (6 contacts flagged)", on:true },
        { key:"afterhours",label:"After-hours severity ≥ High", on:true },
        { key:"repeat",    label:"Same issue reopened within 7 days", on:true },
      ],
      nogo: [
        "Rent negotiation or concessions",
        "Lease assignment / subletting approvals",
        "Any legal or litigation-adjacent language",
        "Security-incident disclosures to non-staff",
        "Personnel matters about LIRE staff",
      ],
    },
    activity: {
      csatProxy: 94,      // derived — tenants who didn't re-open within 48h
      ttfr: "1m 14s",     // time to first response
      log: [
        { at:"02:17", kind:"action",   text:"Dispatched Sentinel HVAC to ATL-02 · Dock 4" },
        { at:"02:14", kind:"message",  text:"Replied to Marco Reyes via WhatsApp · 42s" },
        { at:"01:48", kind:"learn",    text:"Captured preference: Marco prefers WhatsApp for urgent" },
        { at:"01:02", kind:"action",   text:"Sent COI stage-3 reminder · GLX-03" },
        { at:"00:14", kind:"escalate", text:"Paged Avery — 'lawyer' mentioned in LIRE-4181" },
      ],
    },
  };

  // Document library — the raw source of truth. Concierge indexes a subset of these.
  const documents = [
    // Leases
    { id:"d-001", name:"Atlas Cold Storage — Master Lease.pdf",              type:"lease",      property:"p-001", size:"2.4 MB",  pages:47, uploadedBy:"Avery Kim",   uploadedAt:"Mar 12, 2025", indexed:"indexed",  version:"v3",  tags:["master","active"],                 freshness:"Synced 2h ago" },
    { id:"d-002", name:"ATL-02 — Dock 4 Amendment (HVAC responsibility).pdf",type:"lease",      property:"p-001", size:"680 KB", pages:6,  uploadedBy:"Avery Kim",   uploadedAt:"Aug 4, 2025",  indexed:"indexed",  version:"v1",  tags:["amendment","HVAC"],                 freshness:"Synced 2h ago" },
    { id:"d-003", name:"Northstar Logistics — Lease + LOI bundle.pdf",       type:"lease",      property:"p-002", size:"3.1 MB", pages:62, uploadedBy:"Priya Nair",  uploadedAt:"Jan 3, 2026",  indexed:"indexed",  version:"v2",  tags:["renewal-pending"],                  freshness:"Synced yesterday" },
    { id:"d-004", name:"FreightGrid — Lease.pdf",                            type:"lease",      property:"p-003", size:"1.8 MB", pages:38, uploadedBy:"Avery Kim",   uploadedAt:"Sep 19, 2024", indexed:"indexed",  version:"v1",  tags:["active"],                           freshness:"Synced 3d ago" },
    { id:"d-005", name:"PacRim — Lease + Bay exhibit.pdf",                   type:"lease",      property:"p-005", size:"2.0 MB", pages:44, uploadedBy:"Avery Kim",   uploadedAt:"Feb 11, 2025", indexed:"indexed",  version:"v1",  tags:["active"],                           freshness:"Synced 3d ago" },

    // Equipment manuals
    { id:"d-010", name:"Copeland ZR94 Compressor — Service Manual.pdf",     type:"manual",     property:"p-001", size:"12 MB",  pages:128,uploadedBy:"Rafael G.",  uploadedAt:"Feb 8, 2025",  indexed:"indexed",  version:"v1",  tags:["refrigeration","HVAC"],             freshness:"Synced 4d ago" },
    { id:"d-011", name:"Rite-Hite Dok-Lok DL-3 — Install & Maintenance.pdf",type:"manual",     property:"p-005", size:"6.2 MB", pages:64, uploadedBy:"James O'Brien",uploadedAt:"Nov 30, 2024",indexed:"indexed",  version:"v1",  tags:["dock","equipment"],                 freshness:"Synced 4d ago" },
    { id:"d-012", name:"Simplex 4100ES Fire Panel — Ops Guide.pdf",         type:"manual",     property:"p-003", size:"8.4 MB", pages:92, uploadedBy:"Priya Nair",  uploadedAt:"Oct 14, 2024", indexed:"indexed",  version:"v1",  tags:["fire","life-safety"],               freshness:"Synced 4d ago" },
    { id:"d-013", name:"Trane Centrifugal Chiller CVHE — Manual.pdf",       type:"manual",     property:"p-002", size:"14 MB",  pages:156,uploadedBy:"Maya Chen",   uploadedAt:"Jan 22, 2025", indexed:"pending",  version:"v1",  tags:["HVAC","needs-tagging"],             freshness:"Indexing queued" },

    // Vendor contracts
    { id:"d-020", name:"Sentinel HVAC — Master Service Agreement.pdf",      type:"contract",   property:null,    size:"1.2 MB", pages:18, uploadedBy:"Avery Kim",   uploadedAt:"Jan 4, 2025",  indexed:"indexed",  version:"v2",  tags:["HVAC","SLA:90m","portfolio-wide"],  freshness:"Synced yesterday" },
    { id:"d-021", name:"ProDock Systems — Dock Door SLA.pdf",               type:"contract",   property:null,    size:"740 KB", pages:9,  uploadedBy:"Avery Kim",   uploadedAt:"Mar 17, 2025", indexed:"indexed",  version:"v1",  tags:["dock","SLA:90m"],                   freshness:"Synced yesterday" },
    { id:"d-022", name:"RedLine Fire Protection — Annual Contract.pdf",     type:"contract",   property:null,    size:"520 KB", pages:7,  uploadedBy:"Priya Nair",  uploadedAt:"Apr 1, 2025",  indexed:"indexed",  version:"v1",  tags:["fire","annual"],                    freshness:"Synced yesterday" },
    { id:"d-023", name:"ThermoCore — Backup Refrigeration.pdf",             type:"contract",   property:"p-001", size:"410 KB", pages:5,  uploadedBy:"Avery Kim",   uploadedAt:"Aug 22, 2025", indexed:"indexed",  version:"v1",  tags:["refrigeration","backup"],           freshness:"Synced yesterday" },

    // Compliance / permits
    { id:"d-030", name:"ATL-02 — Sprinkler 5-yr Cert (2021).pdf",           type:"compliance", property:"p-001", size:"220 KB", pages:3,  uploadedBy:"Priya Nair",  uploadedAt:"Apr 30, 2021", indexed:"indexed",  version:"v1",  tags:["fire","expires-2026"],              freshness:"Synced 3d ago" },
    { id:"d-031", name:"NST-14 — ADA Parking Survey.pdf",                   type:"compliance", property:"p-002", size:"1.1 MB", pages:14, uploadedBy:"Avery Kim",   uploadedAt:"Nov 8, 2024",  indexed:"indexed",  version:"v1",  tags:["ADA","survey"],                     freshness:"Synced 3d ago" },
    { id:"d-032", name:"Gulf Exchange — COI 2025-2026.pdf",                 type:"compliance", property:"p-004", size:"85 KB",  pages:1,  uploadedBy:"Gulf Exchange",uploadedAt:"Apr 3, 2025", indexed:"indexed",  version:"v1",  tags:["COI","expires-Apr-29"],             freshness:"Synced 3d ago" },
    { id:"d-033", name:"PAC-09 — Storm Water Permit.pdf",                   type:"compliance", property:"p-005", size:"340 KB", pages:4,  uploadedBy:"Avery Kim",   uploadedAt:"Jun 1, 2024",  indexed:"indexed",  version:"v1",  tags:["environmental"],                    freshness:"Synced 3d ago" },

    // Floor plans
    { id:"d-040", name:"ATL-02 — Floor Plan + Dock Layout.pdf",             type:"floorplan",  property:"p-001", size:"5.6 MB", pages:8,  uploadedBy:"Avery Kim",   uploadedAt:"Feb 11, 2025", indexed:"indexed",  version:"v2",  tags:["site-plan"],                        freshness:"Synced 1w ago" },
    { id:"d-041", name:"NST-14 — Site Plan + Truck Circulation.pdf",        type:"floorplan",  property:"p-002", size:"7.1 MB", pages:6,  uploadedBy:"Maya Chen",   uploadedAt:"Oct 3, 2024",  indexed:"indexed",  version:"v1",  tags:["site-plan"],                        freshness:"Synced 1w ago" },
    { id:"d-042", name:"FGD-07 — Fire System Riser Diagram.pdf",            type:"floorplan",  property:"p-003", size:"2.2 MB", pages:2,  uploadedBy:"Priya Nair",  uploadedAt:"Dec 1, 2024",  indexed:"indexed",  version:"v1",  tags:["fire","diagram"],                   freshness:"Synced 1w ago" },
    { id:"d-043", name:"PKY-21 — Gate & Access Plan.pdf",                   type:"floorplan",  property:"p-006", size:"3.4 MB", pages:4,  uploadedBy:"Avery Kim",   uploadedAt:"Mar 1, 2025",  indexed:"not_indexed", version:"v1", tags:["access","gate"],               freshness:"Not indexed" },

    // Correspondence / uploads pending tags
    { id:"d-050", name:"Scanned punch-list from walkthrough 02/14.pdf",     type:"upload",     property:null,    size:"1.5 MB", pages:12, uploadedBy:"Avery Kim",   uploadedAt:"Feb 14, 2026", indexed:"needs_review", version:"v1", tags:["needs-tagging"],                freshness:"Awaiting review" },
    { id:"d-051", name:"Email thread — dock 7 seal history.pdf",           type:"upload",     property:"p-005", size:"220 KB", pages:9,  uploadedBy:"James O'Brien",uploadedAt:"Mar 3, 2026",  indexed:"needs_review", version:"v1", tags:["correspondence","needs-tagging"], freshness:"Awaiting review" },
    { id:"d-052", name:"Invoice bundle — Q4 2025 vendor work orders.zip",  type:"upload",     property:null,    size:"18 MB",  pages:null,uploadedBy:"Maya Chen",   uploadedAt:"Jan 8, 2026",  indexed:"not_indexed", version:"v1", tags:["invoices","archive"],          freshness:"Not indexed" },
  ];

  // Recent autonomous actions for Dashboard
  const recentActions = [
    { id:"a1", at:"02:17 AM", title:"Dispatched Sentinel HVAC", detail:"ATL-02 · Dock 4 compressor · ETA 4:30 AM", tone:"accent" },
    { id:"a2", at:"01:02 AM", title:"COI reminder stage 3 sent", detail:"GLX-03 · broker acknowledged · delivery Apr 20", tone:"active" },
    { id:"a3", at:"12:14 AM", title:"After-hours loading inquiry resolved", detail:"PKY-21 · tenant redirected to gate kiosk · KB updated", tone:"active" },
    { id:"a4", at:"Yesterday 11:48 PM", title:"Knowledge base updated", detail:"ATL-02 · new chiller model no. captured from conversation", tone:"active" },
    { id:"a5", at:"Yesterday 10:03 PM", title:"Sprinkler test booked", detail:"FGD-07 · Apr 24 PM · calendar holds pushed", tone:"active" },
  ];

  return { properties, vendors, views, channels, tickets, timelines, compliance, kpis, recentActions, concierge, documents };
})();

window.LIRE_DATA = LIRE_DATA;

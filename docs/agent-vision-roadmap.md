# Agent Vision Roadmap — Voice + Avatar + Camera

**Author:** Alejandro Dominguez / DeHyl
**Date:** April 3, 2026
**Status:** Planning — Phase 1 (Voice Input) already shipped
**Applies to:** LIRE-Help, Host-Help, XtMate

---

## The Problem

Today's chatbot interaction is text-only. When a tenant reports "the door is jammed," the AI needs 5+ messages to collect basic info:

```
Tenant: "door is jammed"
Agent:  "Which unit?"
Tenant: "4"
Agent:  "Which door — loading dock, entry, or interior?"
Tenant: "loading dock"
Agent:  "Can you describe the issue?"
... 5 messages, 3 minutes, frustrated tenant
```

## The Vision

Transform the text chatbot into a **multi-modal AI field assistant** — voice, visual avatar, and camera/vision:

```
Tenant: *opens app, points camera at jammed door*
Agent:  "I can see that's Loading Dock 3 on Unit 4. The roller mechanism
         appears stuck about 3 feet up. I'm logging this as urgent —
         Bay Area Dock Services will be dispatched. Ticket #MX-0418."
... 1 interaction, full resolution, zero friction
```

---

## Phase Plan

### Phase 1: Voice Input ✅ SHIPPED
**Effort:** 1 day | **Impact:** High | **Status:** Live on LIRE-Help + Defensores IA

- Web Speech API microphone button on chat widget
- Browser-native speech-to-text (no server cost)
- Auto-detects language (EN/ES)
- Transcript appends to input field
- Red pulse animation while listening
- Graceful fallback — mic only shows on supported browsers (Chrome, Edge, Safari)

**What's live:**
- LIRE-Help EN + ES landing page chat widgets
- Defensores IA all persona chat interfaces
- Host-Help already had mic via widget.js

---

### Phase 2: Voice Output (Text-to-Speech)
**Effort:** 2-3 days | **Impact:** High | **Cost:** $0-15/mo depending on provider

The agent SPEAKS its responses back to the user. Transforms the experience from "reading a chat" to "talking to a person."

**Option A: Browser Native TTS (Free)**
- `window.speechSynthesis.speak()` — zero cost, works offline
- Quality varies by device/OS
- Limited voice options
- Best for: MVP, demos, low-cost deployment

**Option B: ElevenLabs API ($5-22/mo)**
- Ultra-realistic voices, cloneable
- 30+ languages, accent control
- Streaming support (low latency)
- Best for: Premium experience, enterprise clients

**Option C: Play.ht / Amazon Polly ($5-15/mo)**
- Good quality, lower cost than ElevenLabs
- AWS Polly has pay-per-character pricing ($4/1M chars)
- Best for: Cost-conscious scaling

**Recommended:** Start with Browser Native TTS (free, instant), upgrade to ElevenLabs for enterprise/demo clients.

**Implementation:**
1. Add speaker icon next to each bot message
2. Click to hear the message read aloud
3. Auto-speak option (toggle in settings)
4. Stop/pause controls
5. Voice selection per agent personality

---

### Phase 3: Animated Avatar
**Effort:** 1-2 weeks | **Impact:** Medium | **Cost:** $0-50/mo

Give the AI agent a visual presence — a face/character that reacts to the conversation state.

**Three tiers:**

**Tier 1: Animated Icon (Simplest)**
- SVG icon with 3 states: idle, listening, speaking
- CSS animations (pulse, wave, glow)
- Replaces the static logo in chat header
- Effort: 2-3 days
- Cost: $0

**Tier 2: Lottie/Rive Animation**
- Character with facial expressions
- Synced to conversation state (thinking, happy, concerned)
- Smooth 60fps animations
- Effort: 1 week (design + integration)
- Cost: $0 (open-source animations) or $200-500 (custom design)

**Tier 3: Video Avatar (HeyGen / D-ID)**
- Photorealistic human face with lip-sync
- AI-generated video in real-time
- Most "wow factor" for demos
- Effort: 3-5 days integration
- Cost: $24-89/mo (HeyGen) or $5.99/mo (D-ID)
- Latency: 1-3 seconds per response

**Recommended:** Start with Tier 1 (animated icon) immediately, upgrade to Tier 2 (Lottie) for the platform, offer Tier 3 (video) as enterprise add-on.

**Per-Product Avatar:**
| Product | Avatar Style | Personality |
|---------|-------------|-------------|
| LIRE-Help | Professional building icon → animated facility manager | Efficient, knowledgeable, direct |
| Host-Help | Warm tropical character → animated host | Friendly, adventurous, personal |
| Defensores IA | Political figure silhouette → animated thinker | Passionate, intellectual, direct |
| GameTime | Sales coach icon → animated mentor | Energetic, data-driven, motivating |
| XtMate | Technical scanner → animated inspector | Precise, methodical, thorough |

---

### Phase 4: Camera + Photo Analysis
**Effort:** 1-2 weeks | **Impact:** Very High | **Cost:** ~$0.01-0.05/image (Claude Vision)

The tenant can **send a photo** or **point their camera** at the problem, and the AI sees it.

**4A: Photo Attachment (Simpler)**
- Add camera/photo button to chat widget
- User takes photo or selects from gallery
- Image sent to Claude Vision API as base64
- AI analyzes: what it sees, damage type, severity, location clues
- Combined with text context for full understanding

**Implementation:**
1. `<input type="file" accept="image/*" capture="environment">` for camera
2. Resize image client-side (max 1024px for cost efficiency)
3. Send as base64 in the chat message payload
4. Server passes to Claude API with `type: "image"` content block
5. AI responds with visual analysis + action plan

**4B: Real-Time Camera Stream (Advanced)**
- getUserMedia() for live camera feed
- Periodic frame capture (every 2-3 seconds)
- AI identifies: unit numbers (OCR), equipment type, damage
- Location awareness via GPS or QR codes on equipment
- Overlay annotations on camera view ("This is Dock 3, Unit 4")

**Location Identification Methods:**
1. **QR Codes** — stick QR codes on every dock door, unit entrance, equipment. Camera scans → instant ID. Cost: $50 for 200 QR stickers.
2. **OCR** — read unit numbers from signage. Works if signage is clear.
3. **GPS + Property Map** — tenant's GPS coordinates mapped to property layout. Works outdoors.
4. **Bluetooth Beacons** — indoor positioning. Higher accuracy, higher setup cost ($10-20/beacon).

**Recommended:** Start with 4A (photo attachment) — highest ROI, simplest. Add QR codes for instant equipment identification. Real-time stream is Phase 5.

---

### Phase 5: XtMate Engine Integration
**Effort:** 3-4 weeks | **Impact:** Game-changing | **Cost:** Variable

The convergence point — LIRE-Help's property operations + XtMate's LiDAR/damage detection.

**What this enables:**

1. **Pre-mapped Properties**
   - XtMate scans each unit with iPhone LiDAR at onboarding
   - Creates 3D model of every space, dock, hallway
   - AI knows exact dimensions, equipment locations, materials

2. **Damage Assessment in Context**
   - Tenant reports water leak → points camera
   - AI matches current view to 3D model
   - Identifies: "Water damage on north wall of Unit 7, 12ft from entrance, approximately 8 sq ft affected"
   - Auto-generates Xactimate-compatible repair estimate

3. **Before/After Comparison**
   - AI compares current camera view to baseline 3D scan
   - Detects changes: new damage, unauthorized modifications, wear patterns
   - Compliance tracking: "Sprinkler clearance violation — boxes stacked within 14 inches"

4. **Vendor Dispatch with Full Context**
   - Maintenance ticket includes: photo, 3D location, damage assessment, estimated repair cost
   - Vendor arrives with complete information — no back-and-forth
   - "Bay Area Dock Services: Dock 3, Unit 4. Roller mechanism failure at 3ft. See attached 3D markup."

**Technical Architecture:**
```
Tenant's Phone
     ↓
Camera Frame + GPS
     ↓
LIRE-Help Server
     ↓
┌─────────────┐    ┌──────────────┐
│ Claude       │    │ XtMate       │
│ Vision API   │    │ Engine       │
│ (what's      │    │ (3D model,   │
│  wrong?)     │    │  dimensions, │
│              │    │  estimates)  │
└──────┬──────┘    └──────┬───────┘
       │                   │
       └───────┬───────────┘
               ↓
        Combined Analysis
        + Repair Estimate
        + Vendor Dispatch
```

---

## Cross-Product Synergy

| Capability | LIRE-Help | Host-Help | XtMate | GameTime | Defensores IA |
|-----------|-----------|-----------|--------|----------|---------------|
| Voice In | Tenant reports | Guest asks | Adjuster narrates | SDR practices | Citizen speaks |
| Voice Out | Concierge speaks | Host personality | Scan instructions | Coaching feedback | Persona voices |
| Avatar | Facility manager | Tropical host | Inspector | Sales coach | Political figures |
| Camera | See damage | Show check-in issue | Core scanning | — | — |
| Vision AI | Identify + dispatch | Identify + resolve | Assess + estimate | — | — |
| 3D/LiDAR | Property baseline | Property baseline | Core product | — | — |

---

## Competitive Advantage

No property management platform offers this combination:
1. **AI concierge** that understands your property deeply (KB + lease data)
2. **Voice interface** so tenants don't need to type
3. **Visual AI** that can see and identify problems from photos
4. **3D property model** for precise damage assessment and repair estimates
5. **Automated dispatch** with full visual context for vendors

The closest competitors offer text chatbots. We're building a **visual AI field assistant**.

---

## Timeline Estimate

| Phase | When | Dependencies |
|-------|------|-------------|
| Phase 1: Voice Input | ✅ Done | — |
| Phase 2: Voice Output | Week of April 7 | Browser TTS = 0 deps |
| Phase 3: Animated Avatar (Tier 1) | Week of April 14 | CSS only |
| Phase 4A: Photo Attachment | Week of April 14 | Claude Vision API |
| Phase 4B: QR Code Identification | Week of April 21 | QR stickers printed |
| Phase 5: XtMate Integration | May 2026 | XtMate API ready |

---

## Cost Summary

| Component | Monthly Cost | Per-Interaction |
|-----------|-------------|-----------------|
| Voice Input (Web Speech API) | $0 | $0 |
| Voice Output (Browser TTS) | $0 | $0 |
| Voice Output (ElevenLabs) | $5-22 | ~$0.001 |
| Avatar (Animated Icon/Lottie) | $0 | $0 |
| Avatar (HeyGen Video) | $24-89 | ~$0.05 |
| Photo Analysis (Claude Vision) | Pay-per-use | ~$0.01-0.05 |
| QR Code Stickers | $50 one-time | $0 |
| XtMate Integration | Part of XtMate | Included |

**MVP cost (Phase 1-3): $0/month** (all browser-native)
**Full stack (Phase 1-5): ~$30-100/month** + per-use API costs

---

## For the Berkeley Demo (April 6)

Even without building Phases 2-5, we can **present this roadmap** as the product vision:

> "Today, your tenants text the concierge and get instant answers. Tomorrow, they point their phone at a jammed door and the AI identifies the unit, assesses the damage, and dispatches your vendor — all in one interaction. That's where LIRE-Help is going."

This positions LIRE-Help not as a chatbot, but as an **AI-powered operations platform** with a clear, buildable roadmap.

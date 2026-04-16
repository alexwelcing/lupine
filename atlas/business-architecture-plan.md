# ATLAS Business Architecture Plan
## Strategic Structuring for Dual-Jurisdiction Operation

**Status:** Planning Phase  
**Objective:** Maximize funding access while maintaining compliance, IP integrity, and personal flexibility

---

## Executive Summary

ATLAS sits at the intersection of:
- Computational materials science (potential dual-use)
- Open-source software (GPL ecosystem)
- International funding competition (US/China)
- Personal relocation requirements

The "right" structure prioritizes:
1. **Regulatory compliance** (EAR/ITAR, OFAC, export controls)
2. **IP integrity** (clear ownership chains)
3. **Funding optionality** (access to both ecosystems without contamination)
4. **Personal safety** (you and your family)
5. **Mission continuity** (ATLAS stays viable regardless of geopolitical shifts)

---

## 1. Entity Structure Options

### Option A: The "Firewall" Model (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                    HOLDING COMPANY                          │
│              (Neutral Jurisdiction: Singapore,               │
│               Switzerland, or UAE - see analysis below)      │
│                          100%                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌──────────────────────┐      ┌──────────────────────┐
│   ATLAS GLOBAL LLC   │      │   ATLAS CHINA LTD    │
│   (Delaware, USA)    │      │   (WFOE or JV)       │
│                      │      │                      │
│ • US grant funding   │      │ • Chinese funding    │
│ • US-based hires     │      │ • China operations   │
│ • US customer base   │      │ • Chinese market     │
│ • Open source core   │      │ • Local compliance   │
└──────────────────────┘      └──────────────────────┘
           │                               │
           │         ┌─────────────────────┘
           │         │
           ▼         ▼
    ┌────────────────────────┐
    │   ATLAS LABS PTE LTD   │
    │   (Singapore)          │
    │                        │
    │ • Core IP holding      │
    │ • Licensing hub        │
    │ • Neutral ground       │
    └────────────────────────┘
```

**Why this works:**
- US entity can accept US government grants, SBIR/STTR, NSF funding
- China entity can accept Chinese funding, operate under local regulations
- Singapore entity holds core IP, licenses to both subsidiaries
- Funding sources never directly mix
- You can work for any entity based on your location/visa status

### Option B: The "Open Core" Model

```
┌─────────────────────────────────────────────────────────────┐
│            ATLAS FOUNDATION (Non-profit)                    │
│            (US 501(c)(3) or similar)                        │
│                                                             │
│  • Owns open-source ATLAS codebase                          │
│  • Governance by neutral technical steering committee       │
│  • Accepts unrestricted donations from anywhere             │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌──────────────────────┐      ┌──────────────────────┐
│ ATLAS COMMERCIAL INC │      │ ATLAS CHINA COMMERCE │
│ (US - Delaware)      │      │ (China WFOE)         │
│                      │      │                      │
│ • Enterprise sales   │      │ • Enterprise sales   │
│ • Support contracts  │      │ • Support contracts  │
│ • Proprietary add-ons│      │ • Proprietary add-ons│
│ • Hosting services   │      │ • Hosting services   │
└──────────────────────┘      └──────────────────────┘
```

**Why this works:**
- Open-source core is "untouchable" by any funder
- Commercial entities compete in their respective markets
- Foundation ensures long-term sustainability
- Cleanest for optics but limits revenue capture

### Option C: The "Personal Holding" Model

```
┌─────────────────────────────────────────────────────────────┐
│                    YOU (Person)                             │
│                                                             │
│  • Consulting agreements with multiple entities             │
│  • IP assignment to chosen vehicle                          │
│  • Maximum flexibility, maximum personal liability          │
└─────────────────────────────────────────────────────────────┘
```

**Only viable pre-scale. Transition out ASAP.**

---

## 2. Jurisdiction Analysis for Holding Company

### Singapore (🇸🇬)

**Pros:**
- Strong rule of law, English common law system
- No capital gains tax
- Excellent US and China tax treaties
- Neutral geopolitical stance
- Easy banking, stable currency
- Strong IP protection
- Physical presence required: Minimal (1 resident director)

**Cons:**
- Increasing pressure to "choose sides" in US-China tech competition
- Some export control alignment with US
- Higher operational costs than alternatives

**Verdict:** Strongest overall option for ATLAS

### Switzerland (🇨🇭)

**Pros:**
- Historical neutrality
- Strong privacy protections
- Excellent for holding IP
- Prestigious jurisdiction

**Cons:**
- Expensive to operate
- Increasing financial transparency requirements
- Complex to establish
- Less startup-friendly than Singapore

**Verdict:** Good for mature IP holding, overkill for early stage

### UAE (🇦🇪) - Dubai International Financial Centre (DIFC)

**Pros:**
- Zero tax
- No physical presence requirements
- Fast setup
- US and China both have strong UAE relationships

**Cons:**
- Reputation concerns (sanctions evasion perception)
- Weaker IP enforcement
- Banking can be challenging for US persons
- Regulatory environment less predictable

**Verdict:** Aggressive option, higher risk/reward

### Hong Kong (🇭🇰)

**Pros:**
- Familiar to Chinese funders
- Strong legal system
- Good banking

**Cons:**
- Increasingly integrated into Chinese regulatory framework
- US sanctions risk growing
- Political instability concerns

**Verdict:** Too risky given trajectory

---

## 3. IP Strategy

### The "Clean Room" Approach

**Core Principle:** The open-source ATLAS codebase must remain free of:
- US government funding restrictions (if seeking Chinese funding)
- Chinese funding restrictions (if seeking US funding)
- Export-controlled algorithms or data

**Implementation:**

```
ATLAS CORE (Open Source)
├── Funded by: Foundation, corporate sponsorships, individual donations
├── License: GPL v3 (compatible with LAMMPS ecosystem)
├── Location: GitHub, accessible globally
└── Governance: Technical steering committee (3+ members from different orgs)

ATLAS EXTENSIONS (Proprietary)
├── US Extensions
│   ├── Funded by: US entity, US grants
│   └── Market: US and allies
├── China Extensions
│   ├── Funded by: China entity, Chinese grants
│   └── Market: China and partners
└── Global Extensions
    ├── Funded by: Holding company
    └── Market: Global (non-sanctioned)
```

### IP Assignment Protocol

1. **Pre-funding:** All existing IP assigned to Singapore holding company
2. **Post-funding:** 
   - Open source contributions → Foundation
   - US-funded work → US entity (licensed back)
   - China-funded work → China entity (licensed back)
   - Self-funded work → Holding company

3. **Licensing terms:**
   - US entity: Exclusive license for North America, non-exclusive elsewhere
   - China entity: Exclusive license for Greater China, non-exclusive elsewhere
   - Holding company: Global non-exclusive license

---

## 4. Funding Strategy

### Phase 1: Seed (Now)

**Goal:** Prove technology, build team, maintain optionality

| Source | Amount | Terms | Use |
|--------|--------|-------|-----|
| Personal savings | $50-100K | N/A | Living expenses, initial dev |
| Friends/Family | $50-200K | SAFE, MFN | Extended runway |
| Angel (neutral) | $200-500K | SAFE, no board seat | Core development |

**Key constraint:** No government funding yet. Keep options open.

### Phase 2: Series A (12-18 months)

**Goal:** Choose primary market, establish operations

**Option A: US-First**
- Raise from US VCs or SBIR/STTR
- Establish US entity as primary
- File for export classification (EAR/ITAR determination)
- Hire US-based team
- China entity as sales office only

**Option B: China-First**
- Raise from Chinese VCs or government programs
- Establish China entity as primary
- Work within Chinese regulatory framework
- US entity as R&D/sales office
- Note: May trigger CFIUS concerns if US operations grow

**Option C: Parallel (High Complexity)**
- Raise from both simultaneously
- Strict firewall between operations
- Singapore holding company as neutral ground
- Only viable with experienced legal team

### Phase 3: Series B+ (24+ months)

**Goal:** Scale, potentially consolidate structure

At this stage, geopolitical realities will likely force a choice:
- If US market bigger: Consolidate to US-first structure
- If China market bigger: Consolidate to China-first structure
- If truly global: Maintain dual structure (expensive but possible)

---

## 5. Personal Relocation Strategy

### The "Three-Flag" Theory

For maximum flexibility and safety:

| Flag | Purpose | Recommendation |
|------|---------|----------------|
| **Citizenship** | Long-term security | Keep US citizenship (for now) |
| **Residence** | Where you live | Singapore or neutral third country |
| **Business** | Where company is | Singapore (holding) + US/China (operations) |

### Residency Options

**Singapore:**
- Employment Pass (if employed by Singapore entity)
- EntrePass (if starting business)
- Global Investor Programme (if investing S$2.5M+)
- Path to PR after 2-3 years

**Portugal (Golden Visa):**
- €500K investment
- Minimal stay requirements (7 days/year)
- EU access
- Backup option

**UAE:**
- Golden Visa (10 years)
- No tax on worldwide income
- Easy travel to both US and China

### Family Considerations

1. **Education:** International schools (Singapore has excellent options)
2. **Healthcare:** Private insurance covering both US and Asia
3. **Tax:** US citizens taxed worldwide; plan for Foreign Tax Credits
4. **Banking:** Maintain US accounts + open Singapore accounts
5. **Future options:** Keep pathways open to return to US if needed

---

## 6. Compliance Checklist

### Export Control (Critical for ATLAS)

ATLAS involves:
- Molecular dynamics simulation (ECCN 2D983 if optimized for specific applications)
- DFT calculations (generally not controlled unless specific applications)
- GPU acceleration (not controlled per se)

**Required Actions:**
- [ ] File for Commodity Jurisdiction (CJ) determination with BIS
- [ ] Get formal classification for ATLAS codebase
- [ ] If EAR99 (not controlled), document extensively
- [ ] If controlled, implement export control program before any non-US development

**Red Lines:**
- Never accept Chinese funding for controlled technology
- Never hire foreign nationals for controlled work without licenses
- Never host controlled code on Chinese servers
- Never transfer controlled technology to Chinese nationals in US

### CFIUS (If US Operations)

If Chinese investors invest in US entity:
- Mandatory filing if >25% voting rights
- Review for TID (Technology, Infrastructure, Data) concerns
- ATLAS likely TID due to materials simulation capabilities
- **Recommendation:** Keep Chinese investors in Singapore holding company only, not US entity

### Chinese Regulations

If accepting Chinese funding:
- Cybersecurity Law compliance for China operations
- Data localization requirements
- Potential government access to data
- **Recommendation:** Keep all development in Singapore/US, only sales/support in China

### US Tax (If Relocating)

- Continue filing US tax returns regardless of residence
- Foreign Earned Income Exclusion ($120K/year)
- Foreign Tax Credits for Singapore taxes
- FBAR reporting for foreign accounts
- Potential exit tax if renouncing citizenship (worth >$2M or 5+ years tax compliance)

---

## 7. Decision Matrix

| Scenario | Recommended Structure | Key Considerations |
|----------|----------------------|-------------------|
| US grant funding NOW | US LLC → Singapore HoldCo later | Take the money, restructure before Chinese funding |
| Chinese funding NOW | Singapore HoldCo → China WFOE | Avoid CFIUS, maintain optionality |
| Both competing NOW | Singapore HoldCo + strict firewalls | Complex, requires excellent legal team |
| Neither urgent | Personal dev → Singapore HoldCo at Series A | Cleanest, maximum flexibility |
| Mission-critical defense apps | US-only, no Chinese involvement | ITAR likely applies |
| Pure academic/research | Foundation model | Cleanest for optics, hardest to monetize |

---

## 8. Immediate Next Steps

### Week 1-2: Intelligence Gathering
- [ ] Consult export control attorney (get CJ determination)
- [ ] Consult international tax attorney (structuring options)
- [ ] Consult immigration attorney (Singapore/Portugal/UAE pathways)
- [ ] Identify potential funders in both jurisdictions (soft conversations)

### Week 3-4: Foundation
- [ ] Incorporate Singapore holding company ($2-5K, 1-2 weeks)
- [ ] Assign existing ATLAS IP to Singapore entity
- [ ] Open Singapore corporate bank account
- [ ] Begin EntrePass or Employment Pass application

### Month 2-3: Structuring
- [ ] Incorporate US entity (if US funding materializes)
- [ ] Incorporate China WFOE (if Chinese funding materializes)
- [ ] Establish intercompany agreements
- [ ] Set up accounting systems for transfer pricing

### Month 3-6: Operations
- [ ] Relocate family to Singapore (or chosen jurisdiction)
- [ ] Establish physical office/coworking
- [ ] Hire first team members
- [ ] Begin fundraising in earnest

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Export control violation | Low | Critical | Get CJ determination first |
| CFIUS blocking investment | Medium | High | Keep Chinese investors out of US entity |
| Forced technology transfer | Low | High | Keep IP in Singapore, not China |
| US sanctions on Singapore | Low | Critical | Maintain UAE/Portugal backup residency |
| Personal liability | Medium | High | Never operate as sole proprietor |
| Tax double jeopardy | Medium | Medium | Hire specialist international tax CPA |
| Funding source conflict | Medium | High | Clear firewall structure, full disclosure |

---

## 10. Key Principles

1. **Never commingle funds.** US and Chinese funding must flow through separate entities with no mingling.

2. **Own your IP.** The Singapore holding company should own all core IP, with exclusive licenses to operating subsidiaries. Never assign IP to Chinese entity.

3. **Document everything.** Every funding source, every code commit, every meeting. Paper trails save you in audits.

4. **Assume transparency.** Both US and Chinese governments will know about your dual structure. That's fine — it's legal if done correctly. Secrecy creates suspicion.

5. **Keep an exit.** Always maintain a path back to the US, to Singapore, or to a third country. Never corner yourself.

6. **Protect your family.** Their safety and stability matters more than the business. Plan for their needs first.

---

## Appendix: Professional Resources Needed

### Legal
- **Export Control:** Berliner Corcoran & Rowe, or similar DC-based firm
- **International Tax:** Baker McKenzie, DLA Piper, or regional specialist
- **Immigration:** Singapore-based firm (RHTLaw Asia, Rajah & Tann)
- **Chinese Corporate:** Fangda Partners, JunHe, or similar

### Advisory
- **International Structuring:** Big 4 accounting (PwC, Deloitte)
- **Family Office:** If personal wealth >$5M, consider multi-family office
- **Security:** Physical and digital security consultants for high-profile relocations

---

*This document is a strategic framework, not legal advice. Engage qualified counsel before making any decisions.*

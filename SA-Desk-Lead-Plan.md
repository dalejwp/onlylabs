# SA Desk → Legends · 100-Lead Operator Plan
**Owner:** Dale Booysen (Hotlead SA) · **Client:** The Legends Agency Ltd
**Budget:** ~£900 ad spend · **Window:** 60 days · **Target:** 100 *accepted* Valid Leads
**Ad ops:** Meta Marketing API (hands-off) + manual Google core

---

## 0. PRIORITY ZERO — fix the comp structure first
Contract clause 3.2/3.3 pays only on **signed MSAs** (£10–£150 each). As written you carry 100%
of ad risk and get paid on Legends' close rate. **Do not scale ad spend until this moves to
per-accepted-lead pricing** (proposing £40/accepted lead, conversion bands as a bonus).
→ Send the clarification email (separate doc) before spending beyond a £200 test.

---

## 1. The Valid Lead spec (engineer every lead to this)
Per contract Section 1.2 + 2.1, every lead must have:
- UK-based company
- Relevant to offshore / EOR hiring
- **Direct mobile or direct landline** (NOT switchboard)
- **Personal company email** (NOT info@/admin@/role inboxes, NOT free inboxes)
- Unique (not already in Legends CRM/pipeline)
- GDPR lawful basis + informed consent (timestamped)
- Accurate & current

Rejected leads = £0 and repeated poor quality = immediate termination (8.3).
**To net 100 accepted, generate ~125 valid (≈20% rejection buffer).**

---

## 2. Funnel upgrades (Replit) — do first
Make phone REQUIRED + validate UK number · reject free/role emails server-side + MX check ·
make headcount & situation required · add required consent checkbox + /privacy · capture UTM +
referrer hidden fields · honeypot + time-on-page bot block · dedup on email/phone/domain ·
add leadStatus (new|delivered|accepted|rejected) + deliveredAt + acceptanceDeadline (+14 days).

---

## 3. Automation engine
Form → server validation → dedup → save → fire 3 things:
1. Admin dashboard 2. Master Google Sheet 3. Legends delivery (email + live Sheet) →
14-day acceptance tracker → weekly reconciliation → invoice by CPL band.
Daily 8am summary to Dale; instant WhatsApp/email on each new lead.

---

## 4. 60-day traffic plan (lean ~£900)
Blended target ≤ ~£10/valid lead, achieved by free organic carrying ~60 leads and paid ~65.

| Channel | Type | Target leads | Cost |
|---|---|---|---|
| Meta lead ads (API, £12–15/day) | Paid | ~55 | ~£800 |
| Google Search (small manual core) | Paid | ~10 | ~£150 |
| LinkedIn organic outreach | Free | ~25 | £0 |
| Referral partners (accountants/recruiters) | Free | ~20 | £0 (10% on close) |
| Facebook groups + DMs | Free | ~15 | £0 |
| **Total** | | **~125 valid → ~100 accepted** | **~£950** |

### Week-by-week
- **Wk 1:** Priority Zero email · funnel upgrade live · tracking installed · Meta API connected · £200 test live · organic outreach starts.
- **Wk 2:** Read test data, kill losers, keep winner. Referral partner emails go out (20 accountants/10 recruiters).
- **Wk 3–4:** Scale winning Meta ad to £15/day. LinkedIn outreach daily (25 connects/day). First partner leads arrive.
- **Wk 5–6:** Add Google Search core. Weekly reconciliation with Legends begins. Optimise to lowest cost/accepted lead.
- **Wk 7–8:** Push to 100 accepted. Double down on whichever channel has best accept-rate. Lock learnings.

---

## 5. Hook & angle (all channels)
"A London developer costs £70,000. The same person in Cape Town: £32,500. Keep the £37,500."
Same English · 1-hour timezone overlap · hire-ready in 5 working days · no SA entity required.

---

## 6. Ad-ops via API — guardrails
- Meta: daily cap £15/campaign, lead-gen objective only, no budget increase without Dale's OK.
- Google: small manual core (API setup too slow/heavy for this budget).
- All spend visible to Dale; weekly spend vs leads report.

---

## 7. KPIs (review every Monday)
| Metric | Target |
|---|---|
| Valid leads delivered | 125 over 60 days (~2/day) |
| Accept rate | ≥ 80% |
| Cost per accepted lead | ≤ £10 blended |
| Lead → MSA conversion | track for CPL band |
| Rejections | < 20%, investigate every one |

If accept-rate drops below 80%, STOP paid spend and fix lead quality before resuming —
quality protects the contract.

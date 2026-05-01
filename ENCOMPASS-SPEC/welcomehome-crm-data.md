# Welcome Home CRM - Scraped Data Spec

**Source:** https://crm.welcomehomesoftware.com/the-pointe-at-deerfield
**Community:** The Pointe at Deerfield (ID: 49741)
**Account:** Sinceri Senior Living (ID: 4)
**Scraped:** 2026-05-01 (Pass 1 + Pass 2)
**Data Location:** `C:\Projects\SOLACE\scraper\data\`
**Total:** 99 files, 80.6 MB

### Data at a Glance

| Dataset | Format | Records | Size | File |
|---------|--------|---------|------|------|
| Full Prospects (all statuses) | CSV | 9,526 | 3.2 MB | `prospects-full.csv` |
| Open Prospects only | CSV | 158 | 57 KB | `prospects.csv` |
| All Activities | CSV | 273,970 | 38.7 MB | `activities-full.csv` |
| Past-Due Activities | CSV | 21 | 6 KB | `activities-past-due.csv` |
| Referrers | CSV | 198 | 48 KB | `referrers.csv` |
| Occupancy (228 units) | HTML | 228 | 1.5 MB | `occupancy.html` |
| Dashboard Metrics (7 KPIs) | JSON | 7 | 21 KB | `dashboard-partials.json` |
| Rent Roll | HTML | varies | 553 KB | `report-rent-roll.html` |
| Lost Lead Analysis | HTML | varies | 140 KB | `report-lost-lead.html` |
| MI/MO Summary | HTML | varies | 109 KB | `report-mimo-summary.html` |
| MI/MO Schedule | HTML | varies | 385 KB | `report-mimo-schedule.html` |
| Move Out Reasons | HTML | varies | 103 KB | `report-move-out-reasons.html` |
| Move Ins by Lead Source | HTML | varies | 101 KB | `report-move-ins-by-lead-source.html` |
| Move Ins by Referrer | HTML | varies | 101 KB | `report-move-ins-by-referrer.html` |
| Dwell Time | HTML | varies | 142 KB | `report-dwell-time.html` |
| Sales Conversion | HTML | varies | 291 KB | `report-sales-conversion.html` |
| Sales Funnel | HTML | varies | 276 KB | `report-sales-funnel.html` |

---

## 1. PROSPECTS (CSV Export)

**File:** `prospects-full.csv` (all statuses) / `prospects.csv` (open only)
**Records:** 9,526 (full) / 158 (open only)
**Format:** CSV with headers

> **Pass 2 upgrade:** The full export includes closed, lost, and moved-in prospects.
> This is the historical dataset Encompass needs for "what worked" intelligence.

### Fields (48 columns)

#### Prospect Identity
| Field | Example | Notes |
|-------|---------|-------|
| `Prospect ID` | `46038171` | Unique numeric ID |
| `Prospect First Name` | `Art` | |
| `Prospect Last Name` | `sicker` | |
| `Prospect Nickname` | | Often empty |
| `Prospect Email` | `lotechy123@gmail.com` | |
| `Prospect Cell Phone` | `(321) 626-2662` | Formatted |
| `Prospect Home Phone` | | |
| `Prospect Work Phone` | | |

#### Prospect Address
| Field | Example |
|-------|---------|
| `Prospect Address Line 1` | |
| `Prospect Address Line 2` | |
| `Prospect Address City` | |
| `Prospect Address State` | |
| `Prospect Address Zip` | |

#### Prospect Profile
| Field | Example | Notes |
|-------|---------|-------|
| `Prospect Birthdate` | | Date format |
| `Prospect Provided Age` | `62` | Numeric |
| `Care Type` | | AL, Independent Living, etc. |
| `Trigger Events` | | What prompted inquiry |
| `Expected Stay Type` | | |
| `Expected Move Timing` | | |

#### Influencer 1 (Family/Decision-Maker)
| Field | Example |
|-------|---------|
| `Influencer 1 ID` | |
| `Influencer 1 First Name` | |
| `Influencer 1 Last Name` | |
| `Influencer 1 Nickname` | |
| `Influencer 1 Email` | |
| `Influencer 1 Cell Phone` | |
| `Influencer 1 Home Phone` | |
| `Influencer 1 Work Phone` | |
| `Influencer 1 Address Line 1` | |
| `Influencer 1 Address Line 2` | |
| `Influencer 1 Address City` | |
| `Influencer 1 Address State` | |
| `Influencer 1 Address Zip` | |

#### Pipeline / Sales
| Field | Example | Notes |
|-------|---------|-------|
| `Status` | `open` | open, closed |
| `Stage` | `Inquiry` | Inquiry, Connection, Pre-Tour, Post-Tour, Deposit, Move-In |
| `Score` | `Warm` | Very Hot, Hot, Warm, Cold, Purchased List, Contact Center Transfer, Contact Center Working |
| `Referrer` | `Phillips, Heidi` | Last, First format |
| `Sales Counselor` | `Stephanie Southern` | Assigned staff |
| `Community` | `The Pointe at Deerfield` | |
| `Lead Source` | `Website` | Website, A Place For Mom, etc. |
| `Secondary Lead Source` | | |
| `Projected Move In Date` | | Date |
| `Projected Deposit Date` | | Date |
| `Close Reason` | | If closed |
| `Close Reason Details` | | |

#### Timestamps
| Field | Example | Notes |
|-------|---------|-------|
| `Initial Contact` | `2026-04-30 09:14:34 PM ET` | Full datetime with timezone |
| `Last Contact` | `2026-04-30 09:16:03 PM ET` | |
| `Inquiry Date` | `2026-04-30` | Date only |

#### Meta
| Field | Example |
|-------|---------|
| `# of Files` | `0` |
| `Import ID` | |
| `Link` | `https://crm.welcomehomesoftware.com/the-pointe-at-deerfield/prospects/46038171` |

### Stage IDs (for URL filtering)
| Stage | ID |
|-------|-----|
| Inquiry | 13 |
| Connection | 11065 |
| Pre-Tour | 14 |
| Post-Tour | 15 |
| Deposit | 16 |
| Move-In | 17 |

### Pipeline Distribution (as of scrape)
| Stage | Count |
|-------|-------|
| Inquiry | 38 |
| Connection | 66 |
| Pre-Tour | 13 |
| Post-Tour | 40 |

---

## 2. REFERRERS (CSV Export)

**File:** `referrers.csv`
**Records:** 198
**Format:** CSV with headers

### Fields (22 columns)

| Field | Example | Notes |
|-------|---------|-------|
| `Referrer ID` | `10148516` | Unique numeric ID |
| `First Name` | `Tammy` | |
| `Last Name` | `Martin` | |
| `Position` | | Job title |
| `Email` | `nheredia@bdmn.org` | |
| `Cell Phone` | `(561) 420-9411` | |
| `Home Phone` | | |
| `Work Phone` | | |
| `Fax` | | |
| `Address Line 1` | `5645 Lake Shore Village Circle` | |
| `Address Line 2` | | |
| `Address City` | `Lake Worth` | |
| `Address State` | `FL` | |
| `Address Zip` | `33467` | |
| `Organization ID` | `5968524` | Links referrer to org |
| `Organization Name` | `THE FORUM AT DEER CREEK` | Referring facility/company |
| `Community` | `The Pointe at Deerfield` | |
| `Initial Contact` | `2026-01-29 12:12:58 PM ET` | |
| `Last Contact` | `2026-03-27 10:37:07 AM ET` | |
| `Status` | `open` | |
| `Stage` | `New` | New, Early Engagement, etc. |
| `Link` | `https://crm.welcomehomesoftware.com/...` | |

---

## 3. ACTIVITIES (CSV Export)

**File:** `activities-full.csv` (all) / `activities-past-due.csv` (past-due only)
**Records:** 273,970 (full) / 21 (past-due)
**Format:** CSV with headers

> **Pass 2 upgrade:** Full activity export — every call, tour, email, note, and task
> across the entire history. This is the behavioral layer for Encompass.

### Fields (21 columns)

| Field | Example | Notes |
|-------|---------|-------|
| `Activity ID` | `752804897` | Unique numeric ID |
| `Activity Type` | `Call` | Call, Tour, Email, Task, etc. |
| `Scheduled At` | `2026-04-28 06:00:00 PM ET` | |
| `Completed At` | | Empty if not done |
| `Activity Result` | `Completed` | |
| `People` | `Mercedes` | Contact name(s) |
| `Assigned To` | `Mary Blosser` | Staff member |
| `Initial/Repeat` | `Repeat` | Initial or Repeat |
| `Direction` | `Outbound` | Inbound, Outbound, Not Applicable |
| `Notes` | | Free text |
| `Record ID` | `41178876` | Links to prospect/referrer |
| `Record Name` | `Mercedes Anderson` | |
| `Record Type` | `Prospect` | Prospect or Referrer |
| `Email Opens` | | Count |
| `Email Clicks` | | Count |
| `Call Duration (sec)` | | Numeric |
| `Call Recording` | | URL |
| `Community` | `The Pointe at Deerfield` | |
| `Link` | `https://crm.welcomehomesoftware.com/...` | |
| `Created By` | `Mary Blosser` | |
| `Parent Activity ID` | | For sub-activities |

---

## 4. OCCUPANCY (HTML Scrape)

**File:** `occupancy.html`
**Format:** Structured HTML (1.5 MB)

### Summary Stats
| Metric | Value |
|--------|-------|
| Total Units | 228 |
| Total Residents | 201 |
| Occupied | 179 (78.51%) |
| Vacant | 49 (21.49%) |
| Notice | 0 |
| Reserved | 0 |
| Off Census | 0 |

### Unit-Level Fields
| Field | Source | Notes |
|-------|--------|-------|
| Unit Number | `occupancy-unit__number` | e.g., "101", "202A" |
| Unit Description | `occupancy-unit__description` title attr | Format: "Bedrooms / Care Level / Privacy Level" |
| Resident Name | `occupancy-unit__resident-link` | Linked to resident profile |
| Move-In Date | Inline text | Format: "MI: MM/DD/YYYY" |
| Notes | `occupancy-unit__notes-data` | Free text per unit |
| Status | `data-status` attribute | occupied, vacant, notice, reserved, off_census |

### Dimensions
| Dimension | Values |
|-----------|--------|
| Bedroom Types | Studio, 1 Bedroom, 2 Bedroom |
| Care Levels | AL (Assisted Living), Independent Living |
| Privacy Levels | Private, Shared, None |
| Status | Occupied, Vacant, Notice, Reserved, Off Census, Move In Today, Move Out Today |
| Risk Levels | Ok, At Risk, In Hospital, Rehab, On Hospice, On Leave, Out With Family |
| Grouping | By Status, By Floor Plan, By Care Type, By Floor |

---

## 5. DASHBOARD METRICS (JSON Partials)

**File:** `dashboard-partials.json`
**Format:** JSON with 7 HTML partials

### Metrics Available
| Partial Key | Metric | Current Value |
|-------------|--------|---------------|
| `occupancy_metric_inner` | All Occupancy % | 78.51% (goal: 90%) |
| `new_prospects_metric_inner` | New Inquiries MTD | 0 (goal: 4) |
| `prospects_without_next_activity_metric_inner` | Uncontacted Prospects | 0 |
| `speed_to_lead_metric_inner` | Speed to Lead MTD | No data |
| `activities_vs_goal_inner` | Activities vs Goal MTD | 5 activity types tracked |
| `sales_conversion_inner` | Sales Conversions MTD | 3 funnel stages |
| `unit_activity_inner` | Move Ins/Outs | MTD, Scheduled, Projected, Total |

### Activities vs Goal Breakdown
| Activity Type | Category | Goal |
|---------------|----------|------|
| Moments that Matter | Prospects | 40 |
| Move-In Confirmation | Prospects | 8 |
| Tour | Prospects | 40 |
| Sales Call-Drop by | Referrers | 40 |
| Sales Call-Appt | Referrers | 40 |

### Sales Funnel Stages
| Stage | Goal |
|-------|------|
| Inquiry to Post-Tour | 50% |
| Tour to Deposit | 40% |
| Post-Tour to Move In | 40% |

### Unit Activity Rows
| Row | Description |
|-----|-------------|
| MTD | Actual this month |
| Scheduled | Upcoming confirmed |
| Projected | Forecasted |
| Total | Sum |

Each row has: Move Ins, Move Outs, Net

---

## 6. REPORTS (HTML Scrapes)

**Date Range:** 01/01/2024 - 05/01/2026 (all reports)
**Grouped By:** Community (ID 49741)

### Marketing & Attribution
| File | Report | What It Tells You |
|------|--------|-------------------|
| `report-lead-source.html` | Lead Source Analysis | Which channels drive inquiries |
| `report-move-ins-by-lead-source.html` | Move Ins by Lead Source | Which channels actually convert to move-ins |
| `report-move-ins-by-referrer.html` | Move Ins by Referrer | Which referrer relationships produce residents |

### Sales Pipeline
| File | Report | What It Tells You |
|------|--------|-------------------|
| `report-sales-funnel.html` | Sales Funnel | Full funnel visualization |
| `report-sales-conversion.html` | Sales Conversion | Stage-to-stage conversion rates |
| `report-funnel-inquiry-to-post-tour.html` | Inquiry -> Post-Tour | Top-of-funnel conversion |
| `report-funnel-tour-to-deposit.html` | Tour -> Deposit | Mid-funnel conversion |
| `report-funnel-post-tour-to-move-in.html` | Post-Tour -> Move-In | Bottom-of-funnel conversion |
| `report-dwell-time.html` | Dwell Time | How long prospects sit in each stage |
| `report-lost-lead.html` | Lost Lead Analysis | Why prospects dropped out + close reasons |

### Occupancy & Revenue
| File | Report | What It Tells You |
|------|--------|-------------------|
| `report-rent-roll.html` | Rent Roll | Unit pricing, market rates, current rents |
| `report-mimo-summary.html` | MI/MO Summary | Move-in/out totals over time |
| `report-mimo-schedule.html` | MI/MO Schedule | Upcoming scheduled moves |
| `report-move-out-reasons.html` | Move Out Reasons | Why residents leave (churn categories) |

---

## 7. OTHER PAGES (HTML Scrapes)

| File | Description | Content |
|------|-------------|---------|
| `day-planner.html` | Daily task/activity view | 58 items, staff assignments, scheduled activities |
| `events.html` | Community events calendar | Upcoming events |
| `messenger.html` | Internal messaging | Conversation threads |
| `knowledge-center.html` | Help articles/resources | WelcomeHome platform docs |
| `reports-index.html` | Available report types | List of all report templates |

---

## 8. SALES COUNSELORS (Staff)

| ID | Name |
|----|------|
| 323232 | Daniel Rizzi |
| 323227 | Dr. Dee Rogers-Darnell |
| 325180 | Kathy Marciante |
| 323230 | Mary Blosser |
| 380587 | Stephanie Southern (logged-in user) |

---

## 9. KEY RELATIONSHIPS

```
Prospect --[has]--> Influencer(s)         (family/decision-maker)
Prospect --[referred by]--> Referrer      (via Referrer field)
Prospect --[assigned to]--> Sales Counselor
Prospect --[has many]--> Activities       (via Record ID)
Prospect --[at stage]--> Pipeline Stage   (Inquiry -> Connection -> Pre-Tour -> Post-Tour -> Deposit -> Move-In)
Prospect --[scored as]--> Score           (Very Hot -> Hot -> Warm -> Cold)
Referrer --[belongs to]--> Organization   (via Organization ID)
Referrer --[has many]--> Activities       (via Record ID)
Unit --[occupied by]--> Resident          (via resident link)
Unit --[has]--> Floor Plan                (Bedroom Type + Privacy Level)
Unit --[has]--> Care Level                (AL, Independent Living)
```

---

## 10. DATA FILES INDEX

### Tier 1 — Structured CSVs (parse directly)
| File | Format | Size | Records | Use Case |
|------|--------|------|---------|----------|
| `prospects-full.csv` | CSV | 3.2 MB | 9,526 | Full prospect history — open, closed, moved-in, lost |
| `activities-full.csv` | CSV | 38.7 MB | 273,970 | Every activity ever — calls, tours, emails, notes |
| `referrers.csv` | CSV | 48 KB | 198 | Referral network and organizations |
| `prospects.csv` | CSV | 57 KB | 158 | Current open prospects only |
| `activities-past-due.csv` | CSV | 6 KB | 21 | Overdue tasks (actionable) |

### Tier 2 — Structured HTML (parse with cheerio/DOM)
| File | Format | Size | Use Case |
|------|--------|------|----------|
| `occupancy.html` | HTML | 1.5 MB | 228 units — types, care levels, residents, move-in dates |
| `report-rent-roll.html` | HTML | 553 KB | Unit pricing and market rates |
| `report-mimo-schedule.html` | HTML | 385 KB | Upcoming move-in/out schedule |
| `report-sales-conversion.html` | HTML | 291 KB | Stage conversion rates |
| `report-sales-funnel.html` | HTML | 276 KB | Full funnel visualization |
| `report-lead-source.html` | HTML | 216 KB | Lead source attribution |
| `report-dwell-time.html` | HTML | 142 KB | Time-in-stage per prospect |
| `report-lost-lead.html` | HTML | 140 KB | Close reasons and lost analysis |
| `report-mimo-summary.html` | HTML | 109 KB | Move-in/out totals over time |
| `report-move-out-reasons.html` | HTML | 103 KB | Churn categories |
| `report-move-ins-by-lead-source.html` | HTML | 101 KB | Which channels convert |
| `report-move-ins-by-referrer.html` | HTML | 101 KB | Which referrers convert |
| `dashboard-partials.json` | JSON | 21 KB | 7 real-time KPI metrics |

### Tier 3 — Context Pages
| File | Format | Size | Use Case |
|------|--------|------|----------|
| `day-planner.html` | HTML | 292 KB | Daily ops view (58 items) |
| `events.html` | HTML | 67 KB | Community events calendar |
| `messenger.html` | HTML | 66 KB | Internal messaging |
| `knowledge-center.html` | HTML | 88 KB | Platform help docs |

---

## 11. NOTES FOR INGESTION

1. **CSVs are ready to parse** — standard format, headers in row 1, consistent delimiters
2. **HTML reports need parsing** — structured tables with CSS classes; use cheerio or similar
3. **Timestamps are ET** — all datetime fields include "ET" timezone suffix
4. **Phone numbers are formatted** — `(XXX) XXX-XXXX` format, needs normalization if storing raw
5. **IDs are stable** — Prospect ID, Referrer ID, Activity ID, Organization ID persist across scrapes
6. **Links are full URLs** — every CSV record has a `Link` field back to the CRM
7. **Referrer -> Organization is a key join** — Organization ID links referrers to their parent facility
8. **Score values are enum** — Very Hot, Hot, Warm, Cold, Purchased List, Contact Center Transfer, Contact Center Working
9. **Stage values are enum** — Inquiry -> Connection -> Pre-Tour -> Post-Tour -> Deposit -> Move-In
10. **Full prospect history includes Close Reason** — critical for Lost Lead Analysis mapping
11. **Activities link to records via Record ID + Record Type** — join activities to prospects or referrers
12. **273K activities is large** — consider chunked ingestion or streaming parse for activities-full.csv
13. **Re-run scraper anytime** — `node scraper/scrape-all.js` (pass 1) or `node scraper/scrape-pass2.js` (pass 2) from SOLACE dir, uses Decodo proxy, auto-login

## 12. QUESTIONS ENCOMPASS CAN ANSWER WITH THIS DATA

With the full dataset ingested, Encompass should be able to answer:

**Pipeline Intelligence:**
- "Which lead sources have the highest move-in conversion rate?"
- "What's our average dwell time in the Pre-Tour stage?"
- "How many prospects did we lose last quarter and why?"
- "Which referrers actually produce move-ins vs just inquiries?"

**Operational:**
- "Who has past-due activities right now?"
- "What's our occupancy trend month over month?"
- "Which units are vacant and what are their market rates?"
- "When are the next scheduled move-ins?"

**Historical / Pattern:**
- "What did the funnel look like for prospects who eventually moved in?"
- "What's the average time from inquiry to move-in for A Place For Mom leads vs Website leads?"
- "Which sales counselor has the best conversion rate?"
- "What are the most common move-out reasons?"

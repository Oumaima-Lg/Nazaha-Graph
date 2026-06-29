# Nazaha-Graph — Progress & Handoff

> **Read this first when starting a new conversation.** It captures the project context,
> what has been built so far, and the exact next steps.

---

## 1. Project context

**Nazaha-Graph** is an investigative tool for the **INPPLC** (Instance Nationale de la
Probité, de la Prévention et de la Lutte contre la Corruption — Morocco), built for the
48h **Nazahathon**. It detects fraud, conflicts of interest, and collusion in Moroccan
public procurement using **Graph Intelligence** instead of linear manual controls.

**Current focus:** the **Network Graph** MVP (the core feature).

### Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), React 19, Tailwind v4, Shadcn |
| Graph viz | custom SVG force-directed graph (`components/network-graph.tsx`) |
| Backend | Python + FastAPI |
| Graph engine | NetworkX |
| Database | Supabase (PostgreSQL) |

### Key architectural decision: deterministic core, AI only around it
The fraud **verdict** is computed by **NetworkX graph algorithms** (exact, explainable,
court-admissible) — **not** by a trained ML model. Reasons:
1. **Legal defensibility** — every flag must be a provable fact for INPPLC, not a black-box probability.
2. **No labeled training data** — there is no public dataset of confirmed Moroccan procurement fraud, so a supervised/retrained classifier is impossible right now.
3. **The signal is structural** — conflicts/collusion are graph topology (cycles, cliques, paths) that graph theory computes precisely.

AI/ML is reserved for **augmentation layers** (never the verdict):
- **Best demo ROI:** an **LLM (Claude) narrative layer** that turns a flagged subgraph into a
  plain-language investigator briefing (FR/AR). AI does *language*, not *judgment*.
- Later/post-MVP: entity resolution (fuzzy name matching), Node2Vec/GNN anomaly detection,
  and a supervised classifier *once INPPLC accumulates labeled cases*.

---

## 2. What has been done ✅ — Database layer (complete & hardened)

### Graph ontology
**4 node types · 5 edge types · 2 unified SQL views**

**Nodes:** `agencies` (Autorité Contractante), `persons` (Personne Physique — public officials
*and* private individuals, keyed by CIN), `companies` (Entreprise — keyed by OMPIC `ice`),
`tenders` (Marché Public — central node, OCDS `ocid`, fraud flags).

**Edges:**
- `public_links` — Person → Agency (ordonnateur, président_commission…)
- `professional_links` — Person → Company (gérant, actionnaire…, with `share_percentage` for UBO)
- `family_links` — Person ↔ Person **★ critical** (closes indirect conflict-of-interest cycles)
- `allocations` — Agency → Tender → winning Company
- `bid_participations` — Company → Tender (tracks **all** bidders incl. losers → collusion rings)

**Views (what the backend should query):**
- `graph_nodes` — all 4 node tables flattened into one adjacency feed
- `graph_edges` — all 5 edge tables flattened into one directed adjacency list

### Files (in `backend/`)
| File | Purpose |
|---|---|
| `schema.sql` | Canonical schema — 4 nodes + 5 edges + 2 views + RLS. Use for a **fresh** install (drops & recreates everything). |
| `seed.sql` | Moroccan-realistic mock data with 5 fraud scenarios. |
| `migration_01_hardening.sql` | Data-safe migration (rebuilds `graph_edges` view + adds RLS) — **already applied** to live DB. |

### Seeded fraud scenarios (in `seed.sql`)
- **[A] Conflit d'intérêt direct** — Fatima Zahra El Hilali (présidente commission MEE) → *conjoint* → Omar El Hilali (gérant BTP Maroc), who wins 3 MEE tenders she presides.
- **[B] Conflit familial indirect** — Mohammed Benali (ordonnateur ONEE) → *frère* → Youssef Benali (actionnaire Travaux Hydrauliques Fès), winner of 3 ONEE tenders.
- **[C] Collusion / rotation** — BTP Maroc + Constructions Maghreb + Génie Civil Atlantique always bid together as the same trio (decoy bidders).
- **[D] Pantouflage** — Abdelhak Tazi (ex-directeur Commune Rabat, left Dec 2022) → consultant at Infrastructure Sud (Jan 2023), which wins a 21.5M MAD tender there (Jun 2023).
- **[E] Fractionnement** — Petits Travaux Express wins 4 consecutive bons de commande each just under the 1M MAD open-tender threshold.

### Hardening fixes applied
1. **family_links bidirectional** in `graph_edges` (emits A→B and B→A) so NetworkX detects the cycle from either person, even as a DiGraph.
2. **Unique edge ids** in `graph_edges` (`-fwd/-rev`, `-award/-win`) to avoid key collisions.
3. **Row Level Security** on all 11 tables. Public (anon) key can ONLY insert reports; the
   confidential graph (CINs, family ties) is unreachable via the public key.

### Verified live DB counts
agencies **5** · persons **10** · companies **8** · tenders **12** · family_links **3**
· graph_nodes **35** · graph_edges **64** (family counted both directions ✓)

### Config — `backend/.env`
- `SUPABASE_URL` — set ✓
- `SUPABASE_KEY` — **must be the `sb_secret_…` (service_role) key** so the backend bypasses RLS ✓ (set)
- `JWT_SECRET` — ⚠️ confirm it's no longer the default `change-me-in-production` (a random value was suggested).

---

## 3. Next steps 🔜 — Wire the graph (the core MVP)

The backend currently builds the graph from a **JSONB blob / sample data**, not from the new
relational tables. The next job is to make NetworkX read the real Supabase graph.

| Step | What | File |
|---|---|---|
| **1** | New service: load `graph_nodes` + `graph_edges` from Supabase → build the NetworkX graph | `backend/services/graph_loader.py` (new) |
| **2** | Run fraud detection on real data: family-cycle conflict, bid-rotation collusion, pantouflage (date_fin_mandat vs hire date), single_bidder / fractionnement flags. Write `fraud_score` back to `tenders`. | `backend/services/graph_analyzer.py` (update) |
| **3** | Expose via `GET /api/analyze` → return real nodes/edges/scores in the shape the frontend expects | `backend/routers/analyze.py` (update) |
| **4** | Confirm `network-graph.tsx` renders the real data; collusion paths blink red; lateral filter panel works | frontend |
| **5** *(optional, high ROI)* | Claude narrative layer: flagged subgraph → plain-language FR/AR investigator briefing | new |

**Recommended starting point:** Steps 1 + 2 — get NetworkX reading the real Supabase graph
and detecting the 5 seeded fraud patterns.

### Useful references for the next session
- The frontend API client + expected types: `fraud-detection-ui/lib/api.ts`
- Existing (to-be-replaced) analyzer logic: `backend/services/graph_analyzer.py`
- The graph component: `fraud-detection-ui/components/network-graph.tsx`
- Node/edge response models: `backend/models/graph.py`

---

## 4. Reminders / gotchas
- Backend **must** use the `service_role` key, or RLS will block it from reading the graph.
- Never put the `sb_secret_…` key in the frontend or any committed file (`backend/.env` is gitignored ✓).
- To reset the DB from scratch: run `schema.sql` then `seed.sql` (this **wipes** data).
  To patch an existing DB without data loss: use a migration file like `migration_01_hardening.sql`.
- `family_links` are stored once but exposed in **both** directions by the view — don't double-insert them in seed data.

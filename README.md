# SkinSync Advisor

AI-powered skincare shopping validator — not a medical diagnosis tool, not a store.

SkinSync helps you build a validated, conflict-free, budget-optimized skincare routine and generates a purchase-validated cart with external buy links. The AI only extracts your shopping profile and strategy; a deterministic rules engine validates products and links out to buy.

## Quick Start

```bash
# Install all dependencies
npm install

# Copy env and add your OpenAI key (optional — app works without it)
cp backend/.env.example backend/.env
# Edit backend/.env and set OPENAI_API_KEY

# Run both frontend and backend in development
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| OPENAI_API_KEY | (none) | OpenAI API key. App works without it using deterministic fallback (lower confidence). |
| OPENAI_TEXT_MODEL | gpt-4o-mini | Model for text analysis |
| OPENAI_VISION_MODEL | gpt-4o | Model for photo analysis |
| PORT | 5000 | Backend port |

## Features

- **Intake flow** — describe your skin, optionally upload a photo, answer 5 yes/no questions (including allergy check)
- **Skin Context Profile** — barrier sensitivity, oil production, inflammation risk, concerns, triggers, confidence
- **3 Treatment Paths** — AI-suggested strategies with engine-generated plan previews from the product catalog
- **Deterministic scoring engine** — 0–100 compatibility score (ingredient relevance 50%, sensitivity match 20%, conflict risk 15%, rating 15%)
- **Score breakdown modal** — tap any score badge for plain-English explanation
- **AM/PM Routine** — derived from cart (single source of truth in `selected_by_step`)
- **Cart with purchase validation** — conflict status, swap/remove, external buy links, open all links, copy shopping list
- **Existing product check** — add a product you own, check conflicts, get auto-generated search buy link
- **Add Concern** — merge new concerns into existing profile without restarting
- **Refill predictor** — estimated refill days per product
- **Allergy filtering** — deterministic filtering of products containing allergy tokens
- **Budget optimization** — low/balanced/premium preference + optional max total
- **High contrast mode** — accessibility toggle
- **No accounts** — all state persists in localStorage
- **Photos never saved** — sent once for analysis, never stored

## Architecture

```
User Input → AI (OpenAI) → Skin Profile + Strategy Keys
                              ↓
              Deterministic Engine (rules, scoring, conflicts)
                              ↓
              Validated Cart → External Buy Links
```

- **AI is only used for**: intake question generation, profile extraction, treatment path strategy selection
- **AI never used for**: product selection, scoring, conflict checking, budget optimization, swaps, cart validation

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend (:5000) + frontend (:5173) concurrently |
| `npm run build` | Build frontend + backend for production |
| `npm run start` | Start backend serving frontend build + API |
| `cd backend && npm test` | Run Jest tests |

## Tech Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, React Router
- **Backend**: Node.js + Express + TypeScript
- **AI**: OpenAI Responses API with Structured Outputs (Zod)
- **Data**: Local JSON files (products, conflicts, concerns-and-actives)
- **State**: localStorage (no database, no accounts)

# DCF Studio

DCF Studio is a full-stack discounted cash flow valuation app designed for investors, finance teams, and operators who want spreadsheet-grade control without living in Excel. It combines a transparent Python valuation engine with a modern React UI for FCFF and FCFE workflows, saved bear/base/bull scenarios, sensitivity matrices, reverse DCF analysis, target-return pricing, and explainable outputs.

## Project Overview

- Backend: FastAPI, Pydantic v2, NumPy, numpy-financial, pandas, SQLite repository abstraction
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, Recharts, TanStack Query, react-hook-form, zod
- Persistence: SQLite by default, separated behind a repository layer so PostgreSQL can be swapped in later
- Testing: pytest for backend, Vitest + Testing Library for frontend
- Packaging: `uv` for Python dependency sync, `npm` for frontend
- Containers: Dockerfiles for backend and frontend plus a root `docker-compose.yml`

## Why This App Exists

Traditional DCF workbooks are flexible but brittle. DCF Studio keeps the same modeling transparency while improving:

- auditability through explicit formulas and typed request/response contracts
- repeatability through saved models and scenario sets
- accessibility through a guided interface, charts, and in-app explanations
- maintainability through clean separation between domain logic, API routes, persistence, and UI

## Architecture

```text
dcf-app
├── backend
│   ├── app
│   │   ├── api
│   │   ├── core
│   │   ├── db
│   │   ├── domain
│   │   ├── repositories
│   │   ├── schemas
│   │   ├── services
│   │   └── main.py
│   ├── tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── features
│   │   ├── hooks
│   │   ├── lib
│   │   ├── pages
│   │   └── types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

### Backend layers

- `domain/`: pure DCF math and projection helpers
- `schemas/`: request and response models with validation rules
- `services/`: orchestration for calculate, sensitivity, reverse DCF, target return, and scenario comparison
- `repositories/`: persistence abstraction and SQLite implementation
- `api/`: thin FastAPI routes
- `db/`: schema initialization and demo seed data

### Frontend layers

- `pages/`: route-level entry points
- `features/valuation/`: valuation workspace, summary blocks, heatmap, and transparency view
- `components/forms/`: structured assumptions editor
- `components/charts/`: Recharts visualizations
- `api/`: typed HTTP client wrappers
- `lib/`: formatting, exports, theming, defaults

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- `uv` installed locally for Python workflows
- npm

### Backend

```bash
cd dcf-app/backend
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
```

Backend API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd dcf-app/frontend
npm install
npm run dev
```

Frontend app: [http://localhost:5173](http://localhost:5173)

### Docker Compose

```bash
cd dcf-app
docker compose up --build
```

This starts:

- backend on `http://localhost:8000`
- frontend on `http://localhost:5173`

## Test Commands

### Backend tests

```bash
cd dcf-app/backend
uv sync --extra dev
uv run pytest
```

### Frontend tests

```bash
cd dcf-app/frontend
npm install
npm run test
```

## API Overview

All endpoints live under `/api/v1`.

- `GET /health`
- `POST /dcf/calculate`
- `POST /dcf/sensitivity`
- `POST /dcf/scenario/compare`
- `POST /dcf/reverse`
- `POST /dcf/target-return`
- `GET /models`
- `POST /models`
- `GET /models/{id}`
- `PUT /models/{id}`
- `DELETE /models/{id}`
- `POST /models/{id}/duplicate`

## Assumptions Model

Each scenario captures:

- revenue starting point and yearly growth path
- EBIT margin path
- tax rate
- D&A, capex, and working-capital assumptions
- stock-based compensation
- optional net borrowing for FCFE
- discount rate / WACC
- Gordon Growth or exit multiple terminal value
- cash, debt, preferred equity, minority interest
- diluted shares outstanding
- current market price
- margin of safety
- currency symbol

Saved models contain one or more scenarios, typically `bear`, `base`, and `bull`, plus metadata like name, description, default scenario, and timestamps.

## Financial Formulas Implemented

### Forecast build

- `Revenue_t = Revenue_(t-1) * (1 + Growth Rate_t)`
- `EBIT_t = Revenue_t * EBIT Margin_t`
- `NOPAT_t = EBIT_t - Cash Taxes_t`

### FCFF

- `FCFF = EBIT * (1 - tax_rate) + D&A + SBC - Capex - Change in NWC`

### FCFE

- `FCFE = FCFF + Net Borrowing`

### Gordon Growth terminal value

- `TV = FCF_(n+1) / (discount_rate - g)`
- `FCF_(n+1) = FCF_n * (1 + g)`

### Exit multiple terminal value

- `TV = Terminal EBITDA * Exit Multiple`

### Enterprise to equity bridge

- `Equity Value = Enterprise Value + Cash - Debt - Preferred Equity - Minority Interest`

### Per share value

- `Intrinsic Value / Share = Equity Value / Diluted Shares Outstanding`

### Upside / downside

- `Upside / Downside % = (Intrinsic Value / Current Price - 1) * 100`

### Target return mode

- `Max Buy Price Today = Intrinsic Value / (1 + Target Return) ^ Holding Period`

### Margin of safety price

- `Buy Under Price = Intrinsic Value * (1 - Margin of Safety)`

## Reverse DCF

Reverse DCF lets the app solve for the assumption required to justify the market price:

- implied constant annual revenue growth
- implied target operating margin

The solver uses a bounded binary search and reruns the same DCF engine each iteration.

## How To Use

If you are new to DCF, the simplest workflow is:

1. Start with the `base` scenario.
2. Enter current revenue, operating margin, tax rate, and shares outstanding.
3. Add a revenue growth assumption for the next 5-10 years.
4. Choose whether margins stay flat or improve toward a target.
5. Estimate reinvestment needs through D&A, capex, and working capital.
6. Set a discount rate that reflects the business risk.
7. Choose a terminal method:
   Gordon Growth if you want a long-run steady-state value.
   Exit Multiple if you prefer a market-style terminal benchmark.
8. Review the intrinsic value per share and compare it with the current price.
9. Use bear/base/bull scenarios to see how sensitive your thesis is.
10. Use the sensitivity table to understand which assumptions matter most.
11. Use reverse DCF to see what growth or margin expectations the current market price already implies.
12. Use target return mode and margin of safety to decide what price you would actually want to pay.

## Screenshots

- Dashboard placeholder
- Valuation workspace placeholder
- Sensitivity heatmap placeholder
- Scenario comparison placeholder

Add screenshots here once the app is running locally and UI snapshots are available.

## Example Demo Data

The backend seeds three example models on first run:

- Vertex Cloud
- North River Industrials
- Harbor Retail

These are synthetic examples meant to demonstrate high-growth, mature, and cyclical modeling patterns.

## Tradeoffs

- SQLite keeps local setup simple, while the repository boundary leaves room for a later PostgreSQL implementation.
- FCFE is intentionally explicit about net borrowing instead of hiding leverage assumptions in a more opaque schedule.
- Reverse DCF currently solves against one assumption at a time to keep the result interpretable.
- Exit-multiple terminal value in FCFE mode holds current bridge items constant for terminal equity conversion.

## Future Enhancements

- PostgreSQL repository implementation
- Monte Carlo valuation range simulation
- CSV import for assumptions
- PDF export for investment memos
- assumption locking and cloning tools for scenario design
- richer validation hints and inline field error messaging
- authentication and multi-user collaboration


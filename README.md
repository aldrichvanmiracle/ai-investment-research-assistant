# AI Investment Research Assistant

AI powered research tool for stock and crypto analysis, built as a full stack portfolio project combining backend engineering, RAG (Retrieval-Augmented Generation), and real-time financial data synthesis.

> **Disclaimer:** This tool provides informational analysis only. It is not financial advice.

## Features

### Research

- **Company Analysis** — AI-generated analysis of any stock or crypto asset (industry, business model, risks, opportunities)
- **News & Sentiment** — Real-time sentiment analysis powered by Google Search grounding, with a sentiment score, cached for repeated queries to reduce API load
- **Compare Assets** — Compare multiple tickers side-by-side in a single request
- **Financial Document Q&A (RAG)** — Upload financial reports (PDF) and ask questions answered directly from the document content, including valuation metrics (P/E, PBV) when a market price is provided

### Portfolio

- **Investment Thesis** — Structure your investment reasoning into a Bull Case, Bear Case, key metrics to monitor, and a conclusion. Every thesis is saved and can be revisited later — designed to mirror how real investors document and track their reasoning over time, not just a one-off AI answer
- **Wealth Dashboard** — Track net worth across cash, stocks, bonds, property, gold, and crypto, with automatic allocation breakdown and concentration risk warnings. Stored locally in the browser (no server round-trip)
- **History** — Unified timeline of past Company Analyses and Investment Theses

## Tech Stack

**Backend**

- FastAPI (Python)
- PostgreSQL + SQLAlchemy
- ChromaDB (vector database for RAG)
- Google Gemini API (`gemini-flash-latest`, `gemini-embedding-001`) with Google Search grounding

**Frontend**

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- react-markdown

**Deployment**

- Frontend: Vercel
- Backend + PostgreSQL: Railway

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js    │─────▶│   FastAPI    │─────▶│  PostgreSQL  │
│  (Vercel)    │◀─────│  (Railway)   │◀─────│  (Railway)   │
└─────────────┘      └──────┬───────┘      └─────────────┘
                             │
                 ┌───────────┼───────────┐
                 ▼                       ▼
          ┌─────────────┐        ┌─────────────┐
          │  ChromaDB    │        │ Gemini API   │
          │  (Vectors)   │        │ (LLM + Search)│
          └─────────────┘        └─────────────┘
```

## How RAG Works Here

1. PDF is parsed and split into overlapping text chunks
2. Chunks are embedded in a single batched API call and stored in ChromaDB
3. On a question, the query is embedded and matched against stored chunks by similarity
4. The most relevant chunks are injected into the LLM prompt as grounding context
5. The model answers strictly from that context — reducing hallucination and enabling accurate financial calculations (e.g. valuation ratios) sourced from the actual document

## UI Design Decisions

- **Home dashboard** with tool cards (Research vs Portfolio) instead of a flat tab list — reflects that research and portfolio tracking are distinct workflows, not equal-weight menu items
- **Hero section** on the home screen gives users a clear entry point ("Mulai Riset") instead of an ambiguous grid of equal options
- Each tool card carries a small badge (AI Generated / Live Data / RAG) to set expectations about how that feature's output is produced
- **Investment Thesis output** is parsed from markdown into distinct Bull Case / Bear Case / Watch / Conclusion cards rather than shown as raw text, with a safe fallback to plain markdown if parsing fails
- **Mobile navigation** uses a bottom tab bar (Home / Research / Thesis / Wealth / History) instead of a hamburger menu, closer to a native app pattern
- Icons use Lucide React instead of emoji for a more professional, consistent visual language
- Financial figures use tabular formatting for readability; sentiment results use ▲/▼ indicators, a convention borrowed from real trading terminals

## Vision

This project is currently a research and portfolio-tracking tool, but the underlying thesis behind it is broader: most Indonesian retail investors have their assets scattered across separate platforms (Bibit for mutual funds, Stockbit for stocks, Tokocrypto for crypto, physical gold, property) with no single place that helps them **think** about the whole picture.

Existing platforms in this space are transaction-first — they earn from trading fees or AUM, and their tools are built to drive transactions, not necessarily better decisions. There's a real gap for a **decision-intelligence layer** that sits above those platforms rather than competing with them for transaction volume: something closer to "a research copilot for retail investors" than another brokerage app.

The features already built here point in that direction rather than toward becoming a marketplace or transaction platform:

- **Analysis, Sentiment, Compare, RAG** → structured research, not trade execution
- **Investment Thesis** → documenting _why_ a decision was made, not just what to buy
- **Wealth Dashboard** → understanding the full picture, not managing one asset class

The most interesting extension of this idea, and one that doesn't exist in most retail investment apps, is closing the loop on Investment Thesis: letting a user write down their reasoning today, and having the system check months later whether that reasoning still holds up against what actually happened. Very few retail tools help investors track whether they were _right for the right reasons_ — most only show whether the price went up.

This section exists to document product thinking, not as a commitment to build all of this. The current scope is intentionally limited to what's useful, testable, and maintainable as a solo project.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- A [Google AI Studio](https://aistudio.google.com/) API key (free tier available)

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/investment_analyst_db
GEMINI_API_KEY=your_gemini_api_key
```

Create the database, then run:

```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000` — interactive API docs at `/docs`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` if pointing to a deployed backend:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
```

Frontend runs at `http://localhost:3000`.

## API Endpoints

## API Endpoints

| Method | Endpoint           | Description                                                             |
| ------ | ------------------ | ----------------------------------------------------------------------- |
| POST   | `/analyze`         | Analyze an asset by name/ticker                                         |
| GET    | `/history`         | Retrieve all past analyses                                              |
| POST   | `/upload-document` | Upload a PDF for RAG processing                                         |
| POST   | `/ask-document`    | Ask a question grounded in uploaded documents                           |
| POST   | `/sentiment`       | Get real-time sentiment analysis for an asset (cached 5 min per ticker) |
| POST   | `/compare`         | Compare multiple assets side-by-side                                    |
| POST   | `/thesis`          | Generate a structured investment thesis (Bull/Bear/Watch/Conclusion)    |
| GET    | `/thesis`          | Retrieve all past investment theses                                     |

## Known Limitations

- Free tier Gemini API has daily rate limits on embeddings and search-grounded requests; sentiment analysis caches results for 5 minutes per ticker to reduce this risk
- Sentiment scoring uses a simple keyword-based heuristic layered on top of the LLM's qualitative analysis, not a dedicated NLP sentiment model
- Wealth Dashboard data is stored in browser `localStorage` only — it is not synced across devices and is lost if browser storage is cleared
- The company subtitle shown under analysis results is extracted heuristically from the AI's response text, not a verified data source
- No authentication layer — intended as a single-user local/demo tool

## Roadmap / Future Ideas

- PDF export of Investment Thesis and Analysis reports
- Persist Wealth Dashboard data server-side (optional login)
- Watchlist with periodic price/sentiment refresh
- Compare prior thesis predictions against actual outcomes over time
- Automated thesis re-check: periodically re-evaluate saved theses against updated company data and flag if the original reasoning still holds

## Author

Built independently by Ignatius Michael Aldrich Van Miracle, an Information Systems student at Binus University, as a self-driven portfolio project during semester break — not a coursework or campus-affiliated assignment.

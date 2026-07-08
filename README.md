# AI Investment Research Assistant

AI-powered research tool for stock and crypto analysis — built as a full-stack portfolio project combining backend engineering, RAG (Retrieval-Augmented Generation), and real-time financial data synthesis.

> **Disclaimer:** This tool provides informational analysis only. It is not financial advice.

## Features

- **Asset Intelligence** — AI-generated analysis of any stock or crypto asset (industry, business model, risks, opportunities)
- **Document RAG** — Upload financial reports (PDF) and ask questions answered directly from the document content, including valuation metrics (P/E, PBV) when a market price is provided
- **News & Sentiment** — Real-time sentiment analysis powered by Google Search grounding, with a sentiment score and recent news summary
- **Multi-Asset Comparison** — Compare multiple tickers side-by-side in a single request
- **Analysis History** — Every analysis is persisted to PostgreSQL and retrievable later

## Tech Stack

**Backend**

- FastAPI (Python)
- PostgreSQL + SQLAlchemy
- ChromaDB (vector database for RAG)
- Google Gemini API (`gemini-2.5-flash`, `gemini-embedding-001`) with Google Search grounding

**Frontend**

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- react-markdown

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js    │─────▶│   FastAPI    │─────▶│  PostgreSQL  │
│  (Frontend)  │◀─────│  (Backend)   │◀─────│  (History)   │
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
2. Each chunk is embedded via Gemini's embedding model and stored in ChromaDB
3. On a question, the query is embedded and matched against stored chunks by similarity
4. The most relevant chunks are injected into the LLM prompt as grounding context
5. The model answers strictly from that context — reducing hallucination and enabling accurate financial calculations (e.g. valuation ratios) sourced from the actual document

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

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/investment_analyst_db
GEMINI_API_KEY=your_gemini_api_key

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

Frontend runs at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint           | Description                                   |
| ------ | ------------------ | --------------------------------------------- |
| POST   | `/analyze`         | Analyze an asset by name/ticker               |
| GET    | `/history`         | Retrieve all past analyses                    |
| POST   | `/upload-document` | Upload a PDF for RAG processing               |
| POST   | `/ask-document`    | Ask a question grounded in uploaded documents |
| POST   | `/sentiment`       | Get real-time sentiment analysis for an asset |
| POST   | `/compare`         | Compare multiple assets side-by-side          |

## Known Limitations

- Free tier Gemini API has daily rate limits on embeddings, which can throttle document uploads under heavy testing
- Sentiment scoring uses a simple keyword-based heuristic layered on top of the LLM's qualitative analysis, not a dedicated NLP sentiment model
- No authentication layer — intended as a single-user local/demo tool

## Author

Built independently by Ignatius Michael Aldrich Van Miracle, an Information Systems student at Binus University, as a self driven portfolio project during semester break, not a coursework or campus affiliated assignment.

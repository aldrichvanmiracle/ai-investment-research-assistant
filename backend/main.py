from ai_service import analyze_company, analyze_sentiment
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from database import engine, Base, get_db
import models
from fastapi import UploadFile, File
import shutil
import os
from rag_service import process_and_store_document, query_document

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Investment Research Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-investment-research-assistant.vercel.app"
    ],
    ...
)

class AnalyzeRequest(BaseModel):
    query: str
class CompareRequest(BaseModel):
    tickers: list[str]

@app.get("/")
def read_root():
    return {"message": "Backend AI Investment Research Assistant berjalan!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze")
def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    result_text = analyze_company(request.query)

    # Simpan ke database
    new_result = models.AnalysisResult(
        query=request.query,
        analysis=result_text,
        created_at=datetime.utcnow()
    )
    db.add(new_result)
    db.commit()
    db.refresh(new_result)

    return {
        "id": new_result.id,
        "query": new_result.query,
        "analysis": new_result.analysis,
        "created_at": new_result.created_at
    }

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    results = db.query(models.AnalysisResult).order_by(models.AnalysisResult.created_at.desc()).all()
    return results

@app.get("/history/{result_id}")
def get_history_detail(result_id: int, db: Session = Depends(get_db)):
    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.id == result_id).first()
    return result

class DocumentQuestionRequest(BaseModel):
    question: str
    current_price: float | None = None

@app.post("/ask-document")
def ask_document(request: DocumentQuestionRequest):
    answer = query_document(request.question, request.current_price)
    return {
        "question": request.question,
        "answer": answer
    }

@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    upload_dir = "uploaded_docs"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    chunk_count = process_and_store_document(file_path, file.filename)

    return {
        "filename": file.filename,
        "message": f"Dokumen berhasil diproses menjadi {chunk_count} bagian.",
        "chunks": chunk_count
    }

@app.post("/sentiment")
def get_sentiment(request: AnalyzeRequest):
    result = analyze_sentiment(request.query)
    return result


@app.post("/compare")
def compare_assets(request: CompareRequest):
    results = []
    for ticker in request.tickers:
        analysis = analyze_company(ticker)
        results.append({
            "ticker": ticker,
            "analysis": analysis
        })
    return {"comparisons": results}
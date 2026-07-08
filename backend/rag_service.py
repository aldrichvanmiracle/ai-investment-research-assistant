import os
import chromadb
from pypdf import PdfReader
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ChromaDB - vector database lokal, datanya tersimpan di folder "chroma_data"
chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection = chroma_client.get_or_create_collection(name="documents")


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def get_embedding(text: str) -> list[float]:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values


def process_and_store_document(file_path: str, document_name: str) -> int:
    text = extract_text_from_pdf(file_path)
    chunks = chunk_text(text)

    # Batch embedding - kirim semua chunks sekaligus dalam 1 API call
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=chunks
    )
    embeddings = [emb.values for emb in result.embeddings]

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        collection.add(
            ids=[f"{document_name}_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"document_name": document_name, "chunk_index": i}]
        )

    return len(chunks)


def query_document(question: str, current_price: float = None) -> str:
    question_embedding = get_embedding(question)

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=5
    )

    relevant_chunks = results["documents"][0]
    context = "\n\n---\n\n".join(relevant_chunks)

    price_info = f"\nHarga saham saat ini (jika relevan untuk valuasi): Rp{current_price}" if current_price else ""

    prompt = f"""
Kamu adalah analis keuangan yang menjawab pertanyaan berdasarkan konteks dokumen di bawah ini.

KONTEKS DOKUMEN:
{context}
{price_info}

PERTANYAAN:
{question}

INSTRUKSI:
- Jika pertanyaan meminta rasio atau valuasi (seperti ROE, ROA, P/E, PBV, Net Profit Margin, Debt-to-Equity), HITUNG menggunakan data dari dokumen di atas.
- Tunjukkan rumus yang dipakai dan angka yang digunakan, supaya perhitungan transparan dan bisa diverifikasi.
- Jika data yang dibutuhkan untuk perhitungan tidak tersedia di dokumen (misalnya harga saham untuk P/E, jika tidak diberikan), katakan dengan jujur data tersebut tidak tersedia.
- Jika informasi umum tidak ditemukan dalam konteks, katakan dengan jujur bahwa informasi tersebut tidak tersedia dalam dokumen.

Jawab dengan jelas, sertakan angka spesifik dan rumus perhitungan jika relevan.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text
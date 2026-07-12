import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Cache sederhana untuk sentiment: {ticker: (timestamp, hasil)}
_sentiment_cache = {}
CACHE_DURATION_SECONDS = 300  # 5 menit


def analyze_company(query: str) -> str:
    prompt = f"""
Kamu adalah seorang analis riset investasi profesional.
Berikan analisis singkat dan terstruktur tentang perusahaan/aset berikut: {query}

Format output:
1. Profil singkat (apa perusahaan/aset ini, sektor)
2. Karakteristik utama (model bisnis, posisi pasar)
3. Faktor yang perlu diperhatikan investor (risiko maupun peluang)

PENTING: Jangan berikan rekomendasi beli/jual. Ini hanya analisis informasional, bukan saran investasi.
"""
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )
    return response.text


def analyze_sentiment(ticker: str) -> dict:
    ticker_key = ticker.strip().upper()

    # Cek cache dulu - kalau ada dan belum kedaluwarsa, langsung pakai
    if ticker_key in _sentiment_cache:
        cached_time, cached_result = _sentiment_cache[ticker_key]
        if time.time() - cached_time < CACHE_DURATION_SECONDS:
            return cached_result

    prompt = f"""
Kamu adalah analis sentimen pasar keuangan profesional.
Lakukan analisis sentimen terkini untuk aset berikut: {ticker}

Berikan output dalam format ini:
1. SENTIMEN KESELURUHAN: [POSITIF/NEGATIF/NETRAL] dengan skor -100 hingga +100
2. RINGKASAN BERITA TERKINI: (3-5 poin berita atau isu terbaru yang mempengaruhi aset ini)
3. FAKTOR PENDORONG SENTIMEN: (apa yang membuat sentimen seperti ini)
4. RISIKO JANGKA PENDEK: (isu yang perlu diwaspadai dalam 1-3 bulan ke depan)

PENTING: Fokus pada informasi terkini dan faktual. Jangan berikan rekomendasi beli/jual.
"""

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
            config={
                "tools": [{"google_search": {}}],
            }
        )
        response_text = response.text
    except Exception as e:
        error_message = str(e)
        if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message:
            return {
                "ticker": ticker,
                "sentiment_label": "TIDAK TERSEDIA",
                "analysis": "Fitur sentiment sedang mencapai batas kuota API gratis untuk hari ini. Silakan coba lagi dalam beberapa saat, atau gunakan fitur Analisis Aset dan Perbandingan yang tidak terpengaruh oleh limit ini."
            }
        else:
            return {
                "ticker": ticker,
                "sentiment_label": "ERROR",
                "analysis": f"Terjadi kesalahan saat mengambil data sentimen: {error_message}"
            }

    # Hitung skor sentimen sederhana berdasarkan kata kunci
    text_lower = response_text.lower()
    positive_words = ["positif", "naik", "meningkat", "pertumbuhan", "bullish", "kuat", "optimis"]
    negative_words = ["negatif", "turun", "menurun", "bearish", "lemah", "pesimis", "risiko"]

    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    if positive_count > negative_count:
        sentiment_label = "POSITIF"
    elif negative_count > positive_count:
        sentiment_label = "NEGATIF"
    else:
        sentiment_label = "NETRAL"

    result = {
        "ticker": ticker,
        "sentiment_label": sentiment_label,
        "analysis": response_text
    }

    # Simpan ke cache supaya request berikutnya untuk ticker sama tidak panggil API lagi
    _sentiment_cache[ticker_key] = (time.time(), result)

    return result

def generate_thesis(ticker: str, reasons: str) -> str:
    prompt = f"""
    Kamu adalah portfolio manager berpengalaman yang membantu investor menyusun investment thesis yang terstruktur dan jernih.
    Ticker/Aset: {ticker}
    Alasan investor tertarik pada aset ini:
    {reasons}
    Susun investment thesis dengan format berikut:
    ## Bull Case
    # (3-4 poin faktor yang mendukung tesis ini benar - kaitkan dengan alasan yang diberikan investor)
    # ## Bear Case
    # (3-4 poin risiko atau faktor yang bisa membuat tesis ini salah)
    # ## Key Metrics to Monitor
    # (3-5 metrik spesifik yang harus dipantau untuk memvalidasi atau membatalkan tesis ini seiring waktu)
    # ## Kesimpulan
    # (Ringkasan singkat dan netral. JANGAN memberikan rekomendasi beli/jual - tujuannya membantu investor berpikir jernih dan terdokumentasi, bukan menggantikan keputusan mereka)
    """
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )
    return response.text
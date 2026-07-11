import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config={
            "tools": [{"google_search": {}}],
        }
    )
    
    # Hitung skor sentimen sederhana berdasarkan kata kunci
    text = response.text.lower()
    positive_words = ["positif", "naik", "meningkat", "pertumbuhan", "bullish", "kuat", "optimis"]
    negative_words = ["negatif", "turun", "menurun", "bearish", "lemah", "pesimis", "risiko"]
    
    positive_count = sum(1 for word in positive_words if word in text)
    negative_count = sum(1 for word in negative_words if word in text)
    
    if positive_count > negative_count:
        sentiment_label = "POSITIF"
    elif negative_count > positive_count:
        sentiment_label = "NEGATIF"
    else:
        sentiment_label = "NETRAL"
    
    return {
        "ticker": ticker,
        "sentiment_label": sentiment_label,
        "analysis": response.text
    }
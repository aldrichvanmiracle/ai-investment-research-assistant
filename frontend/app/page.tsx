"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface AnalysisResult {
  id: number;
  query: string;
  analysis: string;
  created_at: string;
}

interface SentimentResult {
  ticker: string;
  sentiment_label: string;
  analysis: string;
}

interface ComparisonResult {
  ticker: string;
  analysis: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [docQuestion, setDocQuestion] = useState("");
  const [docAnswer, setDocAnswer] = useState("");
  const [askingDoc, setAskingDoc] = useState(false);
  const [currentPrice, setCurrentPrice] = useState("");
  const [sentimentQuery, setSentimentQuery] = useState("");
  const [sentimentResult, setSentimentResult] =
    useState<SentimentResult | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [compareResults, setCompareResults] = useState<ComparisonResult[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [activeTab, setActiveTab] = useState("analisis");

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history");
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResult(data);
      fetchHistory();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadMessage("");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const res = await fetch("http://127.0.0.1:8000/upload-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadMessage(data.message || "Dokumen berhasil di-upload!");
    } catch (error) {
      console.error("Error:", error);
      setUploadMessage("Gagal upload dokumen.");
    } finally {
      setUploading(false);
    }
  };

  const handleAskDocument = async () => {
    if (!docQuestion.trim()) return;
    setAskingDoc(true);
    setDocAnswer("");
    try {
      const res = await fetch("http://127.0.0.1:8000/ask-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: docQuestion,
          current_price: currentPrice ? parseFloat(currentPrice) : null,
        }),
      });
      const data = await res.json();
      setDocAnswer(data.answer);
    } catch (error) {
      console.error("Error:", error);
      setDocAnswer("Terjadi kesalahan saat mengambil jawaban.");
    } finally {
      setAskingDoc(false);
    }
  };

  const handleSentiment = async () => {
    if (!sentimentQuery.trim()) return;
    setLoadingSentiment(true);
    setSentimentResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sentimentQuery }),
      });
      const data = await res.json();
      setSentimentResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingSentiment(false);
    }
  };

  const handleCompare = async () => {
    if (!compareInput.trim()) return;
    const tickers = compareInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tickers.length < 2) {
      alert(
        "Masukkan minimal 2 ticker, pisahkan dengan koma. Contoh: BBCA, BBRI, BMRI",
      );
      return;
    }
    setLoadingCompare(true);
    setCompareResults([]);
    try {
      const res = await fetch("http://127.0.0.1:8000/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      const data = await res.json();
      setCompareResults(data.comparisons);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingCompare(false);
    }
  };

  const tabs = [
    { id: "analisis", label: "Analisis Aset" },
    { id: "sentiment", label: "News & Sentiment" },
    { id: "compare", label: "Perbandingan" },
    { id: "dokumen", label: "Tanya Dokumen" },
    { id: "riwayat", label: "Riwayat" },
  ];

  const sentimentColor = (label: string) => {
    if (label === "POSITIF") return "bg-green-100 text-green-800";
    if (label === "NEGATIF") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-8 py-6 mb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Investment Research Assistant
          </h1>
          <p className="text-gray-500 mt-1">
            Riset aset berbasis AI - saham & crypto - bukan saran investasi
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-lg shadow p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Analisis Aset */}
        {activeTab === "analisis" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Analisis Aset</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: BBCA, ANTM, Bitcoin..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Menganalisis..." : "Analisis"}
              </button>
            </div>
            {result && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 uppercase">
                  {result.query}
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{result.analysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: News & Sentiment */}
        {activeTab === "sentiment" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-1">News & Sentiment</h2>
            <p className="text-sm text-gray-500 mb-4">
              AI mencari berita terkini dan menganalisis sentimen pasar secara
              real-time.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={sentimentQuery}
                onChange={(e) => setSentimentQuery(e.target.value)}
                placeholder="Contoh: BBCA, Bitcoin, ANTM..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleSentiment()}
              />
              <button
                onClick={handleSentiment}
                disabled={loadingSentiment}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loadingSentiment ? "Menganalisis..." : "Cek Sentimen"}
              </button>
            </div>
            {sentimentResult && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-bold uppercase">
                    {sentimentResult.ticker}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${sentimentColor(sentimentResult.sentiment_label)}`}
                  >
                    {sentimentResult.sentiment_label}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                  <ReactMarkdown>{sentimentResult.analysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Perbandingan */}
        {activeTab === "compare" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-1">Perbandingan Aset</h2>
            <p className="text-sm text-gray-500 mb-4">
              Bandingkan beberapa aset sekaligus. Pisahkan ticker dengan koma.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Contoh: BBCA, BBRI, BMRI"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
              <button
                onClick={handleCompare}
                disabled={loadingCompare}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                {loadingCompare ? "Membandingkan..." : "Bandingkan"}
              </button>
            </div>
            {compareResults.length > 0 && (
              <div className="space-y-4 mt-4">
                {compareResults.map((item) => (
                  <div
                    key={item.ticker}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-bold text-lg uppercase mb-3 text-purple-700">
                      {item.ticker}
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown>{item.analysis}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Tanya Dokumen */}
        {activeTab === "dokumen" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-1">Tanya Jawab Dokumen</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload laporan keuangan (PDF), lalu tanyakan apa saja - termasuk
              valuasi P/E dan PBV.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
              >
                {uploading ? "Mengupload..." : "Upload PDF"}
              </button>
            </div>
            {uploadMessage && (
              <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2 mb-4">
                {uploadMessage}
              </p>
            )}
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Harga saham saat ini (opsional, untuk hitung P/E dan PBV)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={docQuestion}
                onChange={(e) => setDocQuestion(e.target.value)}
                placeholder="Tanya sesuatu tentang dokumen, misal: berapa P/E ratio saham ini?"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyDown={(e) => e.key === "Enter" && handleAskDocument()}
              />
              <button
                onClick={handleAskDocument}
                disabled={askingDoc}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {askingDoc ? "Mencari..." : "Tanya"}
              </button>
            </div>
            {docAnswer && (
              <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                <ReactMarkdown>{docAnswer}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Tab: Riwayat */}
        {activeTab === "riwayat" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Riwayat Analisis</h2>
            {history.length === 0 && (
              <p className="text-sm text-gray-400">
                Belum ada riwayat analisis.
              </p>
            )}
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setResult(item);
                    setActiveTab("analisis");
                  }}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <p className="font-medium uppercase">{item.query}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </main>
  );
}

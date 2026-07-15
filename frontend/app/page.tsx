"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Home as HomeIcon,
  BarChart3,
  Newspaper,
  Scale,
  FileText,
  Lightbulb,
  Wallet,
  History as HistoryIcon,
  type LucideIcon,
} from "lucide-react";

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

interface ThesisResult {
  id: number;
  ticker: string;
  reasons: string;
  analysis: string;
  created_at: string;
}

// ---------- Helpers ----------

function useRotatingMessages(active: boolean, messages: string[]) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [active, messages.length]);
  return messages[idx];
}

function relativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID");
}

function extractSubtitle(analysis: string): string | null {
  const cleaned = analysis.replace(/[#*_`]/g, "");
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (
      line.length > 15 &&
      line.length < 100 &&
      !/^\d/.test(line) &&
      !line.endsWith(":")
    ) {
      return line;
    }
  }
  return null;
}

interface ThesisSections {
  bull?: string;
  bear?: string;
  watch?: string;
  conclusion?: string;
}

function parseThesis(text: string): ThesisSections | null {
  const markers: { key: keyof ThesisSections; regex: RegExp }[] = [
    { key: "bull", regex: /##\s*bull case/i },
    { key: "bear", regex: /##\s*bear case/i },
    { key: "watch", regex: /##\s*key metrics[^\n]*/i },
    { key: "conclusion", regex: /##\s*kesimpulan/i },
  ];
  const found: { key: keyof ThesisSections; index: number }[] = [];
  for (const m of markers) {
    const match = text.match(m.regex);
    if (match && match.index !== undefined) {
      found.push({ key: m.key, index: match.index });
    }
  }
  if (found.length === 0) return null;
  found.sort((a, b) => a.index - b.index);
  const sections: ThesisSections = {};
  for (let i = 0; i < found.length; i++) {
    const start = found[i].index;
    const end = i + 1 < found.length ? found[i + 1].index : text.length;
    let chunk = text.substring(start, end);
    chunk = chunk.replace(/##[^\n]*\n/, "").trim();
    sections[found[i].key] = chunk;
  }
  return sections;
}

// ---------- Small UI building blocks ----------

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow p-4 md:p-6">{children}</div>
);

const SectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <h2 className="text-lg md:text-xl font-semibold mb-1 flex items-center gap-2">
    <Icon size={20} className="text-blue-600" />
    {children}
  </h2>
);

const ExampleChip = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition"
  >
    {label}
  </button>
);

const EmptyState = ({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  children?: React.ReactNode;
}) => (
  <div className="text-center py-10 px-4">
    <Icon size={36} className="mx-auto text-gray-300 mb-3" />
    <h3 className="text-base font-semibold text-gray-700 mb-2">{title}</h3>
    {children}
    <p className="text-sm text-gray-400 mt-4">{hint}</p>
  </div>
);

const RotatingLoader = ({ message }: { message: string }) => (
  <div className="py-10 text-center">
    <div className="inline-flex items-center gap-2 text-gray-500 text-sm mb-4">
      <span className="animate-pulse">{message}</span>
    </div>
    <div className="space-y-2 max-w-md mx-auto animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6 mx-auto" />
      <div className="h-3 bg-gray-200 rounded w-4/6 mx-auto" />
    </div>
  </div>
);

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
  const [activeTab, setActiveTab] = useState("home");

  const [thesisTicker, setThesisTicker] = useState("");
  const [thesisReasons, setThesisReasons] = useState("");
  const [thesisResult, setThesisResult] = useState<ThesisResult | null>(null);
  const [loadingThesis, setLoadingThesis] = useState(false);
  const [thesisHistory, setThesisHistory] = useState<ThesisResult[]>([]);

  // Wealth Dashboard state
  const [wealthData, setWealthData] = useState({
    cash: "0",
    stocks: "0",
    bonds: "0",
    property: "0",
    gold: "0",
    crypto: "0",
    debt: "0",
  });

  useEffect(() => {
    const saved = localStorage.getItem("wealthData");
    if (saved) {
      try {
        setWealthData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved wealth data");
      }
    }
  }, []);

  const updateWealthField = (field: string, value: string) => {
    const updated = { ...wealthData, [field]: value };
    setWealthData(updated);
    localStorage.setItem("wealthData", JSON.stringify(updated));
  };

  const calculateNetWorth = () => {
    const cash = parseFloat(wealthData.cash) || 0;
    const stocks = parseFloat(wealthData.stocks) || 0;
    const bonds = parseFloat(wealthData.bonds) || 0;
    const property = parseFloat(wealthData.property) || 0;
    const gold = parseFloat(wealthData.gold) || 0;
    const crypto = parseFloat(wealthData.crypto) || 0;
    const debt = parseFloat(wealthData.debt) || 0;

    const totalAssets = cash + stocks + bonds + property + gold + crypto;
    const netWorth = totalAssets - debt;

    const rawAllocation = { cash, stocks, bonds, property, gold, crypto };

    const allocation =
      totalAssets > 0
        ? {
            cash: (cash / totalAssets) * 100,
            stocks: (stocks / totalAssets) * 100,
            bonds: (bonds / totalAssets) * 100,
            property: (property / totalAssets) * 100,
            gold: (gold / totalAssets) * 100,
            crypto: (crypto / totalAssets) * 100,
          }
        : { cash: 0, stocks: 0, bonds: 0, property: 0, gold: 0, crypto: 0 };

    const maxAllocation = Math.max(
      allocation.cash,
      allocation.stocks,
      allocation.bonds,
      allocation.property,
      allocation.gold,
      allocation.crypto,
    );

    let largestLabel = "-";
    let largestValue = 0;
    Object.entries(rawAllocation).forEach(([key, val]) => {
      if (val > largestValue) {
        largestValue = val;
        largestLabel = key;
      }
    });

    const concentrationWarning = maxAllocation > 70;

    return {
      totalAssets,
      netWorth,
      debt,
      allocation,
      concentrationWarning,
      maxAllocation,
      largestLabel,
    };
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const fetchThesisHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/thesis`);
      const data = await res.json();
      setThesisHistory(data);
    } catch (error) {
      console.error("Error fetching thesis history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchThesisHistory();
  }, []);

  const handleAnalyze = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
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
      const res = await fetch(`${API_URL}/upload-document`, {
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
      const res = await fetch(`${API_URL}/ask-document`, {
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

  const handleSentiment = async (overrideQuery?: string) => {
    const q = overrideQuery ?? sentimentQuery;
    if (!q.trim()) return;
    setLoadingSentiment(true);
    setSentimentResult(null);
    try {
      const res = await fetch(`${API_URL}/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setSentimentResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingSentiment(false);
    }
  };

  const handleCompare = async (overrideInput?: string) => {
    const input = overrideInput ?? compareInput;
    if (!input.trim()) return;
    const tickers = input
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
      const res = await fetch(`${API_URL}/compare`, {
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

  const handleGenerateThesis = async () => {
    if (!thesisTicker.trim() || !thesisReasons.trim()) return;
    setLoadingThesis(true);
    setThesisResult(null);
    try {
      const res = await fetch(`${API_URL}/thesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: thesisTicker,
          reasons: thesisReasons,
        }),
      });
      const data = await res.json();
      setThesisResult(data);
      fetchThesisHistory();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingThesis(false);
    }
  };

  const sentimentColor = (label: string) => {
    if (label === "POSITIF") return "bg-green-100 text-green-800";
    if (label === "NEGATIF") return "bg-red-100 text-red-800";
    if (label === "TIDAK TERSEDIA" || label === "ERROR")
      return "bg-gray-100 text-gray-600";
    return "bg-yellow-100 text-yellow-800";
  };

  const wealth = calculateNetWorth();

  const allocationColors: Record<string, string> = {
    cash: "bg-green-500",
    stocks: "bg-blue-500",
    bonds: "bg-indigo-500",
    property: "bg-purple-500",
    gold: "bg-yellow-500",
    crypto: "bg-orange-500",
  };

  const allocationLabels: Record<string, string> = {
    cash: "Cash",
    stocks: "Saham",
    bonds: "Obligasi",
    property: "Properti",
    gold: "Emas & Komoditas",
    crypto: "Crypto",
  };

  const wealthFields = [
    { key: "cash", label: "Cash (Rp)" },
    { key: "stocks", label: "Saham (Rp)" },
    { key: "bonds", label: "Obligasi (Rp)" },
    { key: "property", label: "Properti (Rp)" },
    { key: "gold", label: "Emas & Komoditas (Rp)" },
    { key: "crypto", label: "Crypto (Rp)" },
    { key: "debt", label: "Hutang (Rp)" },
  ];

  const researchTools: {
    id: string;
    icon: LucideIcon;
    title: string;
    desc: string;
  }[] = [
    {
      id: "analisis",
      icon: BarChart3,
      title: "Company Analysis",
      desc: "Analisis mendalam saham & crypto",
    },
    {
      id: "sentiment",
      icon: Newspaper,
      title: "News & Sentiment",
      desc: "Sentimen pasar dan berita terkini",
    },
    {
      id: "compare",
      icon: Scale,
      title: "Compare Assets",
      desc: "Bandingkan beberapa investasi",
    },
    {
      id: "dokumen",
      icon: FileText,
      title: "Financial Document Q&A",
      desc: "Tanya jawab dari laporan keuangan",
    },
  ];

  const portfolioTools: {
    id: string;
    icon: LucideIcon;
    title: string;
    desc: string;
  }[] = [
    {
      id: "thesis",
      icon: Lightbulb,
      title: "Investment Thesis",
      desc: "Susun bull case & bear case",
    },
    {
      id: "wealth",
      icon: Wallet,
      title: "Wealth Dashboard",
      desc: "Lacak alokasi dan net worth",
    },
    {
      id: "riwayat",
      icon: HistoryIcon,
      title: "History",
      desc: "Riset yang pernah kamu lakukan",
    },
  ];

  const allTools = [...researchTools, ...portfolioTools];
  const totalToolsCount = allTools.length;

  const researchTabIds = ["analisis", "sentiment", "compare", "dokumen"];

  const bottomNavItems: { id: string; icon: LucideIcon; label: string }[] = [
    { id: "home", icon: HomeIcon, label: "Home" },
    { id: "analisis", icon: BarChart3, label: "Research" },
    { id: "thesis", icon: Lightbulb, label: "Thesis" },
    { id: "wealth", icon: Wallet, label: "Wealth" },
    { id: "riwayat", icon: HistoryIcon, label: "History" },
  ];

  const isBottomNavActive = (id: string) => {
    if (id === "analisis") return researchTabIds.includes(activeTab);
    return activeTab === id;
  };

  // Rotating loading messages per context
  const analysisLoadingMsg = useRotatingMessages(loading, [
    "🔍 Menganalisis model bisnis...",
    "📊 Mengevaluasi risiko...",
    "💰 Menilai valuasi...",
  ]);
  const sentimentLoadingMsg = useRotatingMessages(loadingSentiment, [
    "📰 Mencari berita terkini...",
    "🌐 Mengecek sentimen pasar...",
    "📈 Menyusun ringkasan...",
  ]);
  const compareLoadingMsg = useRotatingMessages(loadingCompare, [
    "⚖️ Membandingkan fundamental...",
    "📊 Mengevaluasi tiap aset...",
    "📝 Menyusun perbandingan...",
  ]);
  const thesisLoadingMsg = useRotatingMessages(loadingThesis, [
    "🐂 Menyusun bull case...",
    "🐻 Menyusun bear case...",
    "🎯 Merangkum kesimpulan...",
  ]);

  // Combined history (analysis + thesis) for History tab
  const combinedHistory = [
    ...history.map((h) => ({
      type: "analysis" as const,
      id: `a-${h.id}`,
      title: h.query,
      created_at: h.created_at,
      raw: h,
    })),
    ...thesisHistory.map((t) => ({
      type: "thesis" as const,
      id: `t-${t.id}`,
      title: t.ticker,
      created_at: t.created_at,
      raw: t,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const HomeCard = ({
    icon: Icon,
    title,
    desc,
    onClick,
  }: {
    icon: LucideIcon;
    title: string;
    desc: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl shadow p-4 md:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all border border-transparent hover:border-blue-200"
    >
      <Icon size={24} className="text-blue-600 mb-2" strokeWidth={1.75} />
      <h3 className="font-semibold text-gray-800 text-sm md:text-base mb-1">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-gray-500">{desc}</p>
    </button>
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 sm:px-6 md:px-8 py-4 md:py-6 mb-4 md:mb-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setActiveTab("home")} className="text-left">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              AI Investment Research Assistant
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Riset aset berbasis AI - saham & crypto - bukan saran investasi
            </p>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Desktop Grouped Tabs (hidden on Home) */}
        {activeTab !== "home" && (
          <div className="hidden sm:flex flex-wrap gap-x-8 gap-y-3 mb-6 border-b border-gray-200 pb-1">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">
                Research
              </span>
              <div className="flex gap-1">
                {researchTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition ${
                      activeTab === tool.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <tool.icon size={14} />
                    {tool.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">
                Portfolio
              </span>
              <div className="flex gap-1">
                {portfolioTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition ${
                      activeTab === tool.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <tool.icon size={14} />
                    {tool.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: HOME */}
        {activeTab === "home" && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 md:p-10 text-center text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                AI Investment Research Assistant
              </h2>
              <p className="text-sm md:text-base text-blue-100 max-w-md mx-auto mb-1">
                Research stocks, crypto, and financial reports with AI-powered
                analysis.
              </p>
              <p className="text-xs md:text-sm text-blue-200 mb-5">
                {totalToolsCount} research & portfolio tools available
              </p>
              <button
                onClick={() => setActiveTab("analisis")}
                className="bg-white text-blue-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-50 transition inline-flex items-center gap-2"
              >
                <BarChart3 size={18} />
                Start Research
              </button>
            </div>

            <div>
              <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">
                Research Tools
              </h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {researchTools.map((tool) => (
                  <HomeCard
                    key={tool.id}
                    icon={tool.icon}
                    title={tool.title}
                    desc={tool.desc}
                    onClick={() => setActiveTab(tool.id)}
                  />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">
                Portfolio Tools
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {portfolioTools.map((tool) => (
                  <HomeCard
                    key={tool.id}
                    icon={tool.icon}
                    title={tool.title}
                    desc={tool.desc}
                    onClick={() => setActiveTab(tool.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Analisis Aset */}
        {activeTab === "analisis" && (
          <Card>
            <SectionTitle icon={BarChart3}>Company Analysis</SectionTitle>
            <div className="flex flex-col sm:flex-row gap-2 mb-2 mt-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: BBCA, ANTM, Bitcoin..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <button
                onClick={() => handleAnalyze()}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {loading ? "Menganalisis..." : "Analisis"}
              </button>
            </div>

            {!result && !loading && (
              <div className="flex flex-wrap gap-2 mb-2 mt-3">
                {["BBCA", "BBRI", "TLKM", "Bitcoin", "Ethereum"].map((ex) => (
                  <ExampleChip
                    key={ex}
                    label={ex}
                    onClick={() => setQuery(ex)}
                  />
                ))}
              </div>
            )}

            {loading && <RotatingLoader message={analysisLoadingMsg} />}

            {!loading && result && (
              <div className="bg-gray-50 rounded-lg p-4 md:p-6 mt-4">
                <div className="flex items-baseline justify-between flex-wrap gap-1 mb-1">
                  <h3 className="text-lg font-semibold uppercase">
                    {result.query}
                  </h3>
                  <span className="text-xs text-gray-400">
                    Terakhir diperbarui:{" "}
                    {new Date(result.created_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
                {extractSubtitle(result.analysis) && (
                  <p className="text-sm text-gray-500 mb-4">
                    {extractSubtitle(result.analysis)}
                  </p>
                )}
                <div className="prose prose-sm max-w-none text-gray-700 mt-3">
                  <ReactMarkdown>{result.analysis}</ReactMarkdown>
                </div>
              </div>
            )}

            {!loading && !result && (
              <EmptyState
                icon={BarChart3}
                title="Analisis Aset Apapun"
                hint="Ketik ticker atau nama aset di atas untuk memulai."
              />
            )}
          </Card>
        )}

        {/* Tab: News & Sentiment */}
        {activeTab === "sentiment" && (
          <Card>
            <SectionTitle icon={Newspaper}>News & Sentiment</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">
              AI mencari berita terkini dan menganalisis sentimen pasar secara
              real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="text"
                value={sentimentQuery}
                onChange={(e) => setSentimentQuery(e.target.value)}
                placeholder="Contoh: BBCA, Bitcoin, ANTM..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleSentiment()}
              />
              <button
                onClick={() => handleSentiment()}
                disabled={loadingSentiment}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {loadingSentiment ? "Mencari..." : "Cek Sentimen"}
              </button>
            </div>

            {!sentimentResult && !loadingSentiment && (
              <div className="flex flex-wrap gap-2 mb-2 mt-3">
                {["BBCA", "Bitcoin", "TLKM"].map((ex) => (
                  <ExampleChip
                    key={ex}
                    label={ex}
                    onClick={() => setSentimentQuery(ex)}
                  />
                ))}
              </div>
            )}

            {loadingSentiment && (
              <RotatingLoader message={sentimentLoadingMsg} />
            )}

            {!loadingSentiment && sentimentResult && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
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

            {!loadingSentiment && !sentimentResult && (
              <EmptyState
                icon={Newspaper}
                title="Cek Sentimen Pasar"
                hint="Ketik ticker di atas untuk melihat sentimen dan berita terkini."
              />
            )}
          </Card>
        )}

        {/* Tab: Perbandingan */}
        {activeTab === "compare" && (
          <Card>
            <SectionTitle icon={Scale}>Compare Assets</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">
              Bandingkan beberapa aset sekaligus. Pisahkan ticker dengan koma.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Contoh: BBCA, BBRI, BMRI"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
              <button
                onClick={() => handleCompare()}
                disabled={loadingCompare}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {loadingCompare ? "Membandingkan..." : "Bandingkan"}
              </button>
            </div>

            {compareResults.length === 0 && !loadingCompare && (
              <div className="flex flex-wrap gap-2 mb-2 mt-3">
                <ExampleChip
                  label="BBCA, BBRI, BMRI"
                  onClick={() => setCompareInput("BBCA, BBRI, BMRI")}
                />
              </div>
            )}

            {loadingCompare && <RotatingLoader message={compareLoadingMsg} />}

            {!loadingCompare && compareResults.length > 0 && (
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

            {!loadingCompare && compareResults.length === 0 && (
              <EmptyState
                icon={Scale}
                title="Bandingkan Beberapa Aset"
                hint="Bandingkan valuasi, kualitas bisnis, dan risiko sekaligus."
              />
            )}
          </Card>
        )}

        {/* Tab: Tanya Dokumen */}
        {activeTab === "dokumen" && (
          <Card>
            <SectionTitle icon={FileText}>Financial Document Q&A</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">
              Upload laporan keuangan (PDF), lalu tanyakan apa saja - termasuk
              valuasi P/E dan PBV.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm whitespace-nowrap"
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
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={docQuestion}
                onChange={(e) => setDocQuestion(e.target.value)}
                placeholder="Tanya sesuatu tentang dokumen..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyDown={(e) => e.key === "Enter" && handleAskDocument()}
              />
              <button
                onClick={handleAskDocument}
                disabled={askingDoc}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {askingDoc ? "Mencari..." : "Tanya"}
              </button>
            </div>

            {askingDoc && (
              <RotatingLoader message="📄 Membaca dokumen dan menyusun jawaban..." />
            )}

            {!askingDoc && docAnswer && (
              <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                <ReactMarkdown>{docAnswer}</ReactMarkdown>
              </div>
            )}

            {!askingDoc && !docAnswer && (
              <EmptyState
                icon={FileText}
                title="Tanya Jawab dari Dokumen"
                hint="Upload PDF laporan keuangan, lalu tanyakan apa saja tentang isinya."
              />
            )}
          </Card>
        )}

        {/* Tab: Investment Thesis */}
        {activeTab === "thesis" && (
          <Card>
            <SectionTitle icon={Lightbulb}>Investment Thesis</SectionTitle>
            <p className="text-sm text-gray-500 mb-4">
              Susun alasan investasimu jadi kerangka Bull Case, Bear Case, dan
              metrik yang perlu dipantau.
            </p>
            <div className="space-y-3 mb-2">
              <input
                type="text"
                value={thesisTicker}
                onChange={(e) => setThesisTicker(e.target.value)}
                placeholder="Ticker/Aset, contoh: BBCA"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={thesisReasons}
                onChange={(e) => setThesisReasons(e.target.value)}
                placeholder="Kenapa kamu tertarik pada aset ini? Contoh: CASA tinggi, ROE tinggi, manajemen bagus..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGenerateThesis}
                disabled={loadingThesis}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loadingThesis ? "Menyusun Thesis..." : "Generate Thesis"}
              </button>
            </div>

            {!thesisResult && !loadingThesis && (
              <div className="mb-2 mt-3">
                <ExampleChip
                  label="BBCA - CASA tinggi, ROE tinggi, manajemen bagus"
                  onClick={() => {
                    setThesisTicker("BBCA");
                    setThesisReasons(
                      "CASA tinggi, ROE tinggi, manajemen bagus",
                    );
                  }}
                />
              </div>
            )}

            {loadingThesis && <RotatingLoader message={thesisLoadingMsg} />}

            {!loadingThesis && thesisResult && (
              <div className="mt-4 mb-6">
                <h3 className="text-lg font-semibold uppercase mb-4">
                  {thesisResult.ticker}
                </h3>
                {(() => {
                  const sections = parseThesis(thesisResult.analysis);
                  if (!sections) {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                        <ReactMarkdown>{thesisResult.analysis}</ReactMarkdown>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {sections.bull && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">
                            🐂 Bull Case
                          </h4>
                          <div className="prose prose-sm max-w-none text-green-900">
                            <ReactMarkdown>{sections.bull}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {sections.bear && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-800 mb-2">
                            🐻 Bear Case
                          </h4>
                          <div className="prose prose-sm max-w-none text-red-900">
                            <ReactMarkdown>{sections.bear}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {sections.watch && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-800 mb-2">
                            👀 What To Watch
                          </h4>
                          <div className="prose prose-sm max-w-none text-yellow-900">
                            <ReactMarkdown>{sections.watch}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {sections.conclusion && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-2">
                            🎯 Conclusion
                          </h4>
                          <div className="prose prose-sm max-w-none text-blue-900">
                            <ReactMarkdown>{sections.conclusion}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {!loadingThesis && !thesisResult && (
              <EmptyState
                icon={Lightbulb}
                title="Build an Investment Thesis"
                hint="Tulis ticker dan alasanmu, AI akan bantu susun bull case & bear case."
              />
            )}

            <h3 className="text-md font-semibold mb-3 mt-6">Riwayat Thesis</h3>
            {thesisHistory.length === 0 && (
              <p className="text-sm text-gray-400">
                Belum ada thesis yang dibuat.
              </p>
            )}
            <div className="space-y-3">
              {thesisHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setThesisResult(item)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <p className="font-medium uppercase">{item.ticker}</p>
                  <p className="text-sm text-gray-500">
                    {relativeTime(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab: Wealth Dashboard */}
        {activeTab === "wealth" && (
          <Card>
            <SectionTitle icon={Wallet}>Wealth Dashboard</SectionTitle>
            <p className="text-sm text-gray-500 mb-6">
              Hitung total kekayaan bersih dan lihat alokasi aset kamu.
              Tersimpan otomatis di browser ini saja. Boleh dibiarkan 0.
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-xs text-gray-500 mb-1">Net Worth</p>
                <p className="text-sm md:text-base font-bold text-gray-900">
                  {formatRupiah(wealth.netWorth)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-xs text-gray-500 mb-1">Total Assets</p>
                <p className="text-sm md:text-base font-bold text-gray-900">
                  {formatRupiah(wealth.totalAssets)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-xs text-gray-500 mb-1">Debt</p>
                <p className="text-sm md:text-base font-bold text-gray-900">
                  {formatRupiah(wealth.debt)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-xs text-gray-500 mb-1">Largest Position</p>
                <p className="text-sm md:text-base font-bold text-gray-900">
                  {wealth.totalAssets > 0
                    ? allocationLabels[wealth.largestLabel]
                    : "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {wealthFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    value={(wealthData as any)[field.key]}
                    onChange={(e) =>
                      updateWealthField(field.key, e.target.value)
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {wealth.concentrationWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Konsentrasi tinggi terdeteksi:{" "}
                    <strong>{wealth.maxAllocation.toFixed(0)}%</strong> dari
                    total aset ada di satu kategori. Pertimbangkan diversifikasi
                    untuk mengurangi risiko.
                  </p>
                </div>
              )}

              {wealth.totalAssets > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Alokasi Aset
                  </p>
                  <div className="w-full h-6 rounded-full overflow-hidden flex mb-4 bg-gray-100">
                    {Object.entries(wealth.allocation).map(([key, pct]) =>
                      pct > 0 ? (
                        <div
                          key={key}
                          className={allocationColors[key]}
                          style={{ width: `${pct}%` }}
                          title={`${allocationLabels[key]}: ${pct.toFixed(1)}%`}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(wealth.allocation).map(([key, pct]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${allocationColors[key]}`}
                        />
                        <span className="text-sm text-gray-600">
                          {allocationLabels[key]}: {pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Isi minimal satu kategori aset di atas untuk melihat alokasi.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Tab: Riwayat (gabungan analysis + thesis) */}
        {activeTab === "riwayat" && (
          <Card>
            <SectionTitle icon={HistoryIcon}>History</SectionTitle>
            <div className="mt-3">
              {combinedHistory.length === 0 && (
                <p className="text-sm text-gray-400">
                  Belum ada riwayat. Mulai dari Company Analysis atau Investment
                  Thesis.
                </p>
              )}
              <div className="space-y-3">
                {combinedHistory.map((item) => {
                  const ItemIcon =
                    item.type === "analysis" ? BarChart3 : Lightbulb;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === "analysis") {
                          setResult(item.raw as AnalysisResult);
                          setActiveTab("analisis");
                        } else {
                          setThesisResult(item.raw as ThesisResult);
                          setActiveTab("thesis");
                        }
                      }}
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <ItemIcon size={20} className="text-blue-600" />
                        <div>
                          <p className="font-medium uppercase">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {item.type === "analysis"
                              ? "Company Analysis"
                              : "Investment Thesis"}{" "}
                            · {relativeTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        <div className="h-8" />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-20">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition ${
              isBottomNavActive(item.id) ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

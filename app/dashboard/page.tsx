"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Brain, Upload, FileText, FileSpreadsheet, File, Trash2, Loader2,
  Plus, Copy, Check, Clock, LogOut, Bot, Code2, ChevronDown, ChevronUp,
  Eye, EyeOff, MessageSquare, X, ExternalLink, HardDrive, Sparkles, Globe,
} from "lucide-react";

interface UploadedFile {
  id: string; name: string; type: string; size: number; chunkCount: number; createdAt: string;
}
interface ChatbotSettings {
  primaryColor: string; botName: string; welcomeMessage: string; placeholder: string;
}
interface Chatbot {
  id: string; name: string; apiKey: string; settings: ChatbotSettings; createdAt: string;
}

function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getFileIcon(type: string) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-400" />;
  if (type === "excel" || type === "csv") return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
  if (type === "word") return <FileText className="w-4 h-4 text-blue-400" />;
  if (type === "website") return <Globe className="w-4 h-4 text-cyan-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://knowledge-ai-rag-chatbot.vercel.app";

// ── Per-chatbot document section ──────────────────────────────
function ChatbotDocs({ botId }: { botId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{ type: "loading" | "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/files?chatbotId=${botId}`);
    if (res.ok) setFiles(await res.json());
    setLoading(false);
  }, [botId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleUpload(file: File) {
    setUploadStatus({ type: "loading", text: `Processing "${file.name}"...` });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("chatbotId", botId);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setUploadStatus({ type: "success", text: data.message }); fetchFiles(); }
      else setUploadStatus({ type: "error", text: data.error ?? "Upload failed" });
    } catch { setUploadStatus({ type: "error", text: "Upload failed. Please try again." }); }
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 5000);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    if (res.ok) setFiles(prev => prev.filter(f => f.id !== id));
    setDeletingId(null);
  }

  async function handleScrapeUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setIsScraping(true);
    setUploadStatus({ type: "loading", text: `Scraping "${url}"...` });
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, chatbotId: botId }),
      });
      const data = await res.json();
      if (res.ok) { setUploadStatus({ type: "success", text: data.message }); setUrlInput(""); fetchFiles(); }
      else setUploadStatus({ type: "error", text: data.error ?? "Scrape failed" });
    } catch { setUploadStatus({ type: "error", text: "Scrape failed. Please try again." }); }
    setIsScraping(false);
    setTimeout(() => setUploadStatus(null), 5000);
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className="border-2 border-dashed border-white/10 hover:border-violet-400/30 rounded-xl p-5 text-center cursor-pointer transition-all group"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
      >
        <input ref={fileRef} type="file" className="hidden" accept=".txt,.md,.csv,.pdf,.xlsx,.xls,.docx,.doc"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        <Upload className="w-7 h-7 text-slate-600 group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
        <p className="text-slate-400 text-xs font-medium">Drop a file or click to upload</p>
        <p className="text-slate-600 text-[10px] mt-0.5">PDF, Word, Excel, CSV, TXT — max 10MB</p>
      </div>

      {/* URL scrape */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-400/40 transition-colors">
          <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScrapeUrl()}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-slate-300 placeholder-slate-600 text-xs outline-none"
          />
        </div>
        <button
          onClick={handleScrapeUrl}
          disabled={isScraping || !urlInput.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/20 text-cyan-300 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          {isScraping ? "Scraping..." : "Scrape"}
        </button>
      </div>

      {/* Status */}
      {uploadStatus && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
          uploadStatus.type === "loading" ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
          : uploadStatus.type === "success" ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
          : "bg-red-500/20 border-red-400/30 text-red-200"}`}>
          {uploadStatus.type === "loading" && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
          {uploadStatus.type === "success" && <Check className="w-3 h-3 flex-shrink-0" />}
          {uploadStatus.type === "error" && <X className="w-3 h-3 flex-shrink-0" />}
          <span className="flex-1 truncate">{uploadStatus.text}</span>
          <button onClick={() => setUploadStatus(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Files */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-6 text-slate-600">
          <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No documents uploaded for this chatbot yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="group flex items-center gap-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg px-3 py-2 transition-all">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">{getFileIcon(f.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-xs font-medium truncate">{f.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-500 text-[10px]">{formatBytes(f.size)}</span>
                  <span className="text-slate-700 text-[10px]">•</span>
                  <span className="text-slate-500 text-[10px]">{f.chunkCount} chunks</span>
                  <span className="text-slate-700 text-[10px]">•</span>
                  <Clock className="w-2.5 h-2.5 text-slate-600" />
                  <span className="text-slate-600 text-[10px]">{formatDate(f.createdAt)}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(f.id)} disabled={deletingId === f.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                {deletingId === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
          <p className="text-slate-600 text-[10px] text-center pt-1">
            {files.reduce((s, f) => s + f.chunkCount, 0)} total chunks indexed for this chatbot
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { data: session } = useSession();

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, "docs" | "snippet">>({});

  // Create bot form
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [botForm, setBotForm] = useState({
    name: "My Chatbot", botName: "AI Assistant",
    welcomeMessage: "Hi! How can I help you today?",
    placeholder: "Ask me anything...", primaryColor: "#7c3aed",
  });
  const [creatingBot, setCreatingBot] = useState(false);
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  const fetchChatbots = useCallback(async () => {
    const res = await fetch("/api/chatbots");
    if (res.ok) setChatbots(await res.json());
    setLoadingBots(false);
  }, []);

  useEffect(() => { fetchChatbots(); }, [fetchChatbots]);

  async function handleCreateBot() {
    setCreatingBot(true);
    const res = await fetch("/api/chatbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(botForm),
    });
    if (res.ok) {
      const bot = await res.json();
      setChatbots(prev => [bot, ...prev]);
      setShowCreateBot(false);
      setBotForm({ name: "My Chatbot", botName: "AI Assistant", welcomeMessage: "Hi! How can I help you today?", placeholder: "Ask me anything...", primaryColor: "#7c3aed" });
      setExpandedBot(bot.id);
      setExpandedSection(prev => ({ ...prev, [bot.id]: "docs" }));
    }
    setCreatingBot(false);
  }

  async function handleDeleteBot(id: string) {
    setDeletingBotId(id);
    const res = await fetch(`/api/chatbots?id=${id}`, { method: "DELETE" });
    if (res.ok) setChatbots(prev => prev.filter(b => b.id !== id));
    setDeletingBotId(null);
  }

  function getSnippet(apiKey: string) {
    return `<!-- Knowledge AI Chatbot Widget -->
<script
  src="${BASE_URL}/chatbot-widget.js"
  data-api-key="${apiKey}"
  data-base-url="${BASE_URL}"
  async
></script>`;
  }

  function copySnippet(apiKey: string, id: string) {
    navigator.clipboard.writeText(getSnippet(apiKey)).then(() => {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  function toggleSection(botId: string, section: "docs" | "snippet") {
    setExpandedSection(prev => ({ ...prev, [botId]: section }));
    setExpandedBot(prev => prev === botId && expandedSection[botId] === section ? null : botId);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Knowledge AI</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/chat" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/20 text-violet-300 text-xs font-medium transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Open Chat
          </a>
          {session?.user && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {session.user.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-slate-300 text-xs hidden sm:block">{session.user.name}</span>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all" title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-2xl sm:text-3xl font-bold">My Chatbots</h1>
          <p className="text-slate-400 text-sm mt-1">Each chatbot has its own isolated document knowledge base</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: "Chatbots", value: chatbots.length, icon: <Bot className="w-4 h-4 text-violet-400" /> },
            { label: "Isolated Knowledge Bases", value: chatbots.length, icon: <HardDrive className="w-4 h-4 text-indigo-400" /> },
            { label: "Personal Chat", value: 1, icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">{s.icon}</div>
              <div>
                <p className="text-white text-xl font-bold">{s.value}</p>
                <p className="text-slate-500 text-xs">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Create bot button */}
        {!showCreateBot && (
          <button onClick={() => setShowCreateBot(true)}
            className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-violet-400/30 hover:border-violet-400/60 text-violet-400 hover:text-violet-300 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Create New Chatbot
          </button>
        )}

        {/* Create bot form */}
        {showCreateBot && (
          <div className="bg-white/5 border border-violet-400/20 rounded-2xl p-6 space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-violet-400" /> New Chatbot</h3>
              <button onClick={() => setShowCreateBot(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Chatbot Name", key: "name", placeholder: "My Support Bot" },
                { label: "Bot Display Name", key: "botName", placeholder: "AI Assistant" },
                { label: "Welcome Message", key: "welcomeMessage", placeholder: "Hi! How can I help?" },
                { label: "Input Placeholder", key: "placeholder", placeholder: "Ask me anything..." },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">{label}</label>
                  <input value={(botForm as any)[key]} onChange={e => setBotForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm outline-none focus:border-violet-400/50 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={botForm.primaryColor} onChange={e => setBotForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                  <span className="text-slate-400 text-sm font-mono">{botForm.primaryColor}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreateBot} disabled={creatingBot}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white text-sm font-semibold transition-all disabled:opacity-50">
                {creatingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Chatbot
              </button>
              <button onClick={() => setShowCreateBot(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-all">Cancel</button>
            </div>
          </div>
        )}

        {/* Chatbots list */}
        {loadingBots ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : chatbots.length === 0 && !showCreateBot ? (
          <div className="text-center py-20 text-slate-600">
            <Bot className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-500">No chatbots yet</p>
            <p className="text-xs mt-1">Create one above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatbots.map(bot => {
              const s = bot.settings;
              const isExpanded = expandedBot === bot.id;
              const section = expandedSection[bot.id] ?? "docs";
              const snippet = getSnippet(bot.apiKey);

              return (
                <div key={bot.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {/* Bot header */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.primaryColor }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{bot.name}</p>
                      <p className="text-slate-500 text-xs">Created {formatDate(bot.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Docs toggle */}
                      <button
                        onClick={() => toggleSection(bot.id, "docs")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isExpanded && section === "docs" ? "bg-violet-500/20 text-violet-300 border border-violet-400/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                        <HardDrive className="w-3 h-3" /> Docs
                      </button>
                      {/* Snippet toggle */}
                      <button
                        onClick={() => toggleSection(bot.id, "snippet")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isExpanded && section === "snippet" ? "bg-violet-500/20 text-violet-300 border border-violet-400/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                        <Code2 className="w-3 h-3" /> Embed
                      </button>
                      <button onClick={() => handleDeleteBot(bot.id)} disabled={deletingBotId === bot.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all ml-1">
                        {deletingBotId === bot.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-white/10 px-5 py-5">

                      {/* ── DOCS SECTION ── */}
                      {section === "docs" && (
                        <div>
                          <p className="text-slate-300 text-xs font-semibold mb-3 flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
                            Documents for <span className="text-violet-300">{bot.name}</span>
                            <span className="text-slate-600 font-normal ml-1">— isolated from other chatbots</span>
                          </p>
                          <ChatbotDocs botId={bot.id} />
                        </div>
                      )}

                      {/* ── SNIPPET SECTION ── */}
                      {section === "snippet" && (
                        <div className="space-y-4">
                          {/* API Key */}
                          <div>
                            <label className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1.5">API Key</label>
                            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
                              <code className="flex-1 text-xs text-slate-300 font-mono truncate">
                                {showApiKey === bot.id ? bot.apiKey : "•".repeat(32)}
                              </code>
                              <button onClick={() => setShowApiKey(showApiKey === bot.id ? null : bot.id)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                {showApiKey === bot.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Embed code */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5"><Code2 className="w-3 h-3" /> Embed Code</label>
                              <span className="text-slate-600 text-xs">Paste before &lt;/body&gt;</span>
                            </div>
                            <div className="relative">
                              <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{snippet}</pre>
                              <button onClick={() => copySnippet(bot.apiKey, bot.id)}
                                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/20 text-violet-300 text-xs font-medium transition-all">
                                {copiedKey === bot.id ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                              </button>
                            </div>
                          </div>

                          {/* Instructions */}
                          <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl px-4 py-3">
                            <p className="text-indigo-300 text-xs font-semibold mb-2">How to use</p>
                            <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                              <li>Upload documents in the <strong className="text-slate-300">Docs</strong> tab above</li>
                              <li>Copy the embed code</li>
                              <li>Paste it into your website&#39;s HTML before the <code className="text-indigo-300">&lt;/body&gt;</code> tag</li>
                              <li>A chat bubble appears — it only knows your uploaded docs</li>
                            </ol>
                          </div>

                          <a href={`/preview/${bot.apiKey}`} target="_blank"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-sm transition-all">
                            <ExternalLink className="w-3.5 h-3.5" /> Preview Chatbot
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

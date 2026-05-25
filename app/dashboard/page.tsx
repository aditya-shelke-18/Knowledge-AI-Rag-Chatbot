"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Brain, Upload, FileText, FileSpreadsheet, File, Trash2, Loader2,
  Plus, Copy, Check, Clock, HardDrive, LogOut, Bot, Code2,
  Settings, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles,
  MessageSquare, X, ExternalLink, RefreshCw,
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
  const k = 1024, s = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k));
  return parseFloat((b/Math.pow(k,i)).toFixed(1)) + " " + s[i];
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getFileIcon(type: string) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-400" />;
  if (type === "excel" || type === "csv") return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
  if (type === "word") return <FileText className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://knowledge-ai-rag-chatbot.vercel.app";

export default function Dashboard() {
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{ type: "loading"|"success"|"error"; text: string } | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"docs"|"chatbots">("docs");

  // Chatbot form state
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [botForm, setBotForm] = useState<ChatbotSettings & { name: string }>({
    name: "My Chatbot", botName: "AI Assistant",
    welcomeMessage: "Hi! How can I help you today?",
    placeholder: "Ask me anything...", primaryColor: "#7c3aed",
  });
  const [creatingBot, setCreatingBot] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    const res = await fetch("/api/files");
    if (res.ok) setFiles(await res.json());
  }, []);

  const fetchChatbots = useCallback(async () => {
    const res = await fetch("/api/chatbots");
    if (res.ok) setChatbots(await res.json());
  }, []);

  useEffect(() => { fetchFiles(); fetchChatbots(); }, [fetchFiles, fetchChatbots]);

  async function handleUpload(file: File) {
    setUploadStatus({ type: "loading", text: `Processing "${file.name}"...` });
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setUploadStatus({ type: "success", text: data.message }); fetchFiles(); }
      else setUploadStatus({ type: "error", text: data.error ?? "Upload failed" });
    } catch { setUploadStatus({ type: "error", text: "Upload failed. Please try again." }); }
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 5000);
  }

  async function handleDeleteFile(id: string) {
    setDeletingFileId(id);
    const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    if (res.ok) setFiles(prev => prev.filter(f => f.id !== id));
    setDeletingFileId(null);
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900">
      {/* ── Top Nav ── */}
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Hero ── */}
        <div className="mb-8">
          <h1 className="text-white text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Upload documents and create embeddable chatbots for your website</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: "Documents", value: files.length, icon: <HardDrive className="w-4 h-4 text-violet-400" />, color: "violet" },
            { label: "Total Chunks", value: files.reduce((s, f) => s + f.chunkCount, 0), icon: <Sparkles className="w-4 h-4 text-indigo-400" />, color: "indigo" },
            { label: "Chatbots", value: chatbots.length, icon: <Bot className="w-4 h-4 text-emerald-400" />, color: "emerald" },
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

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
          {(["docs", "chatbots"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30" : "text-slate-400 hover:text-slate-200"}`}>
              {tab === "docs" ? "📄 Documents" : "🤖 Chatbots"}
            </button>
          ))}
        </div>

        {/* ══ DOCUMENTS TAB ══ */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            {/* Upload area */}
            <div
              className="border-2 border-dashed border-white/10 hover:border-violet-400/40 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
            >
              <input ref={fileRef} type="file" className="hidden" accept=".txt,.md,.csv,.pdf,.xlsx,.xls,.docx,.doc" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <Upload className="w-10 h-10 text-slate-600 group-hover:text-violet-400 mx-auto mb-3 transition-colors" />
              <p className="text-slate-300 text-sm font-medium">Drop a file or click to upload</p>
              <p className="text-slate-600 text-xs mt-1">PDF, Word, Excel, CSV, TXT, Markdown — max 10MB</p>
            </div>

            {/* Upload status */}
            {uploadStatus && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
                uploadStatus.type === "loading" ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
                : uploadStatus.type === "success" ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                : "bg-red-500/20 border-red-400/30 text-red-200"}`}>
                {uploadStatus.type === "loading" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                {uploadStatus.type === "success" && <Check className="w-4 h-4 flex-shrink-0" />}
                {uploadStatus.type === "error" && <X className="w-4 h-4 flex-shrink-0" />}
                <span className="text-xs flex-1">{uploadStatus.text}</span>
                <button onClick={() => setUploadStatus(null)}><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Files list */}
            {files.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(f => (
                  <div key={f.id} className="group flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-4 py-3 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">{getFileIcon(f.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-500 text-xs">{formatBytes(f.size)}</span>
                        <span className="text-slate-700 text-xs">•</span>
                        <span className="text-slate-500 text-xs">{f.chunkCount} chunks</span>
                        <span className="text-slate-700 text-xs">•</span>
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-600 text-xs">{formatDate(f.createdAt)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteFile(f.id)} disabled={deletingFileId === f.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                      {deletingFileId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CHATBOTS TAB ══ */}
        {activeTab === "chatbots" && (
          <div className="space-y-4">
            {/* Create bot button */}
            {!showCreateBot && (
              <button onClick={() => setShowCreateBot(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-400/30 hover:border-violet-400/60 text-violet-400 hover:text-violet-300 text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> Create New Chatbot
              </button>
            )}

            {/* Create bot form */}
            {showCreateBot && (
              <div className="bg-white/5 border border-violet-400/20 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
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
            {chatbots.length === 0 && !showCreateBot ? (
              <div className="text-center py-16 text-slate-600">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No chatbots yet</p>
                <p className="text-xs mt-1">Create one to embed on your website</p>
              </div>
            ) : (
              chatbots.map(bot => {
                const s = bot.settings;
                const isExpanded = expandedBot === bot.id;
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteBot(bot.id)} disabled={deletingBotId === bot.id}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all">
                          {deletingBotId === bot.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setExpandedBot(isExpanded ? null : bot.id)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-all">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: snippet + api key */}
                    {isExpanded && (
                      <div className="border-t border-white/10 px-5 py-5 space-y-5">
                        {/* API Key */}
                        <div>
                          <label className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1.5"><Settings className="w-3 h-3" /> API Key</label>
                          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
                            <code className="flex-1 text-xs text-slate-300 font-mono truncate">
                              {showApiKey === bot.id ? bot.apiKey : "•".repeat(24)}
                            </code>
                            <button onClick={() => setShowApiKey(showApiKey === bot.id ? null : bot.id)} className="text-slate-500 hover:text-slate-300 transition-colors">
                              {showApiKey === bot.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Snippet */}
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

                        {/* How to use */}
                        <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl px-4 py-3">
                          <p className="text-indigo-300 text-xs font-semibold mb-2">How to use</p>
                          <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                            <li>Copy the embed code above</li>
                            <li>Paste it into your website&#39;s HTML before the <code className="text-indigo-300">&lt;/body&gt;</code> tag</li>
                            <li>A chat bubble will appear on the bottom-right of your site</li>
                            <li>It will answer questions using your uploaded documents</li>
                          </ol>
                        </div>

                        {/* Preview button */}
                        <a href={`/preview/${bot.apiKey}`} target="_blank"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-sm transition-all">
                          <ExternalLink className="w-3.5 h-3.5" /> Preview Chatbot
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

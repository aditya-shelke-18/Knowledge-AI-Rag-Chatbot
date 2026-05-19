"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Upload,
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Sparkles,
  Brain,
  FileText,
  FileSpreadsheet,
  File,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Clock,
  HardDrive,
  Plus,
  Copy,
  Check,
  MessageSquare,
  Square,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getFileIcon(type: string) {
  switch (type) {
    case "pdf":
      return <FileText className="w-4 h-4 text-red-400" />;
    case "excel":
    case "csv":
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    case "word":
      return <FileText className="w-4 h-4 text-blue-400" />;
    default:
      return <File className="w-4 h-4 text-slate-400" />;
  }
}

// ─── Main Component ───────────────────────────────────────────
export default function Chat() {
  const [inputValue, setInputValue] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{
    type: "loading" | "success" | "error";
    text: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "docs">("chats");

  // ─── Chat History State (Database-backed) ──────────────────
  const [conversationsList, setConversationsList] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // ─── Copy State ─────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, sendMessage, status, stop, setMessages } = useChat();
  const isLoading = status === "streaming" || status === "submitted";

  // ─── Load conversations list from DB ───────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data: ConversationSummary[] = await res.json();
        setConversationsList(data);
        return data;
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
    return [];
  }, []);

  // ─── Load a single conversation's messages ────────────────
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setActiveConversationId(id);
      }
    } catch (e) {
      console.error("Failed to load conversation:", e);
    }
  }, [setMessages]);

  // ─── Init: load conversations on mount ────────────────────
  useEffect(() => {
    (async () => {
      setLoadingConversations(true);
      const convos = await fetchConversations();
      if (convos.length > 0) {
        await loadConversation(convos[0].id);
      }
      setLoadingConversations(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save messages to DB (debounced) ─────────────────
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;

    // Debounce saves to avoid hammering the DB on every stream token
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      // Derive title from first user message
      const firstUserMsg = messages.find((m) => m.role === "user");
      let title = "New Chat";
      if (firstUserMsg) {
        const textPart = firstUserMsg.parts?.find((p: any) => p.type === "text") as any;
        title = (textPart?.text ?? "").slice(0, 50) || "New Chat";
      }

      try {
        await fetch(`/api/conversations/${activeConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, messages }),
        });

        // Update sidebar title without refetching
        setConversationsList((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, title } : c
          )
        );
      } catch (e) {
        console.error("Failed to save conversation:", e);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, activeConversationId]);

  // ─── Scroll to bottom on new messages ─────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Fetch uploaded files ─────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(data);
      }
    } catch (e) {
      console.error("Failed to fetch files:", e);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // ─── New Chat ─────────────────────────────────────────────
  async function handleNewChat() {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (res.ok) {
        const newConvo = await res.json();
        setConversationsList((prev) => [
          { id: newConvo.id, title: newConvo.title, createdAt: newConvo.createdAt, updatedAt: newConvo.updatedAt },
          ...prev,
        ]);
        setActiveConversationId(newConvo.id);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  }

  // ─── Switch Chat ─────────────────────────────────────────
  async function handleSelectConversation(id: string) {
    if (id === activeConversationId) return;
    await loadConversation(id);
  }

  // ─── Delete Chat ─────────────────────────────────────────
  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
      const updated = conversationsList.filter((c) => c.id !== id);
      setConversationsList(updated);

      if (id === activeConversationId) {
        if (updated.length > 0) {
          await loadConversation(updated[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  }

  // ─── Copy Response ────────────────────────────────────────
  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  // ─── Upload handler ───────────────────────────────────────
  async function handleUpload(file: File) {
    setUploadStatus({ type: "loading", text: `Processing "${file.name}"...` });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: "success", text: data.message });
        fetchFiles();
      } else {
        setUploadStatus({ type: "error", text: data.error ?? JSON.stringify(data) });
      }
    } catch {
      setUploadStatus({ type: "error", text: "Upload failed. Please try again." });
    }
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 5000);
  }

  // ─── Delete file handler ──────────────────────────────────
  async function handleDeleteFile(fileId: string) {
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      if (res.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
    setDeletingId(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  // ─── Markdown components ──────────────────────────────────
  const markdownComponents = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const inline = !match && !className;
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: "0.75em 0",
              borderRadius: "0.75rem",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              fontSize: "0.8em",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  // ─── Send message (auto-create conversation if none) ──────
  async function handleSend() {
    if (!inputValue.trim() || isLoading) return;

    // If no active conversation, create one first
    if (!activeConversationId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: inputValue.slice(0, 50) }),
        });
        if (res.ok) {
          const newConvo = await res.json();
          setConversationsList((prev) => [
            { id: newConvo.id, title: newConvo.title, createdAt: newConvo.createdAt, updatedAt: newConvo.updatedAt },
            ...prev,
          ]);
          setActiveConversationId(newConvo.id);
        }
      } catch (e) {
        console.error("Failed to create conversation:", e);
        return;
      }
    }

    const text = inputValue;
    setInputValue("");
    sendMessage({ text });
  }

  return (
    <div
      className="flex h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {/* ═══ Sidebar ═══ */}
      <div
        className={`flex-shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-72" : "w-0"
        } overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            <span className="text-white text-sm font-semibold">Knowledge AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <PanelLeftClose className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 hover:from-violet-500/30 hover:to-indigo-500/30 border border-violet-400/20 hover:border-violet-400/40 text-violet-300 text-xs font-medium transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pb-2">
          <button
            onClick={() => setSidebarTab("chats")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg transition-all ${
              sidebarTab === "chats"
                ? "bg-violet-500/20 text-violet-300 border border-violet-400/20"
                : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Chats
            {conversationsList.length > 0 && (
              <span className="bg-violet-500/30 text-violet-300 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                {conversationsList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSidebarTab("docs")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg transition-all ${
              sidebarTab === "docs"
                ? "bg-violet-500/20 text-violet-300 border border-violet-400/20"
                : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
            }`}
          >
            <HardDrive className="w-3 h-3" />
            Docs
            {uploadedFiles.length > 0 && (
              <span className="bg-violet-500/30 text-violet-300 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                {uploadedFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Chats Tab ── */}
        {sidebarTab === "chats" && (
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                <p className="text-slate-500 text-xs">Loading chats...</p>
              </div>
            ) : conversationsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-2 py-10">
                <MessageSquare className="w-8 h-8 text-slate-600" />
                <p className="text-slate-500 text-xs">No chats yet</p>
                <p className="text-slate-600 text-[10px]">Start a new conversation</p>
              </div>
            ) : (
              conversationsList.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    c.id === activeConversationId
                      ? "bg-violet-500/20 border border-violet-400/20"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.id === activeConversationId ? "text-violet-400" : "text-slate-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${c.id === activeConversationId ? "text-slate-200" : "text-slate-400"}`}>
                      {c.title}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {formatRelativeDate(c.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Docs Tab ── */}
        {sidebarTab === "docs" && (
          <>
            <div className="px-3 pb-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all duration-200"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Document
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {uploadedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-2 py-10">
                  <FileText className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-500 text-xs">No documents yet</p>
                  <p className="text-slate-600 text-[10px]">Upload PDF, Excel, Word, or text files</p>
                </div>
              ) : (
                uploadedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-default hover:bg-white/5 transition-all"
                  >
                    <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                      {getFileIcon(f.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-medium truncate" title={f.name}>
                        {f.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-500 text-[10px]">{formatBytes(f.size)}</span>
                        <span className="text-slate-700 text-[10px]">•</span>
                        <span className="text-slate-500 text-[10px]">{f.chunkCount} chunks</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-600" />
                        <span className="text-slate-600 text-[10px]">{formatDate(f.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      disabled={deletingId === f.id}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                      title="Delete file"
                    >
                      {deletingId === f.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <div className="px-4 py-3 border-t border-white/5">
                <p className="text-slate-600 text-[10px] text-center">
                  {uploadedFiles.reduce((sum, f) => sum + f.chunkCount, 0)} total chunks indexed
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-1"
            >
              <PanelLeftOpen className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">Knowledge AI</h1>
            <p className="text-violet-300 text-[11px]">RAG-powered document assistant</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isLoading && (
              <button
                onClick={() => stop()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 text-xs font-medium transition-all"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[11px] font-medium">Online</span>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-900/80 backdrop-blur-sm border-2 border-dashed border-violet-400 m-4 rounded-2xl">
            <Upload className="w-16 h-16 text-violet-400 mb-4 animate-bounce" />
            <p className="text-white text-xl font-semibold">Drop your file here</p>
            <p className="text-violet-300 text-sm mt-1">PDF, Excel, Word, TXT, CSV, MD</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-violet-500/40">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-white text-2xl font-bold">How can I help you?</h2>
              <p className="text-slate-400 text-sm max-w-sm">
                Upload a document using the sidebar, then ask me anything about it. I&apos;ll search your knowledge base and cite my sources.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
                {[
                  { icon: "📄", text: "Upload a PDF document" },
                  { icon: "📊", text: "Import an Excel sheet" },
                  { icon: "💬", text: "Ask about your data" },
                  { icon: "🔍", text: "Search across files" },
                ].map((hint) => (
                  <div
                    key={hint.text}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-xs text-center cursor-default hover:bg-white/10 hover:border-violet-500/30 transition-all duration-200"
                  >
                    <span className="mr-1">{hint.icon}</span> {hint.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-500/30"
                    : "bg-gradient-to-br from-violet-500 to-indigo-500 shadow-violet-500/30"
                }`}
              >
                {m.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className="max-w-[75%] space-y-2">
                {m.parts.map((part: any, i: number) => {
                  if (part.type === "text") {
                    if (m.role === "user") {
                      return (
                        <div
                          key={i}
                          className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-tr-sm shadow-pink-500/20"
                        >
                          {part.text}
                        </div>
                      );
                    }
                    const copyKey = `${m.id}-${i}`;
                    return (
                      <div key={i} className="relative group/msg">
                        <div className="rounded-2xl px-4 py-3 shadow-lg bg-white/10 backdrop-blur-sm border border-white/10 rounded-tl-sm">
                          <div className="prose-ai">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(part.text, copyKey)}
                          className="absolute bottom-2 right-2 opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-slate-200 transition-all"
                          title="Copy response"
                        >
                          {copiedId === copyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  }
                  if (
                    part.type === "tool-addResource" ||
                    part.type === "tool-getInformation"
                  ) {
                    const isDone =
                      part.state === "output-available" ||
                      part.state === "input-available" ||
                      status === "ready";
                    const hasTextAfter = m.parts
                      .slice(i + 1)
                      .some((p: any) => p.type === "text" && p.text.length > 0);
                    if (hasTextAfter) return null;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 rounded-xl px-3 py-2"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                        )}
                        <span className="text-xs text-indigo-300">
                          {part.type === "tool-getInformation"
                            ? "🔍 Searching knowledge base"
                            : "💾 Saving to knowledge base"}
                          {isDone ? " — done" : "..."}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <div className="shimmer w-48 h-3 rounded" />
                </div>
                <div className="flex gap-1 items-center h-5 mt-1">
                  <div className="shimmer w-36 h-3 rounded" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Upload status toast */}
        {uploadStatus && (
          <div
            className={`mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all ${
              uploadStatus.type === "loading"
                ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
                : uploadStatus.type === "success"
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                : "bg-red-500/20 border-red-400/30 text-red-200"
            }`}
          >
            {uploadStatus.type === "loading" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
            {uploadStatus.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {uploadStatus.type === "error" && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="text-xs">{uploadStatus.text}</span>
            <button onClick={() => setUploadStatus(null)} className="ml-auto p-0.5 rounded hover:bg-white/10">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-5 pt-2">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2 shadow-2xl focus-within:border-violet-400/50 transition-colors">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0 cursor-pointer p-2 rounded-xl hover:bg-white/10 transition-colors group"
              title="Upload document"
            >
              <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={onFileChange}
            />

            <input
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none py-1"
              value={inputValue}
              placeholder="Ask anything about your documents..."
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && inputValue.trim() && !isLoading) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
            />

            {isLoading ? (
              <button
                onClick={() => stop()}
                className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 transition-all shadow-lg shadow-red-500/30"
                title="Stop generation"
              >
                <Square className="w-4 h-4 text-white fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          <p className="text-center text-slate-600 text-[10px] mt-2">
            Drag &amp; drop files anywhere • Supports PDF, Excel, Word, TXT, CSV, Markdown
          </p>
        </div>
      </div>
    </div>
  );
}

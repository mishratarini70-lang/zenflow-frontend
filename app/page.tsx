"use client";

// =============================================================================
// ZENFLOW — page.tsx
// Next.js App Router · Split-Screen · Dark Mode · Emerald × Gold
// =============================================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskTag =
  | "Acad"
  | "Placement"
  | "Committee"
  | "Personal"
  | "Chill"
  | "Brainstorm"
  | "Trading";

type TaskStatus = "todo" | "in_progress" | "done" | "deferred";
type EnergyLevel = "low" | "medium" | "high";
type ChatContext = "task_breakdown" | "journal" | "idea" | null;

interface Task {
  id: string;
  title: string;
  tag: TaskTag;
  estimated_minutes: number;
  priority: number;
  status: TaskStatus;
  energy_required: "low" | "medium" | "high";
  is_flexible: boolean;
}

interface ScheduleBlock {
  task_id: string;
  task_title: string;
  start_time: string;
  end_time: string;
  tag: TaskTag;
  buffer_after: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<TaskTag, { bg: string; text: string; border: string }> = {
  Acad:        { bg: "bg-emerald-500/20", text: "text-emerald-300",  border: "border-emerald-500/40" },
  Placement:   { bg: "bg-amber-500/20",   text: "text-amber-300",    border: "border-amber-500/40"   },
  Committee:   { bg: "bg-violet-500/20",  text: "text-violet-300",   border: "border-violet-500/40"  },
  Personal:    { bg: "bg-sky-500/20",     text: "text-sky-300",      border: "border-sky-500/40"     },
  Chill:       { bg: "bg-teal-500/20",    text: "text-teal-300",     border: "border-teal-500/40"    },
  Brainstorm:  { bg: "bg-rose-500/20",    text: "text-rose-300",     border: "border-rose-500/40"    },
  Trading:     { bg: "bg-yellow-500/20",  text: "text-yellow-300",   border: "border-yellow-500/40"  },
};

const ENERGY_CONFIG: Record<EnergyLevel, { label: string; icon: string; color: string }> = {
  low:    { label: "Low",    icon: "🔋", color: "text-red-400"     },
  medium: { label: "Medium", icon: "⚡", color: "text-amber-400"   },
  high:   { label: "High",   icon: "🔥", color: "text-emerald-400" },
};

const MOOD_EMOJIS = ["😤", "😩", "😐", "🙂", "😌", "🔥", "💪", "🥹"];

const MOCK_TASKS: Task[] = [
  { id: "1", title: "OR Assignment — LP Formulation",    tag: "Acad",       estimated_minutes: 90,  priority: 5, status: "todo",        energy_required: "high",   is_flexible: false },
  { id: "2", title: "Data Warehouse ERD Design",          tag: "Acad",       estimated_minutes: 60,  priority: 4, status: "in_progress", energy_required: "high",   is_flexible: true  },
  { id: "3", title: "Mock GD prep — Case Study",          tag: "Placement",  estimated_minutes: 45,  priority: 4, status: "todo",        energy_required: "medium", is_flexible: true  },
  { id: "4", title: "Convocation Committee — Venue deck", tag: "Committee",  estimated_minutes: 30,  priority: 3, status: "todo",        energy_required: "medium", is_flexible: true  },
  { id: "5", title: "Review trading journal",             tag: "Trading",    estimated_minutes: 20,  priority: 3, status: "todo",        energy_required: "low",    is_flexible: true  },
  { id: "6", title: "Read Atomic Habits — Chapter 7",     tag: "Chill",      estimated_minutes: 25,  priority: 2, status: "done",        energy_required: "low",    is_flexible: true  },
  { id: "7", title: "App idea: ZenFlow for Teams",        tag: "Brainstorm", estimated_minutes: 15,  priority: 2, status: "todo",        energy_required: "low",    is_flexible: true  },
];

const MOCK_SCHEDULE: ScheduleBlock[] = [
  { task_id: "c1", task_title: "Operations Research Class",    start_time: "09:00", end_time: "10:30", tag: "Acad",      buffer_after: false },
  { task_id: "2",  task_title: "Data Warehouse ERD Design",    start_time: "11:00", end_time: "12:00", tag: "Acad",      buffer_after: true  },
  { task_id: "3",  task_title: "Mock GD prep — Case Study",    start_time: "14:00", end_time: "14:45", tag: "Placement", buffer_after: true  },
  { task_id: "4",  task_title: "Convocation Committee deck",   start_time: "16:00", end_time: "16:30", tag: "Committee", buffer_after: false },
  { task_id: "5",  task_title: "Review trading journal",       start_time: "18:00", end_time: "18:20", tag: "Trading",   buffer_after: false },
  { task_id: "7",  task_title: "ZenFlow idea — braindump",     start_time: "21:00", end_time: "21:15", tag: "Brainstorm",buffer_after: false },
];

// ─── Utility Hooks ────────────────────────────────────────────────────────────

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useEnergyNotification(onCheck: (energy: EnergyLevel) => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      Notification.requestPermission().catch(() => {});
    }
    // Fire check-in every 2 hours (7200000ms). In dev, use 30s for testing.
    const INTERVAL = process.env.NODE_ENV === "development" ? 30_000 : 7_200_000;
    const id = setInterval(() => {
      if (Notification.permission === "granted") {
        new Notification("⚡ ZenFlow Energy Check", {
          body: "How are your energy levels right now?",
          icon: "/favicon.ico",
        });
      }
      // Trigger modal in UI regardless
      onCheck("medium"); // Placeholder; real impl opens modal
    }, INTERVAL);
    return () => clearInterval(id);
  }, [onCheck]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: TaskTag }) {
  const c = TAG_COLORS[tag];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {tag}
    </span>
  );
}

function PriorityDots({ priority }: { priority: number }) {
  return (
    <span className="flex gap-0.5 items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < priority ? "bg-amber-400" : "bg-zinc-700"}`}
        />
      ))}
    </span>
  );
}

function EnergyBadge({ level }: { level: EnergyLevel }) {
  const c = ENERGY_CONFIG[level];
  return (
    <span className={`text-xs font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  title,
  tasks,
  status,
  onStatusChange,
  accent,
}: {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  onStatusChange: (id: string, s: TaskStatus) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      {/* Column header */}
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accent}`}>
        <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">
          {title}
        </span>
        <span className="ml-auto text-xs text-zinc-600 font-mono">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="group relative rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:border-zinc-600 transition-all hover:bg-zinc-900 cursor-pointer"
          >
            {/* Priority stripe */}
            <div
              className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
                task.priority >= 4 ? "bg-amber-400" : task.priority === 3 ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />

            <p className="text-sm text-zinc-200 font-medium leading-snug pl-2 mb-2">
              {task.title}
            </p>

            <div className="flex items-center gap-2 pl-2 flex-wrap">
              <TagBadge tag={task.tag} />
              <PriorityDots priority={task.priority} />
              <span className="text-xs text-zinc-500 ml-auto font-mono">
                {task.estimated_minutes}m
              </span>
            </div>

            {/* Quick status change buttons */}
            <div className="mt-2 pl-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {(["todo", "in_progress", "done"] as TaskStatus[])
                .filter((s) => s !== status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(task.id, s)}
                    className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                  >
                    → {s.replace("_", " ")}
                  </button>
                ))}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline Schedule ─────────────────────────────────────────────────────────

function TimelineSchedule({ blocks, now }: { blocks: ScheduleBlock[]; now: Date }) {
  const nowHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        const isPast    = block.end_time < nowHHMM;
        const isCurrent = block.start_time <= nowHHMM && nowHHMM < block.end_time;
        const c = TAG_COLORS[block.tag];

        return (
          <div key={i}>
            <div
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                isCurrent
                  ? `${c.bg} ${c.border} border shadow-lg shadow-emerald-900/20`
                  : isPast
                  ? "bg-zinc-900/30 border-zinc-800/40 opacity-50"
                  : "bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-600"
              }`}
            >
              {/* NOW indicator */}
              {isCurrent && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}

              <div className="text-xs font-mono text-zinc-500 w-20 shrink-0">
                {block.start_time}–{block.end_time}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCurrent ? "text-zinc-100" : "text-zinc-300"}`}>
                  {block.task_title}
                </p>
              </div>

              <TagBadge tag={block.tag} />
            </div>

            {/* Buffer indicator */}
            {block.buffer_after && !isPast && (
              <div className="ml-3 flex items-center gap-2 py-0.5">
                <div className="w-16 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 italic">15m buffer</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  onSend,
  isLoading,
  context,
  onContextChange,
  energyLevel,
}: {
  messages: ChatMsg[];
  onSend: (msg: string) => void;
  isLoading: boolean;
  context: ChatContext;
  onContextChange: (c: ChatContext) => void;
  energyLevel: EnergyLevel;
}) {
  const [input, setInput]           = useState("");
  const [isListening, setListening] = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setListening(false);
      return;
    }

    recognition.start();
    setListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend   = () => setListening(false);
  };

  const CONTEXT_OPTIONS: { label: string; value: ChatContext; icon: string }[] = [
    { label: "General",        value: null,             icon: "💬" },
    { label: "Break Down Task", value: "task_breakdown", icon: "🎯" },
    { label: "Idea Vault",     value: "idea",           icon: "💡" },
    { label: "ZenWrap",        value: "journal",        icon: "🌙" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-zinc-100 tracking-tight">ZenFlow AI</span>
          <span className={`text-xs ${ENERGY_CONFIG[energyLevel].color}`}>
            {ENERGY_CONFIG[energyLevel].icon} {energyLevel}
          </span>
        </div>

        {/* Context selector */}
        <div className="flex gap-1">
          {CONTEXT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onContextChange(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                context === opt.value
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
            <span className="text-5xl">✦</span>
            <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
              Your AI partner is ready. Drop a task, an idea, or just tell me how you&apos;re doing.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === "assistant"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {msg.role === "assistant" ? "✦" : "M"}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500/10 text-zinc-200 border border-amber-500/20 rounded-tr-sm"
                  : "bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-tl-sm"
              }`}
            >
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split("\n").length - 1 && <br />}
                </span>
              ))}
              <p className="text-xs text-zinc-600 mt-1.5 text-right">
                {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">
              ✦
            </div>
            <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4">
        <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 focus-within:border-emerald-500/50 focus-within:shadow-lg focus-within:shadow-emerald-900/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              context === "task_breakdown" ? "Describe the goal you want to break down..."
              : context === "journal"      ? "Share how your day went..."
              : context === "idea"         ? "Describe your idea..."
              : "What's on your mind?"
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none outline-none max-h-32 leading-relaxed py-1"
            style={{ minHeight: "24px" }}
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice input */}
            <button
              onClick={toggleVoice}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
              title="Voice input"
            >
              {isListening ? "⏹" : "🎙"}
            </button>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-900/30"
            >
              ↑
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-700 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line · 🎙 for voice
        </p>
      </div>
    </div>
  );
}

// ── Energy Modal ──────────────────────────────────────────────────────────────

function EnergyModal({
  onSelect,
  onClose,
}: {
  onSelect: (e: EnergyLevel) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-lg font-semibold text-zinc-100 mb-1">⚡ Energy Check-In</p>
        <p className="text-sm text-zinc-400 mb-5">
          How are you feeling right now? I&apos;ll adjust your next block accordingly.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
            const c = ENERGY_CONFIG[level];
            return (
              <button
                key={level}
                onClick={() => { onSelect(level); onClose(); }}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                  level === "low"    ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                  : level === "medium" ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                  : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                }`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className={`text-xs font-semibold ${c.color}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Mobile Nav Toggle ─────────────────────────────────────────────────────────

function MobileNav({
  view,
  onChange,
}: {
  view: "kanban" | "chat";
  onChange: (v: "kanban" | "chat") => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-zinc-900/95 border border-zinc-700 rounded-full px-1.5 py-1.5 gap-1 shadow-2xl backdrop-blur-sm md:hidden">
      <button
        onClick={() => onChange("kanban")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          view === "kanban"
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        📋 Board
      </button>
      <button
        onClick={() => onChange("chat")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          view === "chat"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        ✦ AI Chat
      </button>
    </div>
  );
}

// =============================================================================
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// =============================================================================

export default function ZenFlowPage() {
  const now                           = useCurrentTime();
  const [tasks, setTasks]             = useState<Task[]>(MOCK_TASKS);
  const [schedule]                    = useState<ScheduleBlock[]>(MOCK_SCHEDULE);
  const [messages, setMessages]       = useState<ChatMsg[]>([]);
  const [isAILoading, setAILoading]   = useState(false);
  const [chatContext, setChatContext]  = useState<ChatContext>(null);
  const [energyLevel, setEnergy]      = useState<EnergyLevel>("medium");
  const [showEnergyModal, setEModal]  = useState(false);
  const [mobileView, setMobileView]   = useState<"kanban" | "chat">("chat");
  const [leftTab, setLeftTab]         = useState<"schedule" | "kanban">("schedule");

  // ── 2-hour energy check-in ──────────────────────────────────────────────────
  const triggerEnergyCheck = useCallback(() => setEModal(true), []);
  useEnergyNotification(triggerEnergyCheck);

  // ── Midnight ZenWrap prompt ─────────────────────────────────────────────────
  useEffect(() => {
    if (now.getHours() === 0 && now.getMinutes() < 2 && messages.length === 0) {
      setChatContext("journal");
      setMessages([{
        role: "assistant",
        content: "🌙 Midnight. Time for your ZenWrap.\n\nBefore the day closes — on a scale of 1–10, how was today? Pick a mood:\n\n😤 😩 😐 🙂 😌 🔥 💪 🥹",
        timestamp: new Date(),
      }]);
      setMobileView("chat");
    }
  }, [now]);

  // ── Status change (Kanban drag replacement) ─────────────────────────────────
  const handleStatusChange = (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  // ── AI send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    const userMsg: ChatMsg = { role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setAILoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "local-user",            // Replace with Supabase auth user ID
          message: content,
          context: chatContext,
          energy_level: energyLevel,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Couldn't reach the backend. Check your API connection.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setAILoading(false);
    }
  };

  // ── Kanban columns ──────────────────────────────────────────────────────────
  const columns: { title: string; status: TaskStatus; accent: string }[] = [
    { title: "To Do",       status: "todo",        accent: "border-zinc-700" },
    { title: "In Progress", status: "in_progress", accent: "border-amber-500/40" },
    { title: "Done",        status: "done",        accent: "border-emerald-500/40" },
  ];

  // ─────────────────────────────────────────────────────────────────────────────

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      {/* ── Global styles injected via style tag (no external font CDN in App Router) ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

        :root {
          --emerald: #10b981;
          --gold: #f59e0b;
          --surface: #0e0e10;
          --surface-2: #141417;
          --surface-3: #1a1a1f;
          --border: #27272a;
        }

        * { box-sizing: border-box; }

        body {
          background: var(--surface);
          color: #e4e4e7;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
          height: 100dvh;
        }

        .font-display { font-family: 'Syne', sans-serif; }
        .font-mono    { font-family: 'JetBrains Mono', monospace !important; }

        /* Subtle noise texture */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }

        /* Scrollbar */
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }

        /* Textarea auto-grow */
        textarea { field-sizing: content; }
      `}</style>

      {/* ── Energy Modal ──────────────────────────────────────────────────────── */}
      {showEnergyModal && (
        <EnergyModal
          onSelect={(e) => {
            setEnergy(e);
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/energy/check-in`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: "local-user", energy_level: e }),
            }).catch(() => {});
          }}
          onClose={() => setEModal(false)}
        />
      )}

      {/* ── App Shell ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-dvh overflow-hidden">

        {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
        <header className="flex items-center px-5 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <span className="text-white text-xs font-black font-display">Z</span>
            </div>
            <span className="font-display font-bold text-zinc-100 tracking-tight text-lg">
              Zen<span className="text-emerald-400">Flow</span>
            </span>
          </div>

          <div className="mx-4 h-4 w-px bg-zinc-800" />

          <p className="text-xs text-zinc-500 font-mono hidden sm:block">{dateStr}</p>

          <div className="ml-auto flex items-center gap-3">
            {/* Live clock */}
            <span className="font-mono text-sm text-zinc-300 tabular-nums">
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>

            {/* Sleep countdown */}
            {now.getHours() >= 22 && (
              <span className="text-xs text-amber-400 font-medium animate-pulse">
                🌙 Sleep in{" "}
                {60 - now.getHours() === 1
                  ? `${60 - now.getMinutes()}m`
                  : `${60 + 60 - now.getMinutes()}m`}
              </span>
            )}

            {/* Energy pill */}
            <button
              onClick={() => setEModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900 hover:border-zinc-500 transition-all text-xs"
            >
              <EnergyBadge level={energyLevel} />
            </button>

            {/* Avatar placeholder */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
          </div>
        </header>

        {/* ─── Main Split Layout ─────────────────────────────────────────────── */}
        <main className="flex flex-1 min-h-0">

          {/* ── LEFT PANEL (Schedule + Kanban) ──────────────────────────────── */}
          <div
            className={`flex flex-col border-r border-zinc-800 bg-zinc-950/50 ${
              mobileView === "kanban" ? "flex" : "hidden"
            } md:flex md:w-[55%] lg:w-[58%] min-w-0`}
          >
            {/* Left tab switcher */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 shrink-0">
              {[
                { id: "schedule", label: "Today's Schedule", icon: "📅" },
                { id: "kanban",   label: "Task Board",       icon: "📋" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id as "schedule" | "kanban")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    leftTab === tab.id
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}

              {/* Stats strip */}
              <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500 font-mono">
                <span className="text-emerald-400 font-medium">
                  {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20 md:pb-4">
              {leftTab === "schedule" ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Timeline
                    </span>
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-xs text-zinc-600 font-mono">
                      Hard cutoff: 01:00
                    </span>
                  </div>
                  <TimelineSchedule blocks={schedule} now={now} />

                  {/* Sleep boundary marker */}
                  <div className="flex items-center gap-2 mt-4 py-2 px-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <span className="text-amber-400 text-sm">🌙</span>
                    <span className="text-xs text-amber-400/80 font-medium">
                      ZenWrap at 00:00 · Digital Sunset at 01:00
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Kanban Board
                    </span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  <div className="flex gap-4 min-w-0 overflow-x-auto pb-2">
                    {columns.map((col) => (
                      <KanbanColumn
                        key={col.status}
                        title={col.title}
                        tasks={tasks.filter((t) => t.status === col.status)}
                        status={col.status}
                        onStatusChange={handleStatusChange}
                        accent={col.accent}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL (AI Chat) ──────────────────────────────────────── */}
          <div
            className={`flex-1 flex flex-col min-w-0 ${
              mobileView === "chat" ? "flex" : "hidden"
            } md:flex`}
          >
            <ChatPanel
              messages={messages}
              onSend={handleSendMessage}
              isLoading={isAILoading}
              context={chatContext}
              onContextChange={setChatContext}
              energyLevel={energyLevel}
            />
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────────── */}
      <MobileNav view={mobileView} onChange={setMobileView} />
    </>
  );
}

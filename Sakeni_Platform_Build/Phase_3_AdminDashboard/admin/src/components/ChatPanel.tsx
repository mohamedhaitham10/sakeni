"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, ChevronLeft, Shield } from "lucide-react";

export type ChatRole = "student" | "landlord" | "admin";

interface Msg {
  id: number;
  role: ChatRole | "system";
  name: string;
  text: string;
  ts: string;
}

interface Conv {
  id: number;
  listingId: number;
  listingName: string;
  studentName: string;
  landlordName: string;
  messages: Msg[];
  lastMessage: string;
  lastAt: string;
  unread: Record<ChatRole, number>;
}

const STORAGE = "sk_convs";
const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const SYS: Msg = {
  id: 0, role: "system", name: "Sakeni",
  text: "This chat is facilitated and monitored by Sakeni for your safety. 🛡️",
  ts: "",
};

const SEED: Conv[] = [
  {
    id: 1, listingId: 0,
    listingName: "Studio near Cairo University",
    studentName: "Ahmed H.", landlordName: "Mohamed A.",
    messages: [
      SYS,
      { id: 11, role: "student",  name: "Ahmed H.",   text: "Hi! Is the studio still available for June 1st?",                     ts: "09:05" },
      { id: 12, role: "landlord", name: "Mohamed A.", text: "Hello! Yes, available from June 1. Are you enrolled at Cairo Uni?",    ts: "09:12" },
      { id: 13, role: "student",  name: "Ahmed H.",   text: "Yes, 3rd year CS. Can we arrange a viewing this weekend?",            ts: "09:15" },
      { id: 14, role: "landlord", name: "Mohamed A.", text: "Absolutely! Saturday 2–4 PM works. Does that suit you?",              ts: "09:22" },
    ],
    lastMessage: "Absolutely! Saturday 2–4 PM works.",
    lastAt: "09:22",
    unread: { student: 1, landlord: 0, admin: 0 },
  },
  {
    id: 2, listingId: 5,
    listingName: "Cozy Studio – Maadi",
    studentName: "Nour M.", landlordName: "Sara K.",
    messages: [
      SYS,
      { id: 21, role: "student",  name: "Nour M.", text: "Is a 6-month lease possible for the Maadi studio?",                 ts: "11:05" },
      { id: 22, role: "landlord", name: "Sara K.", text: "Minimum is 12 months, but happy to discuss your situation.",        ts: "11:30" },
      { id: 23, role: "admin",    name: "Sakeni",  text: "Reminder: all lease agreements must be registered through Sakeni.", ts: "11:31" },
    ],
    lastMessage: "Minimum is 12 months, happy to discuss.",
    lastAt: "11:30",
    unread: { student: 0, landlord: 0, admin: 0 },
  },
];

function loadConvs(): Conv[] {
  try { const s = localStorage.getItem(STORAGE); return s ? JSON.parse(s) : SEED; } catch { return SEED; }
}
function saveConvs(c: Conv[]) {
  try { localStorage.setItem(STORAGE, JSON.stringify(c)); } catch { /* ignore */ }
}

export function openListingChat(listingId: number, listingName: string) {
  window.dispatchEvent(new CustomEvent("sk:chat", { detail: { listingId, listingName } }));
}

export function ChatPanel({ role, myName }: { role: ChatRole; myName: string }) {
  const [open,     setOpen]     = useState(false);
  const [convs,    setConvs]    = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input,    setInput]    = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = loadConvs();
    setConvs(c);
    if (!localStorage.getItem(STORAGE)) saveConvs(SEED);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, convs]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { listingId, listingName } = (e as CustomEvent).detail as { listingId: number; listingName: string };
      setConvs(prev => {
        const ex = prev.find(c => c.listingId === listingId);
        if (ex) { setActiveId(ex.id); setOpen(true); return prev; }
        const newId = Math.max(0, ...prev.map(c => c.id)) + 1;
        const nc: Conv = {
          id: newId, listingId, listingName,
          studentName: role === "student" ? myName : "Student",
          landlordName: role === "landlord" ? myName : "Landlord",
          messages: [{ ...SYS, id: Date.now() }],
          lastMessage: "Conversation started", lastAt: ts(),
          unread: { student: 0, landlord: role === "student" ? 1 : 0, admin: 1 },
        };
        const updated = [...prev, nc];
        saveConvs(updated);
        setActiveId(newId);
        setOpen(true);
        return updated;
      });
    };
    window.addEventListener("sk:chat", handler);
    return () => window.removeEventListener("sk:chat", handler);
  }, [role, myName]);

  const sendMsg = () => {
    if (!input.trim() || activeId === null) return;
    const text = input.trim();
    setConvs(prev => {
      const updated = prev.map(c => {
        if (c.id !== activeId) return c;
        const msg: Msg = { id: Date.now(), role, name: myName, text, ts: ts() };
        return {
          ...c,
          messages: [...c.messages, msg],
          lastMessage: text, lastAt: ts(),
          unread: {
            student:  role !== "student"  ? c.unread.student  + 1 : 0,
            landlord: role !== "landlord" ? c.unread.landlord + 1 : 0,
            admin:    c.unread.admin,
          },
        };
      });
      saveConvs(updated);
      return updated;
    });
    setInput("");
  };

  const openConv = (id: number) => {
    setConvs(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, unread: { ...c.unread, [role]: 0 } } : c);
      saveConvs(updated);
      return updated;
    });
    setActiveId(id);
  };

  const active = convs.find(c => c.id === activeId);
  const totalUnread = convs.reduce((s, c) => s + c.unread[role], 0);

  const accent = { student: "bg-emerald-600 hover:bg-emerald-500", landlord: "bg-amber-600 hover:bg-amber-500", admin: "bg-indigo-600 hover:bg-indigo-500" }[role];
  const bubble = { student: "bg-emerald-600", landlord: "bg-amber-600", admin: "bg-indigo-600" }[role];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 end-6 z-[60] w-[52px] h-[52px] rounded-full ${accent} text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95`}
        aria-label="Chat"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-[10px] font-bold flex items-center justify-center px-1">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-[78px] end-4 z-[55] w-[380px] max-w-[calc(100vw-16px)] bg-[#0c0c1e] border border-white/12 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/8 bg-white/3 shrink-0">
            <div className="flex items-center gap-2">
              {active && (
                <button onClick={() => setActiveId(null)} className="text-muted-foreground hover:text-white me-1 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm truncate max-w-[220px]">
                {active ? active.listingName : "Sakeni Messenger"}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conversation list */}
          {!active && (
            <div className="flex-1 overflow-y-auto">
              {convs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-3 p-8 text-center">
                  <MessageCircle className="w-10 h-10 opacity-20" />
                  <p>No conversations yet</p>
                  {role === "student" && <p className="text-xs opacity-60">Click &quot;Chat with Landlord&quot; on any listing to start.</p>}
                </div>
              ) : convs.map(c => (
                <button
                  key={c.id}
                  onClick={() => openConv(c.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors border-b border-white/4 last:border-none text-start"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-300">
                    {c.listingName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-sm font-semibold truncate">{c.listingName}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{c.lastAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{c.studentName} ↔ {c.landlordName}</p>
                  </div>
                  {c.unread[role] > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] bg-indigo-500 rounded-full text-[10px] font-bold flex items-center justify-center px-1 mt-1">
                      {c.unread[role]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Active conversation */}
          {active && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/2 border-b border-white/5 shrink-0">
                <Shield className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate">
                  {active.studentName} ↔ {active.landlordName} · monitored by Sakeni
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {active.messages.map(msg => {
                  if (msg.role === "system") return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-[10px] text-indigo-300/70 bg-indigo-500/8 border border-indigo-500/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-center max-w-[90%]">
                        <Shield className="w-3 h-3 shrink-0" /> {msg.text}
                      </span>
                    </div>
                  );
                  const isMe    = msg.role === role;
                  const isAdmin = msg.role === "admin";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : isAdmin ? "items-center" : "items-start"}`}>
                      {!isAdmin && (
                        <span className="text-[10px] text-white/30 mb-1">
                          {isMe ? "You" : msg.name} · {msg.ts}
                        </span>
                      )}
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isAdmin  ? "bg-indigo-900/50 border border-indigo-500/20 text-indigo-300 text-xs text-center" :
                        isMe     ? `${bubble} text-white rounded-br-sm` :
                                   "bg-white/8 border border-white/8 text-white rounded-bl-sm"
                      }`}>
                        {!isMe && !isAdmin && <span className="block text-[10px] font-semibold opacity-50 mb-0.5">{msg.name}</span>}
                        {msg.text}
                      </div>
                      {isAdmin && <span className="text-[10px] text-white/25 mt-1">Sakeni Admin · {msg.ts}</span>}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-white/8 flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  placeholder={role === "admin" ? "Message all parties…" : "Type a message…"}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-white/25"
                />
                <button
                  onClick={sendMsg}
                  disabled={!input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

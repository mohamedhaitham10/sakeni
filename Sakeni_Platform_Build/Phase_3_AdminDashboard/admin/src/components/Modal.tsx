"use client";

import { useEffect } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0d0d22] border border-white/12 rounded-2xl w-[92%] max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/8">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

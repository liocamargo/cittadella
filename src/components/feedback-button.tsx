"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

const FORM_URL = "https://forms.gle/vscAAJ117kJL2v6h9";
const DISMISS_KEY = "cittadella:feedbackDismissed";

export function FeedbackButton() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-1 rounded-full border bg-card py-1 pl-2.5 pr-1 shadow-lg md:bottom-4 md:pl-3">
      <a
        href={FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Danos tu opinión"
        className="flex items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <MessageCircle className="size-4" />
        <span className="hidden md:inline">Danos tu opinión</span>
      </a>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        aria-label="Cerrar"
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

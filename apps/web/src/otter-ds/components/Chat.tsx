"use client";

import * as React from "react";
import Icon from "./Icon";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  thinking?: boolean;
  shouldWrap?: boolean;
  onNewSession?: () => void;
}

export function Chat({ messages, onSend, thinking, shouldWrap, onNewSession }: ChatProps) {
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="otr-chat">
      <div className="otr-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !thinking && (
          <div className="otr-chat-empty">
            Tell me about your day — I'll pick out the habits.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`otr-chat-bubble otr-chat-${m.role}`}>
            <div className="otr-chat-content">{m.content}</div>
          </div>
        ))}
        {thinking && (
          <div className="otr-chat-bubble otr-chat-assistant">
            <span className="otr-thinking">
              <span className="otr-thinking-dot" /> thinking…
            </span>
          </div>
        )}
      </div>

      {shouldWrap && onNewSession && (
        <div className="otr-chat-wrap-banner">
          <span>Session getting long.</span>
          <button className="otr-btn-sm" onClick={onNewSession}>Start fresh</button>
        </div>
      )}

      <form className="otr-chat-input" onSubmit={handleSubmit}>
        <textarea
          className="otr-chat-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What did you do today?"
          rows={1}
          disabled={thinking}
        />
        <button
          type="submit"
          className="otr-chat-send"
          disabled={!draft.trim() || thinking}
          title="Send"
        >
          <Icon.Send style={{ width: 16, height: 16 }} />
        </button>
      </form>
    </div>
  );
}

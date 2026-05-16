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
  thinking: boolean;
  shouldWrap: boolean;
  onNewSession: () => void;
}

export function Chat({
  messages,
  onSend,
  thinking,
  shouldWrap,
  onNewSession,
}: ChatProps) {
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const isFocal = messages.length === 0 && !thinking;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking]);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = isFocal ? 200 : 120;
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
  }, [input, isFocal]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isFocal) {
    return (
      <div className="otr-chat otr-chat-focal">
        <div className="otr-chat-focal-input-area">
          <textarea
            ref={inputRef}
            className="otr-chat-focal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your day..."
            rows={3}
          />
          <div className="otr-chat-focal-actions">
            <button
              className="otr-chat-mic"
              type="button"
              title="Dictate"
            >
              <Icon.Mic style={{ width: 18, height: 18 }} />
            </button>
            <button
              className="otr-chat-send"
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send"
            >
              <Icon.Chevron style={{ width: 16, height: 16, transform: "rotate(-90deg)" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="otr-chat">
      <div className="otr-chat-messages" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`otr-chat-bubble ${msg.role}`}
          >
            <div className="otr-chat-bubble-content">{msg.content}</div>
          </div>
        ))}

        {thinking && (
          <div className="otr-chat-bubble assistant">
            <div className="otr-chat-bubble-content">
              <span className="otr-chat-thinking">
                <span className="otr-thinking-dot" />
                <span className="otr-thinking-dot" />
                <span className="otr-thinking-dot" />
              </span>
            </div>
          </div>
        )}
      </div>

      {shouldWrap && (
        <div className="otr-chat-wrap-prompt">
          <span>This session is getting long.</span>
          <button className="otr-chat-wrap-btn" onClick={onNewSession}>
            Start new session
          </button>
        </div>
      )}

      <div className="otr-chat-input-area">
        <textarea
          ref={inputRef}
          className="otr-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me about your day..."
          rows={1}
          disabled={thinking}
        />
        <button
          className="otr-chat-mic"
          type="button"
          title="Dictate"
        >
          <Icon.Mic style={{ width: 18, height: 18 }} />
        </button>
        <button
          className="otr-chat-send"
          onClick={handleSend}
          disabled={!input.trim() || thinking}
          title="Send"
        >
          <Icon.Chevron style={{ width: 16, height: 16, transform: "rotate(-90deg)" }} />
        </button>
      </div>
    </div>
  );
}

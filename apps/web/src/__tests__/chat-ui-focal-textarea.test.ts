import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(
  join(__dirname, "..", "otter-ds", "styles", "components.css"),
  "utf-8"
);

const chatTsx = readFileSync(
  join(__dirname, "..", "otter-ds", "components", "Chat.tsx"),
  "utf-8"
);

describe("Chat UI focal textarea design (issue #43)", () => {
  describe("prominent textarea in empty state", () => {
    it("defines .otr-chat-focal class for large textarea mode", () => {
      expect(css).toMatch(/\.otr-chat-focal/);
    });

    it("removes border from chat container when in focal mode", () => {
      expect(css).toMatch(/\.otr-chat-focal\s*\{[^}]*border:\s*none/);
    });

    it("focal textarea has larger min-height than standard input", () => {
      const match = css.match(
        /\.otr-chat-focal-input\s*\{[^}]*min-height:\s*(\d+)px/
      );
      expect(match).not.toBeNull();
      const height = parseInt(match![1], 10);
      expect(height).toBeGreaterThanOrEqual(100);
    });

    it("focal textarea uses larger font size for prominence", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input\s*\{[^}]*font-size:\s*var\(--fs-lg\)/
      );
    });

    it("focal textarea uses relaxed line-height", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input\s*\{[^}]*line-height:\s*var\(--lh-relaxed\)/
      );
    });

    it("focal input area has no border-top separator", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input-area\s*\{[^}]*border-top:\s*none/
      );
    });

    it("focal input area uses generous padding", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input-area\s*\{[^}]*padding:\s*var\(--sp-6\)/
      );
    });
  });

  describe("dictate/mic button", () => {
    it("Chat component renders a mic button", () => {
      expect(chatTsx).toMatch(/otr-chat-mic/);
    });

    it("defines .otr-chat-mic styles", () => {
      expect(css).toMatch(/\.otr-chat-mic\s*\{/);
    });

    it("mic button uses accent-soft background token", () => {
      expect(css).toMatch(
        /\.otr-chat-mic\s*\{[^}]*var\(--accent-soft\)/
      );
    });

    it("mic button uses accent color for the icon", () => {
      expect(css).toMatch(
        /\.otr-chat-mic\s*\{[^}]*color:\s*var\(--accent\)/
      );
    });

    it("Chat component imports Icon.Mic", () => {
      expect(chatTsx).toMatch(/Icon\.Mic/);
    });
  });

  describe("placeholder text", () => {
    it("uses 'Tell me about your day...' placeholder", () => {
      expect(chatTsx).toMatch(/Tell me about your day/);
    });

    it("focal placeholder uses ink-soft color for inviting feel", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input::placeholder\s*\{[^}]*var\(--ink-soft\)/
      );
    });
  });

  describe("transitions between empty and conversation states", () => {
    it("component conditionally applies focal class based on messages", () => {
      expect(chatTsx).toMatch(/otr-chat-focal/);
    });

    it("standard chat container still has border for conversation mode", () => {
      expect(css).toMatch(/\.otr-chat\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    });
  });

  describe("dark mode support", () => {
    it("dark theme tokens cover focal input background", () => {
      expect(css).toMatch(
        /\[data-theme="dark"\][^{]*\.otr-chat-focal-input|\.otr-chat-focal-input[^{]*\{[^}]*var\(--bg\)/
      );
    });
  });

  describe("design token usage", () => {
    it("focal textarea border uses rule token on focus uses accent", () => {
      expect(css).toMatch(/\.otr-chat-focal-input:focus/);
      expect(css).toMatch(
        /\.otr-chat-focal-input:focus\s*\{[^}]*var\(--accent\)/
      );
    });

    it("focal textarea uses shadow for prominence", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input\s*\{[^}]*var\(--shadow-sm\)/
      );
    });

    it("focal textarea uses border-radius token", () => {
      expect(css).toMatch(
        /\.otr-chat-focal-input\s*\{[^}]*var\(--r-lg\)/
      );
    });
  });
});

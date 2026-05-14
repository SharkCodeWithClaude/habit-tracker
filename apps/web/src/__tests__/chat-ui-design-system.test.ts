import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(
  join(__dirname, "..", "..", "..", "..", "otter-ds", "styles", "components.css"),
  "utf-8"
);

describe("Chat component design system styles", () => {
  describe("chat container", () => {
    it("defines .otr-chat with flex layout", () => {
      expect(css).toMatch(/\.otr-chat\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.otr-chat\s*\{[^}]*flex-direction:\s*column/);
    });

    it("uses design tokens for border and radius", () => {
      expect(css).toMatch(/\.otr-chat\s*\{[^}]*var\(--rule\)/);
      expect(css).toMatch(/\.otr-chat\s*\{[^}]*var\(--r-lg\)/);
    });
  });

  describe("messages area", () => {
    it("defines .otr-chat-messages with scroll overflow", () => {
      expect(css).toMatch(/\.otr-chat-messages\s*\{[^}]*overflow-y:\s*auto/);
    });

    it("has a reasonable min-height for the messages area", () => {
      expect(css).toMatch(/\.otr-chat-messages\s*\{[^}]*min-height:/);
    });
  });

  describe("empty state", () => {
    it("defines .otr-chat-empty with centered layout", () => {
      expect(css).toMatch(/\.otr-chat-empty\s*\{[^}]*text-align:\s*center/);
    });

    it("styles the empty icon with large font size", () => {
      expect(css).toMatch(/\.otr-chat-empty-icon\s*\{/);
    });

    it("styles the hint text with faint ink token", () => {
      expect(css).toMatch(/\.otr-chat-empty-hint\s*\{[^}]*var\(--ink-faint\)/);
    });
  });

  describe("chat bubbles", () => {
    it("defines .otr-chat-bubble base styles", () => {
      expect(css).toMatch(/\.otr-chat-bubble\s*\{/);
    });

    it("styles user bubbles with accent token", () => {
      expect(css).toMatch(/\.otr-chat-bubble\.user/);
    });

    it("styles assistant bubbles with soft background token", () => {
      expect(css).toMatch(/\.otr-chat-bubble\.assistant/);
    });

    it("defines bubble content with proper typography tokens", () => {
      expect(css).toMatch(/\.otr-chat-bubble-content\s*\{[^}]*var\(--fs-base\)/);
      expect(css).toMatch(/\.otr-chat-bubble-content\s*\{[^}]*var\(--lh-relaxed\)/);
    });
  });

  describe("thinking indicator", () => {
    it("defines .otr-chat-thinking with flex layout", () => {
      expect(css).toMatch(/\.otr-chat-thinking\s*\{[^}]*display:\s*inline-flex/);
    });

    it("uses .otr-thinking-dot with pulse animation", () => {
      expect(css).toMatch(/\.otr-chat-thinking\s+\.otr-thinking-dot/);
    });
  });

  describe("input area", () => {
    it("defines .otr-chat-input-area with flex layout and border-top", () => {
      expect(css).toMatch(/\.otr-chat-input-area\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.otr-chat-input-area\s*\{[^}]*border-top:/);
    });

    it("styles the textarea with design system font and sizing tokens", () => {
      expect(css).toMatch(/\.otr-chat-input\s*\{[^}]*var\(--font-sans\)/);
      expect(css).toMatch(/\.otr-chat-input\s*\{[^}]*var\(--fs-base\)/);
    });

    it("textarea has proper min-height for usability", () => {
      expect(css).toMatch(/\.otr-chat-input\s*\{[^}]*min-height:/);
    });

    it("styles the send button with icon sizing", () => {
      expect(css).toMatch(/\.otr-chat-send\s*\{/);
    });

    it("styles disabled send button", () => {
      expect(css).toMatch(/\.otr-chat-send:disabled/);
    });
  });

  describe("wrap prompt", () => {
    it("defines .otr-chat-wrap-prompt with background token", () => {
      expect(css).toMatch(/\.otr-chat-wrap-prompt\s*\{[^}]*var\(--warn-soft\)/);
    });

    it("styles the wrap button", () => {
      expect(css).toMatch(/\.otr-chat-wrap-btn\s*\{/);
    });
  });

  describe("mobile responsiveness", () => {
    it("includes chat styles inside the mobile media query", () => {
      const mobileBlock = css.match(/@media\s*\(max-width:\s*820px\)\s*\{([\s\S]*)\}/);
      expect(mobileBlock).not.toBeNull();
      expect(mobileBlock![1]).toMatch(/\.otr-chat/);
    });
  });
});

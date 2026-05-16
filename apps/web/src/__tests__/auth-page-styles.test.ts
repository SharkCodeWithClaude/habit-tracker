import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(
  join(__dirname, "..", "otter-ds", "styles", "components.css"),
  "utf-8"
);

describe("Auth page design system styles", () => {
  describe(".otr-auth-page — full-page centered container", () => {
    it("defines .otr-auth-page with centering", () => {
      expect(css).toMatch(/\.otr-auth-page\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.otr-auth-page\s*\{[^}]*align-items:\s*center/);
      expect(css).toMatch(/\.otr-auth-page\s*\{[^}]*justify-content:\s*center/);
    });

    it("uses full viewport height", () => {
      expect(css).toMatch(/\.otr-auth-page\s*\{[^}]*min-height:\s*100vh/);
    });

    it("uses design token for background", () => {
      expect(css).toMatch(/\.otr-auth-page\s*\{[^}]*var\(--bg-soft\)/);
    });
  });

  describe(".otr-auth-form — card with padding, shadow, border-radius", () => {
    it("defines .otr-auth-form with flex column layout", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*flex-direction:\s*column/);
    });

    it("uses design token for background", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*var\(--bg\)/);
    });

    it("uses design token for border-radius", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*var\(--r-lg\)/);
    });

    it("uses design token for shadow", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*var\(--shadow-md\)/);
    });

    it("uses design token for spacing (gap)", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*var\(--sp-4\)/);
    });

    it("sets a max-width for the card", () => {
      expect(css).toMatch(/\.otr-auth-form\s*\{[^}]*max-width:/);
    });

    it("styles the heading", () => {
      expect(css).toMatch(/\.otr-auth-form\s+h1\s*\{/);
    });

    it("styles labels with flex column layout", () => {
      expect(css).toMatch(/\.otr-auth-form\s+label\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.otr-auth-form\s+label\s*\{[^}]*flex-direction:\s*column/);
    });

    it("styles inputs with border and design tokens", () => {
      expect(css).toMatch(/\.otr-auth-form\s+input\s*\{[^}]*var\(--rule\)/);
      expect(css).toMatch(/\.otr-auth-form\s+input\s*\{[^}]*var\(--r-md\)/);
    });

    it("styles input focus state with accent ring", () => {
      expect(css).toMatch(/\.otr-auth-form\s+input:focus\s*\{[^}]*var\(--accent\)/);
    });

    it("styles the submit button with accent background", () => {
      expect(css).toMatch(/\.otr-auth-form\s+button\s*\{[^}]*var\(--accent\)/);
    });

    it("styles disabled button state", () => {
      expect(css).toMatch(/\.otr-auth-form\s+button:disabled\s*\{/);
    });
  });

  describe(".otr-auth-error — error message styling", () => {
    it("defines .otr-auth-error with danger color token", () => {
      expect(css).toMatch(/\.otr-auth-error\s*\{[^}]*var\(--danger\)/);
    });

    it("uses danger-soft background token", () => {
      expect(css).toMatch(/\.otr-auth-error\s*\{[^}]*var\(--danger-soft\)/);
    });
  });

  describe(".otr-auth-link — secondary navigation link", () => {
    it("defines .otr-auth-link with muted text token", () => {
      expect(css).toMatch(/\.otr-auth-link\s*\{[^}]*var\(--ink-soft\)/);
    });

    it("styles the anchor with accent color", () => {
      expect(css).toMatch(/\.otr-auth-link\s+a\s*\{[^}]*var\(--accent\)/);
    });
  });

  describe("mobile responsiveness", () => {
    it("includes auth styles inside the mobile media query", () => {
      const mobileBlock = css.match(/@media\s*\(max-width:\s*820px\)\s*\{([\s\S]*)\}/);
      expect(mobileBlock).not.toBeNull();
      expect(mobileBlock![1]).toMatch(/\.otr-auth/);
    });
  });
});

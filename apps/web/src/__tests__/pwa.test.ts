import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const publicDir = join(__dirname, "..", "..", "public");

describe("PWA manifest", () => {
  it("exists at public/manifest.json", () => {
    expect(existsSync(join(publicDir, "manifest.json"))).toBe(true);
  });

  it("has required fields for installability", () => {
    const manifest = JSON.parse(
      readFileSync(join(publicDir, "manifest.json"), "utf-8")
    );
    expect(manifest.name).toBe("Habit Tracker");
    expect(manifest.short_name).toBe("Habits");
    expect(manifest.start_url).toBe("/today");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#ffffff");
    expect(manifest.background_color).toBe("#f7f6f3");
  });

  it("includes 192px and 512px icons", () => {
    const manifest = JSON.parse(
      readFileSync(join(publicDir, "manifest.json"), "utf-8")
    );
    const sizes = manifest.icons.map(
      (i: { sizes: string }) => i.sizes
    );
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("includes a maskable icon", () => {
    const manifest = JSON.parse(
      readFileSync(join(publicDir, "manifest.json"), "utf-8")
    );
    const maskable = manifest.icons.find(
      (i: { purpose?: string }) => i.purpose === "maskable"
    );
    expect(maskable).toBeDefined();
  });
});

describe("PWA icons", () => {
  it.each(["icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png"])(
    "%s exists in public/icons/",
    (filename) => {
      expect(existsSync(join(publicDir, "icons", filename))).toBe(true);
    }
  );

  it.each(["icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png"])(
    "%s is a valid PNG (starts with PNG signature)",
    (filename) => {
      const buf = readFileSync(join(publicDir, "icons", filename));
      // PNG magic bytes: 137 80 78 71 13 10 26 10
      expect(buf[0]).toBe(137);
      expect(buf[1]).toBe(80);
      expect(buf[2]).toBe(78);
      expect(buf[3]).toBe(71);
    }
  );
});

describe("Service worker", () => {
  it("exists at public/sw.js", () => {
    expect(existsSync(join(publicDir, "sw.js"))).toBe(true);
  });

  it("handles install, activate, and fetch events", () => {
    const sw = readFileSync(join(publicDir, "sw.js"), "utf-8");
    expect(sw).toContain('addEventListener("install"');
    expect(sw).toContain('addEventListener("activate"');
    expect(sw).toContain('addEventListener("fetch"');
  });

  it("caches the offline fallback URL", () => {
    const sw = readFileSync(join(publicDir, "sw.js"), "utf-8");
    expect(sw).toContain("/offline");
  });

  it("cleans up old caches on activate", () => {
    const sw = readFileSync(join(publicDir, "sw.js"), "utf-8");
    expect(sw).toContain("caches.delete");
  });
});

describe("PWA metadata in layout", () => {
  const layoutPath = join(__dirname, "..", "app", "layout.tsx");

  it("layout file exists", () => {
    expect(existsSync(layoutPath)).toBe(true);
  });

  it("exports viewport with viewportFit cover", () => {
    const layout = readFileSync(layoutPath, "utf-8");
    expect(layout).toContain('viewportFit: "cover"');
  });

  it("references manifest.json", () => {
    const layout = readFileSync(layoutPath, "utf-8");
    expect(layout).toContain("/manifest.json");
  });

  it("configures apple web app meta", () => {
    const layout = readFileSync(layoutPath, "utf-8");
    expect(layout).toContain("appleWebApp");
    expect(layout).toContain("capable: true");
  });

  it("registers the service worker", () => {
    const layout = readFileSync(layoutPath, "utf-8");
    expect(layout).toContain("ServiceWorkerRegistration");
  });
});

describe("iOS safe area CSS", () => {
  const cssPath = join(__dirname, "..", "app", "pwa.css");

  it("pwa.css exists", () => {
    expect(existsSync(cssPath)).toBe(true);
  });

  it("uses env(safe-area-inset-*) values", () => {
    const css = readFileSync(cssPath, "utf-8");
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
  });
});

describe("Offline page", () => {
  const offlinePath = join(__dirname, "..", "app", "offline", "page.tsx");

  it("exists at app/offline/page.tsx", () => {
    expect(existsSync(offlinePath)).toBe(true);
  });

  it("shows an offline message", () => {
    const page = readFileSync(offlinePath, "utf-8");
    expect(page).toContain("offline");
  });
});

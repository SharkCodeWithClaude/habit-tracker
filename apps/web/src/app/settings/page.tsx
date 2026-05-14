"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "otter-ds/components/Sidebar";
import Icon from "otter-ds/components/Icon";
import { fetchAiConfigs, saveAiConfig, deleteAiConfig } from "@/lib/api";
import type { AiConfig } from "@/lib/api";

const NAV_LINKS = [
  { id: "today", label: "Today", icon: Icon.Today },
  { id: "calendar", label: "Calendar", icon: Icon.Review },
  { id: "review", label: "Review", icon: Icon.Review },
  { id: "settings", label: "Settings", icon: Icon.Goals },
];

const PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)", placeholder: "sk-ant-..." },
  { value: "openai", label: "OpenAI", placeholder: "sk-..." },
  { value: "gemini", label: "Gemini (Google)", placeholder: "AIza..." },
  { value: "groq", label: "Groq", placeholder: "gsk_..." },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = React.useState<AiConfig[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [provider, setProvider] = React.useState("claude");
  const [apiKey, setApiKey] = React.useState("");
  const [modelName, setModelName] = React.useState("");

  React.useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    const data = await fetchAiConfigs();
    setConfigs(data);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveAiConfig(
      provider,
      apiKey,
      modelName || undefined
    );

    if (result) {
      setSuccess(`${provider} provider configured and activated`);
      setApiKey("");
      setModelName("");
      await loadConfigs();
    } else {
      setError("Failed to save configuration");
    }
    setSaving(false);
  }

  async function handleDelete(providerName: string) {
    const ok = await deleteAiConfig(providerName);
    if (ok) {
      setSuccess(`${providerName} provider removed`);
      await loadConfigs();
    } else {
      setError("Failed to delete configuration");
    }
  }

  function handleNav(id: string) {
    if (id === "today") router.push("/today");
    else if (id === "calendar") router.push("/calendar");
    else if (id === "review") router.push("/review");
  }

  const selectedProvider = PROVIDERS.find((p) => p.value === provider);

  return (
    <div className="app-shell">
      <Sidebar
        active="settings"
        onChange={handleNav}
        links={NAV_LINKS}
        brandName="Otter"
        brandSub="your habits, gently"
        brandImgSrc="/otter.png"
      />
      <main className="main-content settings-page">
        <h1>AI Provider Settings</h1>
        <p className="settings-description">
          Configure your AI provider for intelligent habit tracking. Your API key
          is encrypted at rest and never exposed in responses.
        </p>

        <form className="settings-form" onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={selectedProvider?.placeholder}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="modelName">Model Override (optional)</label>
            <input
              id="modelName"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Leave empty for default"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save & Activate"}
          </button>
        </form>

        <section className="configs-section">
          <h2>Configured Providers</h2>
          {loading ? (
            <p>Loading...</p>
          ) : configs.length === 0 ? (
            <p className="empty-state">
              No providers configured. Add one above to enable AI-powered habit
              tracking.
            </p>
          ) : (
            <ul className="config-list">
              {configs.map((c) => (
                <li key={c.id} className="config-item">
                  <div className="config-info">
                    <span className="config-provider">{c.provider}</span>
                    {c.modelName && (
                      <span className="config-model">{c.modelName}</span>
                    )}
                    {c.isActive && <span className="badge-active">Active</span>}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(c.provider)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

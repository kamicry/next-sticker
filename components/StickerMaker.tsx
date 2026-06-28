"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { CharacterConfig, GameType, FontType } from "@/types";

// ── helpers ──────────────────────────────────────────────────────

function getCharacterImageUrl(type: GameType, img: string): string {
  const base = "https://raw.githubusercontent.com/kamicry/arcpjsk-hub/main";
  if (type === "pjsk") {
    const [dir, ...rest] = img.split("/");
    const capDir = dir.charAt(0).toUpperCase() + dir.slice(1);
    return `${base}/pjsk/${capDir}/${rest.join("/")}`;
  }
  return `${base}/arcaea/${img}`;
}

/** Query-string for our API endpoint (returns a PNG). */
function buildApiUrl(opts: {
  path: string;
  key: string;
  character: string;
  type: GameType;
  font: FontType;
  bg: string;
  bg2: string;
  absolute?: boolean;
}): string {
  const p = new URLSearchParams();
  p.set("path", opts.path);
  p.set("key", opts.key);
  p.set("character", opts.character);
  p.set("type", opts.type);
  p.set("font", opts.font);
  if (opts.bg) p.set("bg", opts.bg);
  if (opts.bg2) p.set("bg2", opts.bg2);
  const qs = p.toString();
  return opts.absolute
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/overlay-text?${qs}`
    : `/api/overlay-text?${qs}`;
}

// ── props ────────────────────────────────────────────────────────

interface Props {
  pjskCharacters: CharacterConfig[];
  arcaeaCharacters: CharacterConfig[];
}

// ── color swatch map (character → hex, for accent dots) ──────────

function buildColorMap(list: CharacterConfig[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of list) {
    if (!m[c.character]) m[c.character] = c.color;
  }
  return m;
}

// ── ColorPickerBtn sub-component ────────────────────────────────

function ColorPickerBtn({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const displayColor = value && value !== "t" ? value : "#ffffff";

  const handleHexBlur = () => {
    setEditing(false);
    const raw = editText.trim();
    if (!raw) return;
    // support w, b, t shortcuts
    if (raw === "w" || raw === "b" || raw === "t") {
      onChange(raw);
      return;
    }
    let hex = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-f]{3,8}$/i.test(hex)) {
      onChange(hex);
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleHexBlur();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
        title="Pick a color"
      >
        <span
          className="inline-block h-4 w-4 rounded border border-border"
          style={{ backgroundColor: displayColor }}
        />
      </button>
      <input
        ref={inputRef}
        type="color"
        value={displayColor}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      {editing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleHexBlur}
          onKeyDown={handleHexKeyDown}
          autoFocus
          className="w-20 rounded-lg border border-accent bg-surface-alt px-1.5 py-1 font-mono text-[11px] text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setEditText(value || "");
              setEditing(true);
            }
          }}
          disabled={disabled}
          className="font-mono text-[11px] text-muted underline underline-offset-2 decoration-dotted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {value && value !== "t" ? value : "hex"}
        </button>
      )}
    </div>
  );
}

// ── component ────────────────────────────────────────────────────

export default function StickerMaker({ pjskCharacters, arcaeaCharacters }: Props) {
  const [gameType, setGameType] = useState<GameType>("pjsk");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontType>("YurukaStd");
  const [bg, setBg] = useState("");
  const [bg2, setBg2] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);

  const pool = gameType === "pjsk" ? pjskCharacters : arcaeaCharacters;
  const colorMap = useMemo(() => buildColorMap(pool), [pool]);

  // group characters by their `character` field
  const groups = useMemo(() => {
    const g: Record<string, CharacterConfig[]> = {};
    for (const c of pool) {
      if (!g[c.character]) g[c.character] = [];
      g[c.character].push(c);
    }
    return g;
  }, [pool]);

  // all groups sorted
  const groupEntries = useMemo(
    () =>
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
    [groups]
  );

  const selected = useMemo(
    () => pool.find((c) => c.id === selectedId) ?? null,
    [pool, selectedId]
  );

  // When selection or game type changes, reset text to default
  useEffect(() => {
    if (selected) {
      setText(
        selected.defaultText.text === "something"
          ? ""
          : selected.defaultText.text
      );
    }
  }, [selected]);

  // Reset selection when game type changes
  useEffect(() => {
    setSelectedId(null);
    setPreviewError(false);
  }, [gameType]);

  const imageUrl = selected
    ? getCharacterImageUrl(gameType, selected.img)
    : "";

  const apiUrl =
    selected && text.trim()
      ? buildApiUrl({
          path: imageUrl,
          key: text,
          character: selected.id,
          type: gameType,
          font,
          bg,
          bg2,
        })
      : null;

  const copyUrl =
    selected && text.trim()
      ? buildApiUrl({
          path: imageUrl,
          key: text,
          character: selected.id,
          type: gameType,
          font,
          bg,
          bg2,
          absolute: true,
        })
      : null;

  const handleDownload = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) throw new Error("API error");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sticker-${selected?.character ?? "custom"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setPreviewError(true);
    }
  }, [apiUrl, selected]);

  const handleCopyImage = useCallback(async () => {
    if (!copyUrl) return;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text method
      try {
        const ta = document.createElement("textarea");
        ta.value = copyUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [copyUrl]);

  // ── render ──────────────────────────────────────────────────

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* ─── header ─── */}
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Sticker Maker
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pick a character, type your text, and generate a custom sticker
          </p>
        </div>

        {/* game tabs */}
        <div className="mt-3 flex gap-1 rounded-xl bg-surface p-1 sm:mt-0">
          {(["pjsk", "arcaea"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setGameType(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                gameType === t
                  ? "bg-accent text-white shadow-lg shadow-purple-500/20"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "pjsk" ? "Project Sekai" : "Arcaea"}
            </button>
          ))}
        </div>
      </header>

      {/* ─── main layout ─── */}
      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        {/* ─── left: character picker ─── */}
        <div className="lg:w-1/2 xl:w-3/5">
          <div className="h-full rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Choose Character
            </h2>

            {/* character grid */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
              {groupEntries.map(([charName, variants]) => {
                const first = variants[0];
                const thumbUrl = getCharacterImageUrl(
                  gameType,
                  first.img
                );
                const accent = colorMap[charName] ?? "#7c3aed";
                const isActive =
                  selected?.character === charName;

                return (
                  <button
                    key={charName}
                    onClick={() => {
                      // If already selected for this char and we have variants > 1, open variants
                      // Otherwise pick the first variant
                      if (selected?.character === charName && variants.length > 1) {
                        // toggle off
                        setSelectedId(null);
                      } else {
                        setSelectedId(first.id);
                      }
                    }}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-alt/50 hover:border-accent/50 hover:bg-surface-alt"
                    }`}
                    title={`${first.name}${variants.length > 1 ? ` +${variants.length - 1}` : ""}`}
                  >
                    <div
                      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
                    >
                      <img
                        src={thumbUrl}
                        alt={charName}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="max-w-full truncate text-xs font-medium text-muted">
                      {charName}
                    </span>
                    {variants.length > 1 && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                        {variants.length}
                      </span>
                    )}
                    {/* accent dot */}
                    <span
                      className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-1 ring-black/20"
                      style={{ backgroundColor: accent }}
                    />
                  </button>
                );
              })}
            </div>

            {/* ─── variant selector ─── */}
            {selected && groups[selected.character]?.length > 1 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Variants — {selected.character}
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {groups[selected.character].map((v) => {
                    const vUrl = getCharacterImageUrl(gameType, v.img);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedId(v.id)}
                        className={`flex-shrink-0 rounded-xl border-2 p-1 transition ${
                          v.id === selectedId
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                        title={v.name}
                      >
                        <img
                          src={vUrl}
                          alt={v.name}
                          className="h-16 w-16 rounded-lg object-contain sm:h-20 sm:w-20"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── right: preview & controls ─── */}
        <div className="lg:w-1/2 xl:w-2/5">
          <div className="flex flex-col gap-4">
            {/* preview */}
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Preview
              </h2>

              {selected ? (
                <a
                  href={apiUrl ?? "#"}
                  download
                  className="relative mx-auto block max-w-xs"
                >
                  {apiUrl ? (
                    <img
                      ref={previewRef}
                      src={apiUrl}
                      alt="Sticker preview"
                      className="w-full rounded-xl border border-border shadow-2xl shadow-purple-500/10"
                      onError={() => setPreviewError(true)}
                      onLoad={() => setPreviewError(false)}
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Character"
                      className="w-full rounded-xl border border-border opacity-50"
                    />
                  )}

                  {previewError && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                      <p className="px-4 text-center text-sm text-muted">
                        Preview unavailable. Try different text or check the
                        server.
                      </p>
                    </div>
                  )}
                </a>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-surface-alt/50">
                  <p className="px-4 text-center text-sm text-muted">
                    Select a character to see the preview
                  </p>
                </div>
              )}
            </div>

            {/* controls */}
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Controls
              </h2>

              {/* text input */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    selected
                      ? `Default: ${selected.defaultText.text}`
                      : "Select a character first…"
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  disabled={!selected}
                />
                <p className="mt-1 text-xs text-muted">
                  Use <code className="rounded bg-surface-alt px-1 py-0.5 text-[11px]">/+/</code> or{" "}
                  <code className="rounded bg-surface-alt px-1 py-0.5 text-[11px]">\n</code> for line breaks
                </p>
              </div>

              {/* font + bg */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Font
                  </label>
                  <select
                    value={font}
                    onChange={(e) => setFont(e.target.value as FontType)}
                    className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="YurukaStd">Yuruka Std</option>
                    <option value="SSFangTangTi">ShangShou FangTangTi</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Background
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted">Color 1</span>
                      <ColorPickerBtn
                        value={bg}
                        onChange={setBg}
                        disabled={!selected}
                      />
                      {bg && (
                        <button
                          onClick={() => setBg("")}
                          className="rounded border border-border px-1 py-0.5 text-[10px] text-muted transition hover:border-red-400 hover:text-red-400"
                          title="Clear color 1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {bg && bg !== "t" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted">→ Color 2</span>
                        <ColorPickerBtn
                          value={bg2}
                          onChange={setBg2}
                          disabled={!selected}
                        />
                        {bg2 && (
                          <button
                            onClick={() => setBg2("")}
                            className="rounded border border-border px-1 py-0.5 text-[10px] text-muted transition hover:border-red-400 hover:text-red-400"
                            title="Clear color 2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    {bg && bg === "t" && (
                      <button
                        onClick={() => setBg("")}
                        className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted hover:text-foreground"
                      >
                        none
                      </button>
                    )}
                    {!bg && (
                      <span className="text-[11px] text-muted">no bg</span>
                    )}
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!apiUrl}
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download
                </button>
                <button
                  onClick={handleCopyImage}
                  disabled={!apiUrl}
                  className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? (
                    <>
                      <svg
                        className="h-4 w-4 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy URL
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setText(
                      selected?.defaultText.text === "something"
                        ? ""
                        : selected?.defaultText.text ?? ""
                    );
                    setBg("");
                    setBg2("");
                    setFont("YurukaStd");
                  }}
                  disabled={!selected}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── footer ─── */}
      <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted">
        Powered by{" "}
        <a
          href="https://github.com/kamicry/arcpjsk-hub"
          className="underline underline-offset-2 hover:text-foreground"
        >
          arcpjsk-hub
        </a>
      </footer>
    </div>
  );
}

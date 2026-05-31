/**
 * DesignPanel — Högerkolumnens designpanel med alla sidoinställningar.
 * Extraherad från EditorPage.tsx för att hålla nere filstorleken.
 *
 * Exporterar: LayoutPanel, SektionerPanel, DocPanel, VersionsPanel
 */

import React, { useState, useMemo, useRef } from "react";
import { X, ImagePlus, Plus } from "lucide-react";
import {
  isQuestionRef,
  isContentBlockRef,
  type DesignSettings,
  type Question,
  type QuestionOrderItem,
  type TestQuestionRef,
} from "@/lib/test-types";
import { documents } from "@/lib/local-db";
import { getLgr22Label } from "@/lib/lgr22-so";
import type { CoverDoc } from "@/components/editor/CoverTemplates";

/* ── Design presets ──────────────────────────────────────────────────────────
 *  v4: En preset = en kombo av cover-mall + matchande sektionsstil + accentfärg.
 * ───────────────────────────────────────────────────────────────────────── */
const DESIGN_PRESETS: Array<{ id: string; name: string; desc: string; accent: string; design: Partial<DesignSettings> }> = [
  {
    id: "skolverket", name: "Skolverket", desc: "Officiell · klassisk",
    accent: "#1E3A5F",
    design: { coverTemplate: "official", layout: "classic", headingFont: "newsreader", bodyFont: "newsreader", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "ink", lineStyle: "solid", lineHeight: 24, mcMarker: "square", pointsStyle: "italic", margin: 22, bodySize: 11.5, dropCap: "off", watermark: "", density: "comfortable", sectionDivider: "rule", showMeta: false, headerOrnament: "none", footerStyle: "info", titleWeight: 700, titleTransform: "uppercase", titleItalic: false, titleTracking: 0, titleColor: "ink", sectionItalic: false },
  },
  {
    id: "editorial-index", name: "Editorial", desc: "Italic · magasin",
    accent: "#1E5F5C",
    design: { coverTemplate: "editorial-index", layout: "editorial", headingFont: "newsreader", bodyFont: "newsreader", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "accent", lineStyle: "solid", lineHeight: 22, mcMarker: "circle", pointsStyle: "italic", margin: 24, bodySize: 11.5, dropCap: "off", watermark: "", density: "spacious", sectionDivider: "editorial-rule", showMeta: false, headerOrnament: "none", footerStyle: "minimal", titleWeight: 400, titleTransform: "none", titleItalic: false, titleTracking: 0, titleColor: "ink", sectionItalic: true },
  },
  {
    id: "color-block", name: "Färgblock", desc: "Mättat block · vinrött",
    accent: "#7A1F2B",
    design: { coverTemplate: "color-block", layout: "classic", headingFont: "newsreader", bodyFont: "newsreader", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "accent", lineStyle: "solid", lineHeight: 22, mcMarker: "circle", pointsStyle: "italic", margin: 22, bodySize: 11.5, dropCap: "off", watermark: "", density: "comfortable", sectionDivider: "rule", showMeta: false, headerOrnament: "none", footerStyle: "info", titleWeight: 700, titleTransform: "uppercase", titleItalic: false, titleTracking: 0, titleColor: "ink", sectionItalic: false },
  },
  {
    id: "swiss-grid", name: "Swiss", desc: "Arkitektoniskt rutnät",
    accent: "#1E3A5F",
    design: { coverTemplate: "swiss-grid", layout: "minimal", headingFont: "geist", bodyFont: "geist", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "ink", lineStyle: "solid", lineHeight: 22, mcMarker: "square", pointsStyle: "pill", margin: 22, bodySize: 11.5, dropCap: "off", watermark: "", density: "comfortable", sectionDivider: "hairline", showMeta: false, headerOrnament: "none", footerStyle: "minimal", titleWeight: 500, titleTransform: "none", titleItalic: false, titleTracking: 0, titleColor: "ink", sectionItalic: false },
  },
  {
    id: "brief", name: "Brief", desc: "Mycket luft · italic",
    accent: "#A87F1A",
    design: { coverTemplate: "brief", layout: "minimal", headingFont: "newsreader", bodyFont: "newsreader", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "accent", lineStyle: "solid", lineHeight: 24, mcMarker: "circle", pointsStyle: "italic", margin: 26, bodySize: 11.5, dropCap: "off", watermark: "", density: "spacious", sectionDivider: "editorial-rule", showMeta: false, headerOrnament: "none", footerStyle: "minimal", titleWeight: 400, titleTransform: "none", titleItalic: true, titleTracking: 0, titleColor: "ink", sectionItalic: true },
  },
  {
    id: "imagery", name: "Bildmotiv", desc: "Bild med fade · bold",
    accent: "#1E3A5F",
    design: { coverTemplate: "imagery", layout: "exam", headingFont: "geist", bodyFont: "newsreader", paperStyle: "white", cardStyle: "flat", pageFrame: "none", numbering: "number", numStyle: "plain", numColor: "accent", lineStyle: "solid", lineHeight: 22, mcMarker: "square", pointsStyle: "italic", margin: 22, bodySize: 11.5, dropCap: "off", watermark: "", density: "comfortable", sectionDivider: "rule", showMeta: false, headerOrnament: "none", footerStyle: "info", titleWeight: 800, titleTransform: "uppercase", titleItalic: false, titleTracking: 0, titleColor: "ink", sectionItalic: false },
  },
];

/* ── Font options ────────────────────────────────────────────────────────── */
const FONT_OPTIONS = [
  { id: "newsreader",   name: "Newsreader",      category: "Serif · varm" },
  { id: "instrument",  name: "Instrument Serif", category: "Serif · display" },
  { id: "fraunces",    name: "Fraunces",         category: "Serif · uttrycksfull" },
  { id: "eb-garamond", name: "EB Garamond",      category: "Serif · klassisk" },
  { id: "lora",        name: "Lora",             category: "Serif · läsbar" },
  { id: "crimson",     name: "Crimson Pro",      category: "Serif · akademisk" },
  { id: "source-serif",name: "Source Serif",     category: "Serif · neutral" },
  { id: "plex-serif",  name: "IBM Plex Serif",   category: "Serif · teknisk" },
  { id: "cormorant",   name: "Cormorant",        category: "Serif · elegant" },
  { id: "geist",       name: "Geist",            category: "Sans · geometrisk" },
  { id: "dm-sans",     name: "DM Sans",          category: "Sans · humanist" },
  { id: "plex-sans",   name: "IBM Plex Sans",    category: "Sans · teknisk" },
  { id: "system",      name: "System",           category: "Sans · system" },
];

/* ── Extended accent palette ─────────────────────────────────────────────── */
const ACCENT_PALETTE_FULL = [
  { name: "Skog",       color: "#1E5F5C" },
  { name: "Mossa",      color: "#3D6B3D" },
  { name: "Bordeaux",   color: "#7A1F2B" },
  { name: "Tegel",      color: "#B2402A" },
  { name: "Marin",      color: "#1E3A5F" },
  { name: "Stålblå",    color: "#2B5BA8" },
  { name: "Senap",      color: "#A87F1A" },
  { name: "Bärnsten",   color: "#C8961A" },
  { name: "Plommon",    color: "#5C2A5C" },
  { name: "Aubergine",  color: "#3D2A4E" },
  { name: "Grafit",     color: "#2C2C2C" },
  { name: "Koppar",     color: "#9E5A3A" },
];

/* ── Highlight palette ───────────────────────────────────────────────────── */
const HIGHLIGHT_PALETTE = [
  { name: "Inget",   color: "none" },
  { name: "Gul",     color: "#FFF3B0" },
  { name: "Grön",    color: "#D1FAE5" },
  { name: "Blå",     color: "#DBEAFE" },
  { name: "Rosa",    color: "#FCE7F3" },
  { name: "Orange",  color: "#FEE2D5" },
  { name: "Lila",    color: "#EDE9FE" },
];
// Suppress unused-variable warning — palette available for future use
void HIGHLIGHT_PALETTE;

/* ── Paper styles ────────────────────────────────────────────────────────── */
const PAPER_STYLE_NAMES: Record<string, string> = {
  white: "Vit",
  cream: "Gräddvit",
  warm:  "Varm",
};

/* ── Card style names ────────────────────────────────────────────────────── */
const CARD_STYLE_NAMES: Record<string, string> = {
  flat:      "Platt",
  framed:    "Ram",
  banded:    "Band",
  gutter:    "Linje",
  indented:  "Indrag",
  stamped:   "Stämpel",
};

/* ── Page frame names ────────────────────────────────────────────────────── */
const PAGE_FRAME_NAMES: Record<string, string> = {
  none:         "Ingen",
  thin:         "Tunn",
  double:       "Dubbel",
  "thick-accent": "Accent",
  corners:      "Hörn",
};

/* ── Cover illustration kinds ────────────────────────────────────────────── */
const COVER_KINDS: Array<{ id: string; name: string }> = [
  { id: "painting",    name: "Målning" },
  { id: "landscape",   name: "Landskap" },
  { id: "city",        name: "Stad" },
  { id: "industrial",  name: "Industriell" },
  { id: "manuscript",  name: "Manuskript" },
  { id: "abstract",    name: "Abstrakt" },
];
// Suppress unused-variable warning — available for future illustration pickers
void COVER_KINDS;

/* ── Version colors ──────────────────────────────────────────────────────── */
const VERSION_COLORS = ["#1E5F5C", "#1E3A5F", "#7A1F2B", "#A87F1A", "#5C2A5C", "#2D5A3D", "#6B6459"];

/* ─── Design controls ────────────────────────────────────────────────────── */

function DocField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="ps-input" style={{ fontSize: 13 }} />
    </label>
  );
}

function PsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          height: 27, borderRadius: 6, border: "none", cursor: "pointer",
          background: value === o.v ? "var(--ps-paper)" : "transparent",
          color: value === o.v ? "var(--ps-ink)" : "var(--ps-ink-3)",
          fontFamily: "var(--ps-ui)", fontSize: 11.5, fontWeight: value === o.v ? 500 : 400,
          boxShadow: value === o.v ? "0 1px 2px rgba(20,17,13,0.06)" : "none",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function PsSlider({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ps-ink-3)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: "var(--ps-ink)", fontFeatureSettings: '"tnum"' }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--ps-accent)" }}
      />
    </div>
  );
}

function PsToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
      <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>{label}</span>
      <div style={{ width: 30, height: 17, borderRadius: 99, background: on ? "var(--ps-accent)" : "var(--ps-rule-2)", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 2, left: on ? 15 : 2, width: 13, height: 13, borderRadius: 99, background: "white", transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
      </div>
    </div>
  );
}

function LayoutThumb({ variant, accent }: { variant: string; accent: string }) {
  const thumbnails: Record<string, React.ReactNode> = {
    classic: (
      <div style={{ width: "100%", aspectRatio: "0.75", background: "white", border: "1px solid var(--ps-rule-2)", borderRadius: 3, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ height: 6, width: "70%", background: "#222", borderRadius: 1 }} />
        <div style={{ height: 1, width: "100%", background: accent }} />
        <div style={{ height: 7, background: accent, margin: "2px -6px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          <div style={{ height: 1.5, background: "#444", width: "80%" }} />
          <div style={{ height: 1, background: "#ccc" }} />
          <div style={{ height: 1, background: "#ccc" }} />
        </div>
      </div>
    ),
    editorial: (
      <div style={{ width: "100%", aspectRatio: "0.75", background: "white", border: "1px solid var(--ps-rule-2)", borderRadius: 3, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ height: 1.5, width: "30%", background: accent }} />
        <div style={{ height: 5, width: "85%", background: "#222", borderRadius: 1 }} />
        <div style={{ height: 1, width: "100%", background: accent, marginTop: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
          <div style={{ width: 5, height: 8, background: accent }} />
          <div style={{ flex: 1, height: 1, background: "#222" }} />
        </div>
        <div style={{ height: 1, background: "#ddd" }} />
        <div style={{ height: 1, background: "#ddd", width: "70%" }} />
      </div>
    ),
    minimal: (
      <div style={{ width: "100%", aspectRatio: "0.75", background: "white", border: "1px solid var(--ps-rule-2)", borderRadius: 3, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{ flex: 1, height: 1, background: "#aaa" }} />
          <div style={{ width: 8, height: 1.5, background: "#aaa" }} />
          <div style={{ flex: 1, height: 1, background: "#aaa" }} />
        </div>
        <div style={{ height: 4, width: "60%", background: "#222", margin: "0 auto", borderRadius: 1 }} />
        <div style={{ height: 1, background: "#888", marginBottom: 1, marginTop: 3 }} />
        <div style={{ height: 3, width: "50%", background: "#222", borderRadius: 1 }} />
        <div style={{ height: 1, background: "#ddd" }} />
        <div style={{ height: 1, background: "#ddd", width: "70%" }} />
      </div>
    ),
    exam: (
      <div style={{ width: "100%", aspectRatio: "0.75", background: "white", border: "1px solid var(--ps-rule-2)", borderRadius: 3, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 12, height: 12, border: `1px solid ${accent}`, borderRadius: 2 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
            <div style={{ height: 1.5, width: "40%", background: "#888" }} />
            <div style={{ height: 4, width: "85%", background: "#222", borderRadius: 1 }} />
          </div>
        </div>
        <div style={{ marginTop: 3, height: 9, border: `1px solid ${accent}`, borderRadius: 1, display: "flex", alignItems: "center", padding: "0 2px", gap: 2 }}>
          <div style={{ width: 4, height: 4, borderRadius: 99, background: accent }} />
          <div style={{ flex: 1, height: 1.5, background: "#222" }} />
        </div>
        <div style={{ height: 1, background: "#ddd" }} />
        <div style={{ height: 1, background: "#ddd", width: "70%" }} />
      </div>
    ),
  };
  return <>{thumbnails[variant] ?? null}</>;
}

/* ─── CoverImagePanel ────────────────────────────────────────────────────── */

function CoverImagePanel({ design, setD }: { design: DesignSettings; setD: (p: Partial<DesignSettings>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const ci = design.coverImage ?? { enabled: false, kind: "painting", height: 130, fadeY: 22, fadeX: 12, opacity: 0.95, src: null };
  const enabled = ci.enabled;

  function setCi(patch: Partial<typeof ci>) {
    setD({ coverImage: { ...ci, ...patch } });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCi({ src: reader.result as string, enabled: true });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearImage() {
    setCi({ src: null });
    if (!ci.kind) setCi({ src: null, enabled: false });
  }

  return (
    <PsGroup title="Försättsbild">
      <PsToggle label="Visa bild på framsidan" on={enabled} onChange={v => setCi({ enabled: v })} />
      {enabled && (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          {ci.src ? (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--ps-rule-2)" }}>
              <img src={ci.src} alt="Försättsbild" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
              <button onClick={clearImage} title="Ta bort bild" style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 99, background: "rgba(0,0,0,0.55)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={12} />
              </button>
              <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 5, right: 5, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.55)", border: "none", color: "white", cursor: "pointer", fontSize: 10.5, fontFamily: "var(--ps-ui)" }}>
                Byt bild
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "18px 12px", borderRadius: 8, border: "1.5px dashed var(--ps-rule-2)", background: "var(--ps-bg-soft)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
              <ImagePlus size={20} />
              <span style={{ fontSize: 12 }}>Välj bild från datorn</span>
              <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)" }}>JPG, PNG, WebP</span>
            </button>
          )}
          <PsSlider label="Höjd" value={ci.height} min={60} max={220} step={5} suffix=" mm" onChange={v => setCi({ height: v })} />
          <PsSlider label="Toningszon (uppåt)" value={ci.fadeY} min={0} max={80} step={2} suffix=" %" onChange={v => setCi({ fadeY: v })} />
          <PsSlider label="Sidtoning" value={ci.fadeX} min={0} max={40} step={2} suffix=" %" onChange={v => setCi({ fadeX: v })} />
          <PsSlider label="Opacitet" value={Math.round(ci.opacity * 100)} min={20} max={100} step={5} suffix=" %" onChange={v => setCi({ opacity: v / 100 })} />
        </>
      )}
    </PsGroup>
  );
}

/* Build a CoverDoc from design + title for the picker preview & live render */
export function buildCoverDoc(design: DesignSettings, title: string): CoverDoc {
  return {
    title:         title || "Namnlös titel",
    subtitle:      design.subtitle ?? "",
    course:        design.course ?? "",
    school:        design.school ?? "",
    teacher:       "",
    date:          new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }),
    grade:         "",
    duration:      design.duration ?? "",
    points:        0,
    questionCount: 0,
    examNumber:    design.chapter ?? "",
    termLabel:     design.termLabel ?? "",
    examMeta:      design.examMeta ?? "",
    instructions:  design.coverInstructions ?? "",
    coverImageUrl: design.coverImage?.src ?? design.coverImageUrl ?? "",
  };
}

/* ─── DocPanel ───────────────────────────────────────────────────────────── */

export function DocPanel({
  design, setD, title, setTitle, bank, questionOrder,
}: {
  design: DesignSettings;
  setD: (p: Partial<DesignSettings>) => void;
  title: string;
  setTitle: (v: string) => void;
  bank: Question[];
  questionOrder: QuestionOrderItem[];
}) {
  const coveredCodes = useMemo(() => {
    const codes = new Set<string>();
    questionOrder.forEach(ref => {
      if (!isContentBlockRef(ref)) {
        const q = bank.find(b => b.id === (ref as { question_id: string }).question_id);
        q?.lgr22?.forEach(c => codes.add(c));
      }
    });
    return codes;
  }, [questionOrder, bank]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <DocField label="Titel" value={title} onChange={setTitle} />
      <DocField label="Underrubrik" value={design.subtitle ?? ""} onChange={v => setD({ subtitle: v })} />
      <DocField label="Kurs" value={design.course ?? ""} onChange={v => setD({ course: v })} placeholder="t.ex. Historia 1b" />
      <DocField label="Skola" value={design.school ?? ""} onChange={v => setD({ school: v })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DocField label="Tid" value={design.duration ?? ""} onChange={v => setD({ duration: v })} placeholder="t.ex. 60 min" />
        <DocField label="Hjälpmedel" value={design.aids ?? ""} onChange={v => setD({ aids: v })} placeholder="t.ex. Inga" />
      </div>
      <DocField label="Sidfot" value={design.footerText ?? ""} onChange={v => setD({ footerText: v })} />

      {coveredCodes.size > 0 && (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ps-ink-3)", marginBottom: 6 }}>
            Lgr22-täckning ({coveredCodes.size})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[...coveredCodes].map(code => (
              <div key={code} style={{ fontSize: 11, color: "var(--ps-ink-2)", background: "var(--ps-bg-soft)", borderRadius: 4, padding: "2px 6px", display: "flex", gap: 5, alignItems: "flex-start" }}>
                <span style={{ color: "var(--ps-accent)", fontWeight: 600, flexShrink: 0 }}>{code}</span>
                <span>{getLgr22Label(code)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── VersionsPanel ──────────────────────────────────────────────────────── */

export function VersionsPanel({ documentId }: { documentId: string }) {
  const doc = documents.get(documentId);
  const [versions, setVersions] = useState<import("@/lib/test-types").DocumentVersion[]>(doc?.versions ?? []);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(VERSION_COLORS[0]);

  function saveVersions(next: import("@/lib/test-types").DocumentVersion[]) {
    setVersions(next);
    documents.update(documentId, { versions: next } as never);
  }

  function addVersion() {
    const name = newName.trim();
    if (!name) return;
    const v: import("@/lib/test-types").DocumentVersion = {
      id: crypto.randomUUID(),
      document_id: documentId,
      name,
      color: newColor,
      is_default: versions.length === 0,
      rules: [],
      changes: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveVersions([...versions, v]);
    setNewName("");
  }

  function removeVersion(id: string) {
    saveVersions(versions.filter(v => v.id !== id));
  }

  function setDefault(id: string) {
    saveVersions(versions.map(v => ({ ...v, is_default: v.id === id })));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--ps-ink-3)", lineHeight: 1.55, marginBottom: 10 }}>
          Versioner låter dig skapa anpassade varianter av provet för elever med olika behov (t.ex. extra stöd, förenklat språk eller fördjupning).
        </div>
        {versions.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ps-ink-4)", textAlign: "center", padding: "16px 0" }}>
            Inga versioner än. Lägg till nedan.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {versions.map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--ps-rule)", background: v.is_default ? v.color + "0a" : "var(--ps-paper)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: v.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: v.is_default ? 600 : 400 }}>{v.name}</span>
                {v.is_default && <span style={{ fontSize: 9.5, color: v.color, fontWeight: 600, letterSpacing: "0.06em" }}>Standard</span>}
                {!v.is_default && (
                  <button title="Gör till standard" onClick={() => setDefault(v.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--ps-ink-3)", padding: "2px 5px", borderRadius: 4 }}>
                    Standard
                  </button>
                )}
                <button onClick={() => removeVersion(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 2 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--ps-rule)", paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginBottom: 8 }}>Ny version</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addVersion(); }} placeholder="t.ex. Stödversion" className="ps-input" style={{ flex: 1, fontSize: 12.5 }} />
          <select value={newColor} onChange={e => setNewColor(e.target.value)} style={{ height: 34, border: "1px solid var(--ps-rule-2)", borderRadius: 6, padding: "0 4px", background: "var(--ps-paper)", cursor: "pointer" }}>
            {VERSION_COLORS.map(c => (
              <option key={c} value={c} style={{ background: c, color: "#fff" }}>{c}</option>
            ))}
          </select>
        </div>
        <button onClick={addVersion} disabled={!newName.trim()} className="ps-btn ps-btn-accent" style={{ width: "100%", marginTop: 8, justifyContent: "center" }}>
          <Plus size={13} /> Lägg till version
        </button>
      </div>
    </div>
  );
}

/* ─── SektionerPanel ─────────────────────────────────────────────────────── */

export function SektionerPanel({ sections, order, bankMap, onChange, onOrderChange, onBankPick }: {
  sections: Array<{ id: string; name: string; color: string }>;
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  onChange: (sections: Array<{ id: string; name: string; color: string }>) => void;
  onOrderChange: (order: QuestionOrderItem[]) => void;
  onBankPick: () => void;
}) {
  const SECTION_ACCENT_PALETTE = [
    "#FFFFFF", "#1E5F5C", "#7A1F2B", "#1E3A5F", "#A87F1A", "#5C2A5C", "#2C2C2C",
  ];

  const sectionStats = sections.map(sec => {
    const qs = order
      .filter(isQuestionRef)
      .filter(r => r.sectionId === sec.id)
      .map(r => bankMap.get(r.question_id))
      .filter(Boolean) as Question[];
    const pts = qs.reduce((s, q) => s + (parseFloat(q.points ?? "0") || 0), 0);
    return { count: qs.length, pts };
  });

  const unassigned = order.filter(isQuestionRef).filter(r => !r.sectionId && r.question_id !== "__section__");

  const addSection = () => {
    onChange([...sections, { id: crypto.randomUUID(), name: "Ny sektion", color: "#1E3A5F" }]);
  };

  const updateSection = (id: string, patch: Partial<{ name: string; color: string }>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const deleteSection = (id: string) => {
    onOrderChange(order.map(item => {
      if (isQuestionRef(item) && item.sectionId === id) {
        const { sectionId: _sid, ...rest } = item;
        return rest as TestQuestionRef;
      }
      return item;
    }));
    onChange(sections.filter(s => s.id !== id));
  };

  const assignQuestion = (questionId: string, sectionId: string | undefined) => {
    onOrderChange(order.map(item => {
      if (isQuestionRef(item) && item.question_id === questionId) {
        if (sectionId) return { ...item, sectionId };
        const { sectionId: _sid, ...rest } = item;
        return rest as TestQuestionRef;
      }
      return item;
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, color: "var(--ps-ink-3)", margin: "0 0 4px", lineHeight: 1.5 }}>
        Egen accentfärg per sektion ger visuell variation
      </p>

      {sections.map((sec, idx) => {
        const stats = sectionStats[idx];
        return (
          <div key={sec.id} style={{ border: "1px solid var(--ps-rule-2)", borderRadius: 10, padding: "12px 12px", background: "var(--ps-paper)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-ink-3)", minWidth: 22 }}>
                {String(idx + 1).padStart(2, "0")}
              </span>
              <input value={sec.name} onChange={e => updateSection(sec.id, { name: e.target.value })} className="ps-input" style={{ flex: 1, fontSize: 13, fontWeight: 500 }} />
              <button onClick={() => deleteSection(sec.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4, display: "flex" }} title="Ta bort sektion">
                <X size={12} />
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ps-ink-3)", marginBottom: 5 }}>Accentfärg</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {SECTION_ACCENT_PALETTE.map(c => (
                <button key={c} onClick={() => updateSection(sec.id, { color: c })} style={{ width: 20, height: 20, borderRadius: 4, cursor: "pointer", background: c === "#FFFFFF" ? "var(--ps-bg-soft)" : c, border: sec.color === c ? "2px solid var(--ps-ink)" : "1px solid var(--ps-rule-2)", outline: sec.color === c ? "2px solid var(--ps-paper)" : "none", outlineOffset: -3, fontSize: 8, color: c === "#FFFFFF" ? "var(--ps-ink-3)" : "white" }}>
                  {sec.color === c ? "✓" : ""}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--ps-ink-3)", display: "flex", justifyContent: "space-between" }}>
              <span>{stats.count} frågor</span>
              <span>{stats.pts} p</span>
            </div>
          </div>
        );
      })}

      {sections.length > 0 && unassigned.length > 0 && (
        <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px dashed var(--ps-rule-2)", background: "transparent" }}>
          <div style={{ fontSize: 10.5, color: "var(--ps-ink-3)", marginBottom: 6 }}>
            {unassigned.length} ej tilldelade frågor
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(unassigned as TestQuestionRef[]).slice(0, 5).map(ref => {
              const q = bankMap.get(ref.question_id);
              const text = ((q?.content as { text?: string })?.text ?? "").replace(/<[^>]+>/g, "").slice(0, 40);
              return (
                <div key={ref.question_id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, flex: 1, color: "var(--ps-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text || "(Tom)"}</span>
                  <select value="" onChange={e => { if (e.target.value) assignQuestion(ref.question_id, e.target.value); }} style={{ fontSize: 10, border: "1px solid var(--ps-rule-2)", borderRadius: 4, padding: "2px 4px", background: "var(--ps-bg-soft)", color: "var(--ps-ink-2)", cursor: "pointer" }}>
                    <option value="">Tilldela…</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={addSection} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 36, borderRadius: 8, border: "1px dashed var(--ps-rule-2)", background: "transparent", cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12.5, color: "var(--ps-ink-3)", marginTop: 4 }}>
        + Ny sektion
      </button>
      <button onClick={onBankPick} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", height: 34, borderRadius: 8, border: "1px dashed var(--ps-rule-2)", background: "transparent", cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12.5, color: "var(--ps-ink-3)" }}>
        + Hämta från banken
      </button>
    </div>
  );
}

/* ─── LayoutPanel ────────────────────────────────────────────────────────── */

export function LayoutPanel({ design, setD, title }: { design: DesignSettings; setD: (p: Partial<DesignSettings>) => void; title: string }) {
  // title is available for future use (e.g. saving tones with document name)
  void title;
  const accent = design.primaryColor ?? "#1E5F5C";

  const [tones, setTones] = React.useState<Array<{ id: string; name: string; accent: string; design: Partial<DesignSettings> }>>(() => {
    try { return JSON.parse(localStorage.getItem("provstudio.tones") ?? "[]"); } catch { return []; }
  });
  const saveTones = (next: typeof tones) => {
    setTones(next);
    localStorage.setItem("provstudio.tones", JSON.stringify(next));
  };

  const applyPreset = (p: { accent: string; design: Partial<DesignSettings> }) => {
    setD({ primaryColor: p.accent, ...p.design });
  };

  const isPresetActive = (p: { accent: string; design: Partial<DesignSettings> }) => {
    if (p.accent !== accent) return false;
    return (["headingFont","bodyFont","titleWeight","cardStyle","paperStyle","numStyle","layout"] as const)
      .every(k => p.design[k] === undefined || p.design[k] === (design as Record<string,unknown>)[k]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 32 }}>

      {/* 1. Förinställning */}
      <PsGroup title="Förinställning">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
          {DESIGN_PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)} style={{ padding: "7px 5px 8px", borderRadius: 7, border: "1.5px solid", borderColor: isPresetActive(p) ? "var(--ps-ink)" : "var(--ps-rule-2)", background: isPresetActive(p) ? "var(--ps-paper)" : "transparent", cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 11, textAlign: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: p.accent, margin: "0 auto 4px" }} />
              <span style={{ fontWeight: isPresetActive(p) ? 600 : 400, color: "var(--ps-ink-2)", display: "block" }}>{p.name}</span>
              <span style={{ fontSize: 9, color: "var(--ps-ink-4)", display: "block" }}>{p.desc}</span>
            </button>
          ))}
          {tones.map(t => (
            <button key={t.id} onClick={() => applyPreset(t)} style={{ padding: "7px 5px 8px", borderRadius: 7, position: "relative", border: "1.5px solid", borderColor: isPresetActive(t) ? "var(--ps-ink)" : "var(--ps-rule-2)", background: isPresetActive(t) ? "var(--ps-paper)" : "transparent", cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 11, textAlign: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: t.accent, margin: "0 auto 4px" }} />
              <span style={{ fontWeight: isPresetActive(t) ? 600 : 400, color: "var(--ps-ink-2)" }}>{t.name}</span>
              <span onClick={e => { e.stopPropagation(); saveTones(tones.filter(x => x.id !== t.id)); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 10, color: "var(--ps-ink-4)", cursor: "pointer" }} title="Ta bort ton">×</span>
            </button>
          ))}
        </div>
        <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start", fontSize: 11 }}
          onClick={() => {
            const name = prompt("Namn på ny designton:");
            if (!name) return;
            saveTones([...tones, {
              id: crypto.randomUUID(), name, accent,
              design: { headingFont: design.headingFont, bodyFont: design.bodyFont, titleWeight: design.titleWeight,
                titleItalic: design.titleItalic, titleTransform: design.titleTransform, titleTracking: design.titleTracking,
                titleColor: design.titleColor, cardStyle: design.cardStyle, paperStyle: design.paperStyle,
                numStyle: design.numStyle, layout: design.layout },
            }]);
          }}
        >
          + Spara nuvarande som ton
        </button>
      </PsGroup>

      {/* 3. Accentfärg */}
      <PsGroup title="Accentfärg">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
          {ACCENT_PALETTE_FULL.map(p => (
            <button key={p.color} title={p.name} onClick={() => setD({ primaryColor: p.color })} style={{ height: 28, borderRadius: 6, background: p.color, cursor: "pointer", border: accent === p.color ? "2px solid var(--ps-ink)" : "1px solid var(--ps-rule-2)", outline: accent === p.color ? "2px solid var(--ps-paper)" : "none", outlineOffset: -3, fontSize: 9, color: "white", textShadow: "0 0 2px rgba(0,0,0,0.5)", fontFamily: "var(--ps-ui)" }}>
              {accent === p.color ? "✓" : ""}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ps-ink-3)" }}>
          <span>Anpassad</span>
          <input type="color" value={accent} onChange={e => setD({ primaryColor: e.target.value })} style={{ width: 28, height: 22, borderRadius: 4, border: "1px solid var(--ps-rule)", padding: 2, cursor: "pointer" }} />
          <input value={accent} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setD({ primaryColor: e.target.value }); }} className="ps-input" style={{ flex: 1, fontSize: 11, fontFamily: "monospace" }} maxLength={7} />
        </div>
      </PsGroup>

      {/* 4. Pappersyta */}
      <PsGroup title="Pappersyta">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
          {Object.entries(PAPER_STYLE_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ paperStyle: k as DesignSettings["paperStyle"] })} style={{ padding: "5px 3px", borderRadius: 6, fontSize: 10.5, fontFamily: "var(--ps-ui)", border: "1px solid", borderColor: (design.paperStyle ?? "white") === k ? "var(--ps-ink)" : "var(--ps-rule-2)", background: (design.paperStyle ?? "white") === k ? "var(--ps-paper)" : "transparent", cursor: "pointer", fontWeight: (design.paperStyle ?? "white") === k ? 500 : 400, color: "var(--ps-ink-2)" }}>
              {name}
            </button>
          ))}
        </div>
      </PsGroup>

      {/* 5. Kort-stil */}
      <PsGroup title="Kort-stil">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
          {Object.entries(CARD_STYLE_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ cardStyle: k as DesignSettings["cardStyle"] })} style={{ padding: "6px 4px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ps-ui)", border: "1px solid", borderColor: (design.cardStyle ?? "flat") === k ? "var(--ps-ink)" : "var(--ps-rule-2)", background: (design.cardStyle ?? "flat") === k ? "var(--ps-paper)" : "transparent", cursor: "pointer", fontWeight: (design.cardStyle ?? "flat") === k ? 500 : 400, color: "var(--ps-ink-2)" }}>
              {name}
            </button>
          ))}
        </div>
      </PsGroup>

      {/* 6. Sidram */}
      <PsGroup title="Sidram">
        <Segmented value={design.pageFrame ?? "none"} onChange={v => setD({ pageFrame: v as DesignSettings["pageFrame"] })} options={Object.entries(PAGE_FRAME_NAMES).map(([v, label]) => ({ v, label }))} />
      </PsGroup>

      {/* 7. Vattenstämpel */}
      <PsGroup title="Vattenstämpel">
        <Segmented
          value={["", "UTKAST", "PROV", "ÖVNING"].includes(design.watermark ?? "") ? (design.watermark ?? "") : "__custom__"}
          onChange={v => { if (v !== "__custom__") setD({ watermark: v }); }}
          options={[{ v: "", label: "Av" }, { v: "UTKAST", label: "Utkast" }, { v: "PROV", label: "Prov" }, { v: "ÖVNING", label: "Övning" }]}
        />
        <input value={design.watermark ?? ""} onChange={e => setD({ watermark: e.target.value })} placeholder="Egen text…" className="ps-input" style={{ fontSize: 12.5 }} />
      </PsGroup>

      {/* 8. Typografi */}
      <PsGroup title="Typografi">
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Rubrikfont</span>
          <select value={design.headingFont ?? "newsreader"} onChange={e => setD({ headingFont: e.target.value })} className="ps-input" style={{ fontSize: 12.5 }}>
            {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name} — {f.category}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Brödtextfont</span>
          <select value={design.bodyFont ?? "newsreader"} onChange={e => setD({ bodyFont: e.target.value })} className="ps-input" style={{ fontSize: 12.5 }}>
            {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name} — {f.category}</option>)}
          </select>
        </label>
      </PsGroup>

      {/* 9. Rubrikstil */}
      <PsGroup title="Rubrikstil">
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Vikt</span>
          <Segmented value={String(design.titleWeight ?? 700)} onChange={v => setD({ titleWeight: parseInt(v, 10) })} options={[{ v: "400", label: "Reg" }, { v: "500", label: "Med" }, { v: "600", label: "SB" }, { v: "700", label: "Bold" }]} />
        </label>
      </PsGroup>

      {/* 10. Numrering */}
      <PsGroup title="Numrering">
        <Segmented value={design.numbering ?? "number"} onChange={v => setD({ numbering: v as DesignSettings["numbering"] })} options={[{ v: "number", label: "1." }, { v: "letter", label: "a)" }, { v: "roman", label: "i." }, { v: "paren", label: "(1)" }]} />
        <Segmented value={design.numStyle ?? "plain"} onChange={v => setD({ numStyle: v as DesignSettings["numStyle"] })} options={[{ v: "plain", label: "Klassisk" }, { v: "fraga", label: "Fråga" }, { v: "display", label: "Stor" }, { v: "chip", label: "Chip" }]} />
        <PsToggle label="Färgade siffror" on={(design.numColor ?? "ink") === "accent"} onChange={v => setD({ numColor: v ? "accent" : "ink" })} />
      </PsGroup>

      {/* 11. Skrivlinjer */}
      <PsGroup title="Skrivlinjer">
        <Segmented value={design.lineStyle ?? "solid"} onChange={v => setD({ lineStyle: v as DesignSettings["lineStyle"] })} options={[{ v: "solid", label: "Heldraget" }, { v: "dashed", label: "Streckat" }, { v: "dotted", label: "Punktat" }]} />
        <PsSlider label="Radhöjd" value={design.lineHeight ?? design.lineSpacing ?? 22} min={16} max={32} step={1} suffix="px" onChange={v => setD({ lineHeight: v })} />
      </PsGroup>

      {/* 12. Flerval */}
      <PsGroup title="Flerval">
        <Segmented value={design.mcMarker ?? "square"} onChange={v => setD({ mcMarker: v as DesignSettings["mcMarker"] })} options={[{ v: "square", label: "☐" }, { v: "circle", label: "○" }, { v: "letter", label: "A" }]} />
      </PsGroup>

      {/* 13. Poäng-stil */}
      <PsGroup title="Poäng-stil">
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Poängformat</span>
          <Segmented value={design.pointsFormat ?? "plain"} onChange={v => setD({ pointsFormat: v as DesignSettings["pointsFormat"] })} options={[{ v: "plain", label: "3p" }, { v: "blank", label: "_/3p" }, { v: "grades", label: "E/C/A" }]} />
        </label>
        <Segmented value={design.pointsStyle ?? "italic"} onChange={v => setD({ pointsStyle: v as DesignSettings["pointsStyle"] })} options={[{ v: "italic", label: "Kursivt" }, { v: "pill", label: "Pill" }, { v: "box", label: "Ruta" }, { v: "stamp", label: "Stämpel" }]} />
        <PsToggle label="Visa poäng vid fråga" on={design.showPoints !== false} onChange={v => setD({ showPoints: v })} />
      </PsGroup>

      {/* 15. Rytm & täthet */}
      <PsGroup title="Rytm & täthet">
        <Segmented value={design.density ?? "comfortable"} onChange={v => setD({ density: v as DesignSettings["density"] })} options={[{ v: "compact", label: "Kompakt" }, { v: "comfortable", label: "Normal" }, { v: "spacious", label: "Luftig" }]} />
        <PsSlider label="Marginal" value={design.margin ?? design.marginLeft ?? 22} min={14} max={30} step={1} suffix="mm" onChange={v => setD({ margin: v, marginLeft: v, marginRight: v, marginTop: v, marginBottom: v })} />
        <PsSlider label="Brödtext" value={design.bodySize ?? design.fontSizeBody ?? 11} min={8} max={14} step={0.5} suffix="pt" onChange={v => setD({ bodySize: v })} />
      </PsGroup>

      {/* 16. Sidfot */}
      <PsGroup title="Sidfot">
        <Segmented value={design.footerStyle ?? "info"} onChange={v => setD({ footerStyle: v as DesignSettings["footerStyle"] })} options={[{ v: "none", label: "Av" }, { v: "minimal", label: "Min." }, { v: "info", label: "Info" }, { v: "hairline", label: "Linje" }, { v: "branded", label: "Brand" }]} />
      </PsGroup>

      {/* 17. Layout-stil (thumbnails) */}
      <PsGroup title="Layout-stil">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {(["classic","editorial","minimal","exam"] as const).map(v => (
            <button key={v} onClick={() => setD({ layout: v })} style={{ padding: "4px 4px 6px", borderRadius: 6, border: "1.5px solid", borderColor: (design.layout ?? "classic") === v ? "var(--ps-ink)" : "var(--ps-rule-2)", background: "transparent", cursor: "pointer" }}>
              <LayoutThumb variant={v} accent={accent} />
              <span style={{ display: "block", fontSize: 9.5, color: "var(--ps-ink-3)", marginTop: 4, fontFamily: "var(--ps-ui)" }}>
                {{ classic: "Klassisk", editorial: "Editorial", minimal: "Minimal", exam: "Examen" }[v]}
              </span>
            </button>
          ))}
        </div>
      </PsGroup>

      {/* 19. Bild på cover (endast Bildmotiv-mallen) */}
      {design.coverTemplate === "imagery" && (
        <CoverImagePanel design={design} setD={setD} />
      )}

    </div>
  );
}

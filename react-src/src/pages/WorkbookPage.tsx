/**
 * WorkbookPage — editor for workbook (häfte) documents
 * Uses a two-page spread layout.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { v4 as uuidv4 } from "uuid";
import {
  BookOpen, FileText, Files, Sparkles, Library, Check, Download,
  User, Users, Info, PenLine, Type, Image as ImageIcon, Flag, Bell,
  CheckCircle, Minus, Copy, ChevronDown, Palette,
  ChevronLeft, Trash2, type LucideIcon,
} from "lucide-react";
import { documents, questionBank, scheduleSave } from "@/lib/local-db";
import { toast } from "sonner";
import {
  isContentBlockRef,
  type ContentBlockRef,
  type ContentBlockType,
  type DesignSettings,
  type Question,
} from "@/lib/test-types";
import { BankPickerModal } from "@/components/BankPickerModal";
import { getQuestionText } from "@/lib/question-utils";

/* ── Block library ─────────────────────────────────────────────────────────── */
const WORKBOOK_BLOCKS: Array<{ type: ContentBlockType; icon: LucideIcon; label: string; color: string }> = [
  { type: "heading",    icon: Type,         label: "Rubrik",       color: "#1E5F5C" },
  { type: "intro",      icon: PenLine,      label: "Inledning",    color: "#1E5F5C" },
  { type: "instruction",icon: Info,         label: "Instruktion",  color: "#2B5BA8" },
  { type: "source",     icon: BookOpen,     label: "Källtext",     color: "#A87F1A" },
  { type: "vocab",      icon: Type,         label: "Begreppsruta", color: "#7A1F2B" },
  { type: "image",      icon: ImageIcon,    label: "Bild",         color: "#5C2A5C" },
  { type: "exercise",   icon: PenLine,      label: "Övning",       color: "#2D5A3D" },
  { type: "quote",      icon: Flag,         label: "Citat",        color: "#A87F1A" },
  { type: "marginNote", icon: Bell,         label: "Marginalnot",  color: "#B7791F" },
  { type: "checklist",  icon: CheckCircle,  label: "Checklista",   color: "#1E3A5F" },
  { type: "divider",    icon: Minus,        label: "Avdelare",     color: "#6B6459" },
  { type: "pageBreak",  icon: Files,        label: "Sidbrytning",  color: "#6B6459" },
];

/* ── Accent palette ─────────────────────────────────────────────────────────── */
const ACCENT_PALETTE = [
  "#1E5F5C", "#1E3A5F", "#7A1F2B", "#A87F1A", "#5C2A5C", "#2C2C2C",
];

/* ── Default content per block type ─────────────────────────────────────────── */
function defaultWorkbookBlockContent(type: ContentBlockType): Record<string, unknown> {
  switch (type) {
    case "heading":     return { text: "Ny rubrik", subtitle: "", chapter: "" };
    case "intro":       return { text: "Introduktionstext…" };
    case "instruction": return { text: "Instruktion till eleven…" };
    case "source":      return { title: "KÄLLA A", text: "Källtext…", attribution: "", note: "" };
    case "vocab":       return { word: "Begrepp", definition: "Definition…", related: [] };
    case "exercise":    return { n: 1, text: "Övningsfråga…", lines: 4, marginNote: "" };
    case "quote":       return { text: "Citat…", attribution: "" };
    case "image":       return { caption: "", placeholder: "Bild" };
    case "checklist":   return { title: "Att göra", items: ["Punkt 1"] };
    case "marginNote":  return { text: "Marginalnot…" };
    case "divider":     return {};
    case "pageBreak":   return {};
    default:            return {};
  }
}

/* ── Font helper ──────────────────────────────────────────────────────────── */
function fontStack(font: string): string {
  if (font === "serif")   return "'Newsreader', Georgia, serif";
  if (font === "humanist") return "'DM Sans', 'Segoe UI', sans-serif";
  return "var(--ps-ui, system-ui)";
}

/* ── Page footer component ───────────────────────────────────────────────── */
function PageFooter({ pageNum, course, chapter, side }: { pageNum: number; course: string; chapter: string; side: "left" | "right" }) {
  const left = [course?.toUpperCase(), chapter ? `KAP ${chapter}` : ""].filter(Boolean).join(" · ");
  return (
    <div style={{
      display: "flex",
      justifyContent: side === "left" ? "flex-start" : "flex-end",
      paddingTop: 14, marginTop: "auto", borderTop: "1px solid #eee",
      fontSize: 9, color: "#999", letterSpacing: "0.06em",
      fontFamily: "var(--ps-ui)",
    }}>
      {side === "left" ? left : `SIDA ${pageNum}`}
    </div>
  );
}

/* ── Action button style ──────────────────────────────────────────────────── */
const actionBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: "1px solid var(--ps-rule-2)", background: "var(--ps-bg-soft)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-2)",
};

/* ── Block inspector ──────────────────────────────────────────────────────── */
function WorkbookBlockInspector({
  block,
  blocks,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopy,
}: {
  block: ContentBlockRef;
  blocks: ContentBlockRef[];
  onEdit: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopy: () => void;
}) {
  const c = block.content as Record<string, unknown>;

  const field = (label: string, key: string, type: "text" | "textarea" | "number" = "text") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
      <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {type === "textarea" ? (
        <textarea
          value={String(c[key] ?? "")}
          onChange={e => onEdit({ [key]: e.target.value })}
          rows={3}
          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--ps-rule-2)", fontFamily: "var(--ps-ui)", fontSize: 12.5, background: "var(--ps-bg-soft)", resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          value={type === "number" ? Number(c[key] ?? 0) : String(c[key] ?? "")}
          onChange={e => onEdit({ [key]: type === "number" ? parseInt(e.target.value) : e.target.value })}
          style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--ps-rule-2)", fontFamily: "var(--ps-ui)", fontSize: 12.5, background: "var(--ps-bg-soft)" }}
        />
      )}
    </label>
  );

  return (
    <div>
      {/* Block type label */}
      <div style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Block · {WORKBOOK_BLOCKS.find(b => b.type === block.block_type)?.label ?? block.block_type ?? ""}
      </div>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <button
          title="Kopiera"
          onClick={onCopy}
          style={actionBtnStyle}
        >
          <Copy size={12} />
        </button>
        <button
          title="Flytta ner"
          onClick={onMoveDown}
          style={actionBtnStyle}
        >
          <ChevronDown size={12} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          title="Ta bort"
          onClick={onDelete}
          style={{ ...actionBtnStyle, border: "1px solid #dc262640", color: "#dc2626" }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {block.block_type === "heading" && (
        <>
          {field("Rubrik", "text")}
          {field("Undertitel", "subtitle")}
          {field("Kapitel", "chapter")}
        </>
      )}
      {block.block_type === "intro" && field("Text", "text", "textarea")}
      {block.block_type === "instruction" && field("Text", "text", "textarea")}
      {block.block_type === "source" && (
        <>
          {field("Källtitel", "title")}
          {field("Källtext", "text", "textarea")}
          {field("Attribution", "attribution")}
          {field("Lärarnot", "note", "textarea")}
        </>
      )}
      {block.block_type === "vocab" && (
        <>
          {field("Begrepp", "word")}
          {field("Definition", "definition", "textarea")}
          <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Relaterade begrepp</span>
            <input
              type="text"
              placeholder="Lägg till, separera med komma"
              onBlur={e => {
                const vals = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                if (vals.length) onEdit({ related: [...((c.related as string[]) ?? []), ...vals] });
                e.target.value = "";
              }}
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--ps-rule-2)", fontFamily: "var(--ps-ui)", fontSize: 12.5, background: "var(--ps-bg-soft)" }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {((c.related as string[]) ?? []).map((r, i) => (
                <span key={i} style={{ fontSize: 10.5, background: "#7A1F2B14", color: "#7A1F2B", borderRadius: 4, padding: "1px 6px", fontFamily: "var(--ps-ui)", cursor: "pointer" }}
                  onClick={() => onEdit({ related: ((c.related as string[]) ?? []).filter((_, j) => j !== i) })}>
                  {r} ×
                </span>
              ))}
            </div>
          </label>
        </>
      )}
      {block.block_type === "exercise" && (
        <>
          {field("Övningstext", "text", "textarea")}
          {field("Skrivlinjer", "lines", "number")}
          {field("Marginalnot (lärare)", "marginNote", "textarea")}
        </>
      )}
      {block.block_type === "quote" && (
        <>
          {field("Citat", "text", "textarea")}
          {field("Attribution", "attribution")}
        </>
      )}
      {block.block_type === "image" && (
        <>
          <div style={{ border: "2px dashed var(--ps-rule-2)", borderRadius: 8, padding: "20px 0", textAlign: "center", marginBottom: 10, fontSize: 12, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
            Bilduppladdning ej tillgänglig i lokal version
          </div>
          {field("Bildtext", "caption")}
        </>
      )}
      {block.block_type === "checklist" && (
        <>
          {field("Titel", "title")}
          <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Punkter</span>
            {((c.items as string[]) ?? []).map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 4 }}>
                <input
                  value={item}
                  onChange={e => {
                    const items = [...((c.items as string[]) ?? [])];
                    items[i] = e.target.value;
                    onEdit({ items });
                  }}
                  style={{ flex: 1, padding: "4px 7px", borderRadius: 5, border: "1px solid var(--ps-rule-2)", fontFamily: "var(--ps-ui)", fontSize: 12, background: "var(--ps-bg-soft)" }}
                />
                <button onClick={() => onEdit({ items: ((c.items as string[]) ?? []).filter((_, j) => j !== i) })}
                  style={{ padding: "0 6px", borderRadius: 5, border: "1px solid var(--ps-rule-2)", background: "none", cursor: "pointer", color: "#dc2626" }}>×</button>
              </div>
            ))}
            <button
              onClick={() => onEdit({ items: [...((c.items as string[]) ?? []), ""] })}
              style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, border: "1px dashed var(--ps-rule-2)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
              + Lägg till punkt
            </button>
          </label>
        </>
      )}
      {block.block_type === "marginNote" && field("Text", "text", "textarea")}
      {(block.block_type === "divider" || block.block_type === "pageBreak") && (
        <p style={{ fontSize: 12, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>Ingen konfiguration</p>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function WorkbookPage({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const [title, setTitle]       = useState("");
  const [design, setDesign]     = useState<{
    accent: string; font: string; showMarginNotes: boolean; twoColumn: boolean;
    course: string; weekRange: string; chapter: string;
    primaryColor?: string; fontFamily?: string; subtitle?: string;
    distDigital?: boolean; distPeriodic?: boolean; distTeacherVersion?: boolean;
  }>({ accent: "#1E5F5C", font: "serif", showMarginNotes: true, twoColumn: true, course: "", weekRange: "", chapter: "" });
  const [blocks, setBlocks]     = useState<ContentBlockRef[]>([]);
  const [teacherView, setTeacherView] = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [rightTab, setRightTab]       = useState<"block" | "design" | "doc">("block");
  const [loading, setLoading]         = useState(true);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bank, setBank]               = useState<Question[]>([]);
  const [subtitle, setSubtitle]       = useState("");
  const [docType, setDocType]         = useState<"test" | "workbook" | "homework">("workbook");

  // helper to patch design
  const setD = useCallback((patch: Partial<typeof design>) => {
    setDesign(d => ({ ...d, ...patch }));
  }, []);

  /* ── Load ── */
  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { toast.error("Kunde inte ladda dokumentet"); onBack(); return; }
    setTitle(doc.title);
    setSubtitle(doc.design_settings?.subtitle ?? "");
    // Load design settings from doc
    const ds = doc.design_settings;
    if (ds) {
      setDesign({
        accent: ds.primaryColor ?? "#1E5F5C",
        font: ds.fontFamily === "humanist" ? "humanist" : "serif",
        showMarginNotes: true,
        twoColumn: true,
        course: ds.course ?? "",
        weekRange: (ds as unknown as { weekRange?: string }).weekRange ?? "",
        chapter: (ds as unknown as { chapter?: string }).chapter ?? "",
      });
    }
    if (doc.doc_type) {
      setDocType(doc.doc_type as "test" | "workbook" | "homework");
    }
    const orderBlocks = (doc.question_order ?? []).filter(isContentBlockRef) as ContentBlockRef[];
    setBlocks(orderBlocks);
    setBank(questionBank.list());
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  const saveState = useAutosave(
    JSON.stringify({ title, design, blocks, subtitle, docType }),
    () => {
      documents.update(documentId, {
        title,
        doc_type: docType,
        question_order: blocks,
        design_settings: {
          primaryColor: design.accent,
          fontFamily: design.font as "serif" | "humanist",
          subtitle,
          course: design.course,
          weekRange: design.weekRange,
          chapter: design.chapter,
        } as unknown as DesignSettings,
      });
      scheduleSave();
    },
    loading,
  );

  /* ── Block operations ── */
  const addBlock = useCallback((blockType: ContentBlockType) => {
    const id = uuidv4();
    const content = defaultWorkbookBlockContent(blockType);
    const newRef: ContentBlockRef = { block_id: id, block_type: blockType, content };
    setBlocks(b => [...b, newRef]);
    setSelectedId(id);
    setRightTab("block");
  }, []);

  const editBlock = useCallback((id: string, patch: Record<string, unknown>) => {
    setBlocks(b => b.map(r => r.block_id === id ? { ...r, content: { ...r.content, ...patch } } : r));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(b => b.filter(r => r.block_id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveBlock = useCallback((id: string, dir: "up" | "down") => {
    const dirNum: -1 | 1 = dir === "up" ? -1 : 1;
    setBlocks(b => {
      const idx = b.findIndex(r => r.block_id === id);
      if (idx < 0) return b;
      const next = [...b];
      const swapIdx = idx + dirNum;
      if (swapIdx < 0 || swapIdx >= next.length) return b;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const copyBlock = useCallback((id: string) => {
    setBlocks(b => {
      const idx = b.findIndex(r => r.block_id === id);
      if (idx < 0) return b;
      const original = b[idx];
      const copy: ContentBlockRef = { ...original, block_id: uuidv4() };
      const next = [...b];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  /* ── PDF download ── */
  const handleDownload = async () => {
    const el = document.getElementById("workbook-print-root");
    if (!el) return;
    const html2pdf = (await import("html2pdf.js")).default as unknown as (opts?: unknown) => {
      from: (el: HTMLElement) => { set: (o: unknown) => { save: () => Promise<void> } }
    };
    await html2pdf().from(el).set({
      margin: 0, filename: `${title || "häfte"}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).save();
  };

  /* ── Pages (split by pageBreak) ── */
  const pages = useMemo(() => {
    const out: ContentBlockRef[][] = [[]];
    for (const b of blocks) {
      if (b.block_type === "pageBreak") {
        out.push([]);
      } else {
        out[out.length - 1].push(b);
      }
    }
    return out;
  }, [blocks]);

  /* ── Spreads (pairs of pages) ── */
  const spreads = useMemo(() => {
    const result: Array<[ContentBlockRef[], ContentBlockRef[]]> = [];
    for (let i = 0; i < pages.length; i += 2) {
      result.push([pages[i] ?? [], pages[i + 1] ?? []]);
    }
    return result;
  }, [pages]);

  const selectedBlock = selectedId ? blocks.find(b => b.block_id === selectedId) ?? null : null;
  const fontFamily = fontStack(design.font);
  const accent = design.accent;
  const totalBlocks = blocks.filter(b => b.block_type !== "pageBreak" && b.block_type !== "divider").length;

  /* ── Block renderer ── */
  const renderBlock = (b: ContentBlockRef, onClick: () => void, isSelected: boolean, exerciseNum: number) => {
    const c = b.content as Record<string, unknown>;
    const wrapperStyle: React.CSSProperties = {
      borderRadius: 6,
      outline: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
      outlineOffset: 2,
      cursor: "pointer",
      marginBottom: 10,
      position: "relative",
    };

    switch (b.block_type) {
      case "heading": {
        const h = c as { title?: string; text?: string; subtitle?: string; chapter?: string; chapterLabel?: string };
        const chLabel = h.chapterLabel || (h.chapter ? `KAPITEL ${h.chapter}` : "");
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              {(chLabel || design.course) && (
                <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {[chLabel, design.course].filter(Boolean).join(" · ")}
                </div>
              )}
              <h1 style={{ fontSize: 38, margin: "6px 0 2px", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, fontFamily: "Newsreader, serif" }}>
                {h.title || h.text || "Rubrik"}
              </h1>
              {h.subtitle && <div style={{ fontSize: 13, fontStyle: "italic", color: "#666" }}>{h.subtitle}</div>}
              <div style={{ width: 60, height: 1, background: accent, marginTop: 12 }} />
            </div>
          </div>
        );
      }

      case "intro": {
        const rawText = String(c.text || "");
        const first = rawText.charAt(0);
        const rest = rawText.slice(1);
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: "#222", margin: "0 0 14px", padding: "10px 0 0", fontFamily: "Newsreader, serif" }}>
              {first && (
                <span style={{ float: "left", fontSize: 38, lineHeight: 0.9, color: accent, marginRight: 6, fontWeight: 600, fontStyle: "italic" }}>
                  {first}
                </span>
              )}
              {rest || rawText}
            </p>
          </div>
        );
      }

      case "instruction": {
        const text = String(c.text || "");
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ display: "flex", gap: 10, margin: "8px 0", padding: "10px 12px", background: accent + "0f", borderLeft: `3px solid ${accent}`, borderRadius: "0 4px 4px 0" }}>
              <Info size={13} style={{ color: accent, marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 11, lineHeight: 1.55, color: "#333", fontStyle: "italic" }}>{text || "(Instruktionstext)"}</div>
            </div>
          </div>
        );
      }

      case "source": {
        const s = c as { title?: string; text?: string; attribution?: string; note?: string };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "10px 0", padding: 14, background: "#FBF8F1", border: "1px solid #E7DDC4", borderRadius: 4, position: "relative" }}>
              <div style={{ position: "absolute", top: -7, left: 12, background: "#FBF8F1", padding: "0 6px", fontSize: 8.5, color: "#A87F1A", letterSpacing: "0.14em", fontWeight: 600 }}>
                KÄLLA{s.title ? ` · ${s.title.toUpperCase()}` : ""}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.65, fontStyle: "italic", color: "#333", fontFamily: "Newsreader, serif" }}>
                {s.text ? `"${s.text}"` : "(Källtext)"}
              </div>
              {s.attribution && (
                <div style={{ fontSize: 9, color: "#888", marginTop: 6, textAlign: "right" }}>— {s.attribution}</div>
              )}
              {teacherView && s.note && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: "#FEF9C3", borderRadius: 5, fontSize: 11, color: "#78350f", fontFamily }}>
                  Lärarnot: {s.note}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "vocab": {
        const v = c as { word?: string; definition?: string; related?: string[] };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "10px 0", padding: 12, background: "white", border: "1.5px solid #7A1F2B", borderRadius: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#7A1F2B", letterSpacing: "0.12em", fontWeight: 700 }}>BEGREPP</span>
                <div style={{ flex: 1, height: 1, background: "#7A1F2B", opacity: 0.3 }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#7A1F2B", fontFamily: "Newsreader, serif" }}>{v.word || "Ord"}</div>
              <div style={{ fontSize: 10.5, color: "#333", lineHeight: 1.55, marginTop: 4 }}>{v.definition || "(Definition)"}</div>
              {v.related && v.related.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 9, color: "#888", fontStyle: "italic" }}>
                  Se även: {v.related.join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "exercise": {
        const ex = c as { text?: string; lines?: number };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: accent, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 600, fontFamily: "Newsreader, serif" }}>
                  {exerciseNum}
                </span>
                <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.55, color: "#14110D" }}>{ex.text || "(Uppgiftstext)"}</div>
              </div>
              <div style={{ marginTop: 6, marginLeft: 30 }}>
                {Array.from({ length: ex.lines ?? 3 }).map((_, i) => (
                  <div key={i} style={{ borderBottom: "1px solid #C8C2B5", height: 22 }} />
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "quote": {
        const q = c as { text?: string; attribution?: string };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "14px 0", padding: "10px 14px 10px 18px", borderLeft: `3px solid ${accent}`, fontFamily: "Newsreader, serif" }}>
              <div style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.5, color: "#222" }}>
                {q.text ? `"${q.text}"` : "(Citat)"}
              </div>
              {q.attribution && <div style={{ fontSize: 9.5, color: "#888", marginTop: 4 }}>— {q.attribution}</div>}
            </div>
          </div>
        );
      }

      case "checklist": {
        const cl = c as { title?: string; items?: string[] };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "10px 0", padding: 12, border: "1.5px dashed #B8B0A0", borderRadius: 4 }}>
              {cl.title && (
                <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
                  ✓ {cl.title}
                </div>
              )}
              {(cl.items ?? [""]).map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, marginBottom: 3 }}>
                  <span style={{ width: 11, height: 11, border: `1.5px solid ${accent}`, borderRadius: 2, flexShrink: 0, display: "inline-block" }} />
                  {it}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "image": {
        const img = c as { imageUrl?: string; caption?: string };
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "10px 0" }}>
              {img.imageUrl ? (
                <img src={img.imageUrl} alt={img.caption ?? ""} style={{ width: "100%", borderRadius: 3, display: "block" }} />
              ) : (
                <div style={{ aspectRatio: "1.5", background: "linear-gradient(135deg, #DDD3B8 0%, #B89E72 100%)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <svg width="80" height="60" viewBox="0 0 80 60" style={{ opacity: 0.5 }}>
                    <rect x="10" y="40" width="14" height="14" fill="rgba(0,0,0,0.4)" />
                    <rect x="26" y="34" width="14" height="20" fill="rgba(0,0,0,0.4)" />
                    <rect x="42" y="38" width="14" height="16" fill="rgba(0,0,0,0.4)" />
                    <rect x="58" y="32" width="12" height="22" fill="rgba(0,0,0,0.4)" />
                    <circle cx="60" cy="14" r="6" fill="rgba(255,255,255,0.3)" />
                  </svg>
                </div>
              )}
              {img.caption && (
                <div style={{ fontSize: 9.5, color: "#666", fontStyle: "italic", marginTop: 4 }}>
                  <span style={{ fontWeight: 600, marginRight: 4 }}>Bild.</span>{img.caption}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "marginNote": {
        const mn = c as { text?: string };
        if (!teacherView) return null;
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <div style={{ margin: "8px 0", padding: "8px 10px", background: accent + "14", border: `1px dashed ${accent}`, borderRadius: 4, fontSize: 10.5, color: "#333", display: "flex", gap: 6 }}>
              <Bell size={12} style={{ color: accent, marginTop: 1, flexShrink: 0 }} />
              <div><strong style={{ fontSize: 9.5 }}>Lärarnot:</strong> {mn.text || "(Marginalnot)"}</div>
            </div>
          </div>
        );
      }

      case "divider":
        return (
          <div key={b.block_id} style={wrapperStyle} onClick={onClick}>
            <hr style={{ border: "none", borderTop: `2px solid ${accent}44`, margin: "4px 0" }} />
          </div>
        );

      case "pageBreak":
        return null;

      default:
        return null;
    }
  };

  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
      Laddar…
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", height: "100vh", overflow: "hidden", fontFamily: "var(--ps-ui)" }}>

      {/* ── LEFT panel ── */}
      <aside style={{ width: 240, borderRight: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ps-rule)", flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-3)", fontSize: 12, fontFamily: "var(--ps-ui)", padding: 0, marginBottom: 6 }}
          >
            <ChevronLeft size={14} /> Mina dokument
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <BookOpen size={14} style={{ color: "var(--ps-accent)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ps-accent)", fontFamily: "var(--ps-ui)" }}>Arbetshäfte</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, letterSpacing: "-0.01em", fontFamily: "var(--ps-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title || "Namnlöst häfte"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)", marginTop: 2 }}>
            {[design.course, design.weekRange, `${pages.length * 2} sidor`].filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* Document type switcher */}
        <div style={{ padding: "12px 14px 8px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--ps-ui)" }}>
            Dokumenttyp
          </div>
          <div style={{ display: "flex", padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8, gap: 1 }}>
            {([
              { id: "test"     as const, Icon: FileText,  label: "Prov"  },
              { id: "workbook" as const, Icon: BookOpen,  label: "Häfte" },
              { id: "homework" as const, Icon: Files,     label: "Läxa"  },
            ]).map(t => (
              <button key={t.id} onClick={() => setDocType(t.id)} style={{
                flex: 1, height: 26, padding: "0 6px", borderRadius: 6, border: "none",
                background: docType === t.id ? "var(--ps-paper)" : "transparent",
                color: docType === t.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
                fontFamily: "var(--ps-ui)", fontSize: 10.5, fontWeight: docType === t.id ? 500 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: docType === t.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}>
                <t.Icon size={11} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Block library */}
        <div style={{ padding: "8px 14px 12px", flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 8px" }}>
            <span style={{ fontSize: 10, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--ps-ui)" }}>Block</span>
            <span style={{ fontSize: 10, color: "var(--ps-ink-4)", fontFamily: "var(--ps-ui)" }}>Dra till sidan</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {WORKBOOK_BLOCKS.map(blockDef => (
              <button key={blockDef.type} onClick={() => addBlock(blockDef.type as ContentBlockType)}
                style={{
                  padding: "8px 8px", borderRadius: 6, border: "1px solid var(--ps-rule)",
                  background: "var(--ps-paper)", cursor: "pointer", fontFamily: "var(--ps-ui)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  fontSize: 10.5, color: "var(--ps-ink-2)", transition: "border-color 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = blockDef.color; e.currentTarget.style.background = blockDef.color + "0c"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ps-rule)"; e.currentTarget.style.background = "var(--ps-paper)"; }}
              >
                <blockDef.icon size={14} style={{ color: blockDef.color }} />
                {blockDef.label}
              </button>
            ))}
          </div>

          {/* Bank reuse */}
          <div style={{ marginTop: 16, padding: 10, background: "var(--ps-accent)0f", borderRadius: 8, border: "1px solid var(--ps-accent)33" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={12} style={{ color: "var(--ps-accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--ps-ui)" }}>Återbruk från frågebanken</span>
            </div>
            <p style={{ fontSize: 10.5, color: "var(--ps-ink-3)", margin: 0, lineHeight: 1.45, fontFamily: "var(--ps-ui)" }}>
              Dra in övningar från ditt provarkiv. Ändringar propagerar mellan dokument.
            </p>
            <button
              onClick={() => setBankPickerOpen(true)}
              style={{ marginTop: 8, width: "100%", height: 26, borderRadius: 6, fontSize: 11,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                border: "1px solid var(--ps-rule-2)", background: "transparent", cursor: "pointer",
                fontFamily: "var(--ps-ui)", color: "var(--ps-ink-2)" }}
            >
              <Library size={11} /> Öppna frågebanken
            </button>
          </div>
        </div>
      </aside>

      {/* ── CENTER ── */}
      <main style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--ps-bg-soft)" }}>
        {/* Topbar */}
        <div style={{
          background: "var(--ps-bg)", borderBottom: "1px solid var(--ps-rule)",
          padding: "9px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8, gap: 1 }}>
            {([
              { id: false, label: "Elevversion", Icon: User },
              { id: true,  label: "Lärarversion", Icon: Users },
            ] as const).map(m => (
              <button
                key={String(m.id)}
                onClick={() => setTeacherView(m.id)}
                style={{
                  height: 27, padding: "0 10px", borderRadius: 6, border: "none",
                  background: teacherView === m.id ? "var(--ps-paper)" : "transparent",
                  color: teacherView === m.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
                  fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: teacherView === m.id ? 500 : 400,
                  cursor: "pointer",
                  boxShadow: teacherView === m.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <m.Icon size={12} /> {m.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11.5, color: "var(--ps-ink-3)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--ps-ui)" }}>
            {saveState === "saved" && <Check size={11} style={{ color: "#16a34a" }} />}
            {saveState === "saving" ? "Sparar…" : saveState === "saved" ? `Sparat just nu · ${totalBlocks} block` : `${totalBlocks} block`}
          </span>

          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => window.print()}>
            Skriv ut
          </button>
          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={handleDownload}>
            <Download size={12} /> PDF
          </button>
        </div>

        {/* Spread canvas */}
        <div id="workbook-print-root" style={{ flex: 1, overflowY: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {spreads.map(([left, right], spreadIdx) => {
            // Calculate exercise offset for this spread
            let exCounter = 0;
            for (let s = 0; s < spreadIdx; s++) {
              exCounter += spreads[s][0].filter(b => b.block_type === "exercise").length;
              exCounter += spreads[s][1].filter(b => b.block_type === "exercise").length;
            }

            const renderPageBlocks = (pageBlocks: ContentBlockRef[], startExNum: number) => {
              let localEx = startExNum;
              return pageBlocks.map(b => {
                if (b.block_type === "exercise") localEx++;
                return renderBlock(
                  b,
                  () => { setSelectedId(b.block_id); setRightTab("block"); },
                  selectedId === b.block_id,
                  b.block_type === "exercise" ? localEx : 0,
                );
              });
            };

            const leftExStart = exCounter;
            const leftExCount = left.filter(b => b.block_type === "exercise").length;
            const rightExStart = leftExStart + leftExCount;

            return (
              <div key={spreadIdx} style={{ display: "flex", gap: 4, background: "rgba(20,17,13,0.06)", padding: 4, borderRadius: 6, marginBottom: 48 }}>
                {/* left page */}
                <div style={{ width: 480, minHeight: 678, background: "white",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 16px 50px -28px rgba(20,17,13,0.2)",
                  padding: "28px 32px", fontFamily, color: "#14110D",
                  display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                  {renderPageBlocks(left, leftExStart)}
                  <PageFooter pageNum={spreadIdx * 2 + 1} course={design.course ?? ""} chapter={design.chapter ?? ""} side="left" />
                </div>
                {/* right page */}
                <div style={{ width: 480, minHeight: 678, background: "white",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 16px 50px -28px rgba(20,17,13,0.2)",
                  padding: "28px 32px", fontFamily, color: "#14110D",
                  display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                  {renderPageBlocks(right, rightExStart)}
                  <PageFooter pageNum={spreadIdx * 2 + 2} course={design.course ?? ""} chapter={design.chapter ?? ""} side="right" />
                </div>
              </div>
            );
          })}

          {/* Add spread button */}
          <button
            onClick={() => addBlock("pageBreak")}
            style={{
              marginTop: 8, padding: "10px 24px",
              borderRadius: 8, border: "1px dashed var(--ps-rule-2)", background: "transparent",
              cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 13, color: "var(--ps-ink-3)",
            }}
          >
            + Nytt uppslag
          </button>
        </div>
      </main>

      {/* ── RIGHT panel ── */}
      <aside style={{ borderLeft: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", padding: "10px 12px 0", gap: 3, flexShrink: 0 }}>
          {([
            { id: "block"  as const, label: "Block",  Icon: PenLine  },
            { id: "design" as const, label: "Layout", Icon: Palette  },
            { id: "doc"    as const, label: "Häfte",  Icon: BookOpen },
          ]).map(t => (
            <button key={t.id} onClick={() => setRightTab(t.id)} style={{
              flex: 1, height: 30, padding: "0 6px", borderRadius: 6,
              border: "1px solid",
              background: rightTab === t.id ? "var(--ps-paper)" : "transparent",
              color: rightTab === t.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
              borderColor: rightTab === t.id ? "var(--ps-rule)" : "transparent",
              fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: rightTab === t.id ? 500 : 400,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}>
              <t.Icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 32px" }}>
          {/* Block tab */}
          {rightTab === "block" && (
            selectedBlock ? (
              <WorkbookBlockInspector
                block={selectedBlock}
                blocks={blocks}
                onEdit={(patch) => editBlock(selectedBlock.block_id, patch)}
                onDelete={() => { deleteBlock(selectedBlock.block_id); setSelectedId(null); }}
                onMoveUp={() => moveBlock(selectedBlock.block_id, "up")}
                onMoveDown={() => moveBlock(selectedBlock.block_id, "down")}
                onCopy={() => copyBlock(selectedBlock.block_id)}
              />
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ps-ink-4)", fontSize: 12, fontFamily: "var(--ps-ui)" }}>
                Klicka på ett block i häftet för att redigera det.
              </div>
            )
          )}

          {/* Design tab */}
          {rightTab === "design" && (
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ps-ink-4)", marginBottom: 8, fontFamily: "var(--ps-ui)" }}>
                Accentfärg
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {ACCENT_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setD({ accent: color })}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: color, border: "none",
                      cursor: "pointer",
                      boxShadow: design.accent === color ? `0 0 0 3px #fff, 0 0 0 5px ${color}` : "none",
                    }}
                    title={color}
                  />
                ))}
              </div>

              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ps-ink-4)", marginBottom: 8, fontFamily: "var(--ps-ui)" }}>
                Typsnitt
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {([
                  { id: "serif",   label: "Serif" },
                  { id: "humanist",label: "Humanist" },
                  { id: "system",  label: "System" },
                ]).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setD({ font: f.id })}
                    style={{
                      flex: 1, height: 30, borderRadius: 6,
                      border: "1px solid",
                      borderColor: design.font === f.id ? "var(--ps-accent)" : "var(--ps-rule-2)",
                      background: design.font === f.id ? "var(--ps-accent)14" : "transparent",
                      color: design.font === f.id ? "var(--ps-accent)" : "var(--ps-ink-3)",
                      fontFamily: "var(--ps-ui)", fontSize: 11.5, cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={design.twoColumn}
                  onChange={e => setD({ twoColumn: e.target.checked })}
                />
                <span style={{ fontSize: 12.5, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>Två kolumner</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={design.showMarginNotes}
                  onChange={e => setD({ showMarginNotes: e.target.checked })}
                />
                <span style={{ fontSize: 12.5, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>Visa marginalnoter (lärarversion)</span>
              </label>
            </div>
          )}

          {/* Doc tab */}
          {rightTab === "doc" && (
            <div>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>Titel</span>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="ps-input" style={{ fontSize: 12.5 }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>Undertitel</span>
                <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)}
                  className="ps-input" style={{ fontSize: 12.5 }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>Kurs</span>
                <input type="text" value={design.course} onChange={e => setD({ course: e.target.value })}
                  className="ps-input" style={{ fontSize: 12.5 }} />
              </label>

              {/* Kapitel + Veckor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Kapitel</span>
                  <input value={design.chapter ?? ""} onChange={e => setD({ chapter: e.target.value })} className="ps-input" style={{ fontSize: 12.5 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Veckor</span>
                  <input value={design.weekRange ?? ""} onChange={e => setD({ weekRange: e.target.value })} className="ps-input" style={{ fontSize: 12.5 }} />
                </label>
              </div>

              {/* Distribution */}
              <div style={{ marginTop: 12, borderTop: "1px solid var(--ps-rule)", paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Distribution</div>
                {[
                  { label: "Tillgängligt som digital läxa",           checked: design.distDigital ?? false,        onChange: (v: boolean) => setD({ distDigital: v }) },
                  { label: "Periodiserat (släpper en sida i veckan)", checked: design.distPeriodic ?? false,       onChange: (v: boolean) => setD({ distPeriodic: v }) },
                  { label: "Innehåller lärarversion",                 checked: design.distTeacherVersion ?? true,  onChange: (v: boolean) => setD({ distTeacherVersion: v }) },
                ].map((t, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={t.checked}
                      onChange={e => t.onChange(e.target.checked)}
                      style={{ accentColor: "var(--ps-accent)", width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--ps-ink-2)" }}>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── BankPickerModal ── */}
      {bankPickerOpen && (
        <BankPickerModal
          bank={bank}
          inDocument={new Set<string>()}
          onAdd={(qId) => {
            const q = bank.find(x => x.id === qId);
            if (!q) return;
            const text = getQuestionText(q);
            const id = uuidv4();
            setBlocks(b => [...b, {
              block_id: id,
              block_type: "exercise" as ContentBlockType,
              content: {
                text,
                lines: 4,
                marginNote: "",
                n: b.filter(r => r.block_type === "exercise").length + 1,
              },
            }]);
            setBankPickerOpen(false);
          }}
          onRemove={(qId) => {
            const q = bank.find(x => x.id === qId);
            if (!q) return;
            const srcText = getQuestionText(q);
            setBlocks(b => b.filter(block =>
              !(block.block_type === "exercise" && ((block.content as { text?: string })?.text ?? "") === srcText)
            ));
          }}
          onClose={() => setBankPickerOpen(false)}
        />
      )}
    </div>
  );
}

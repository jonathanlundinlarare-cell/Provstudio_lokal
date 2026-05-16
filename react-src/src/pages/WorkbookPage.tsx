/**
 * WorkbookPage — editor for workbook (häfte) documents
 * Uses a two-page spread layout.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChevronLeft, Trash2 } from "lucide-react";
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

/* ── Block library ─────────────────────────────────────────────────────────── */
const WORKBOOK_BLOCKS = [
  { type: "heading",    label: "Rubrik",        color: "#1E5F5C" },
  { type: "intro",      label: "Inledning",     color: "#1E5F5C" },
  { type: "instruction",label: "Instruktion",   color: "#2B5BA8" },
  { type: "source",     label: "Källtext",      color: "#A87F1A" },
  { type: "vocab",      label: "Begreppsruta",  color: "#7A1F2B" },
  { type: "image",      label: "Bild",          color: "#5C2A5C" },
  { type: "exercise",   label: "Övning",        color: "#2D5A3D" },
  { type: "quote",      label: "Citat",         color: "#A87F1A" },
  { type: "marginNote", label: "Marginalnot",   color: "#B7791F" },
  { type: "checklist",  label: "Checklista",    color: "#1E3A5F" },
  { type: "divider",    label: "Avdelare",      color: "#6B6459" },
  { type: "pageBreak",  label: "Sidbrytning",   color: "#6B6459" },
] as const;

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

/* ── Write lines renderer ─────────────────────────────────────────────────── */
function WriteLines({ count, accent }: { count: number; accent: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 22, borderBottom: `1px solid ${accent}44`, marginBottom: 2 }} />
      ))}
    </div>
  );
}

/* ── Block renderer ───────────────────────────────────────────────────────── */
function WorkbookBlock({
  block,
  accent,
  fontFamily,
  teacherView,
  isSelected,
  onClick,
  exerciseNum,
}: {
  block: ContentBlockRef;
  accent: string;
  fontFamily: string;
  teacherView: boolean;
  isSelected: boolean;
  onClick: () => void;
  exerciseNum?: number;
}) {
  const c = block.content as Record<string, unknown>;

  const wrapper: React.CSSProperties = {
    borderRadius: 6,
    outline: isSelected ? `2px solid #3b82f6` : "2px solid transparent",
    outlineOffset: 2,
    cursor: "pointer",
    marginBottom: 10,
    position: "relative",
  };

  switch (block.block_type) {
    case "heading":
      return (
        <div style={wrapper} onClick={onClick}>
          {c.chapter ? (
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, marginBottom: 4, fontFamily }}>
              {String(c.chapter)}
            </div>
          ) : null}
          <h1 style={{ fontSize: 32, lineHeight: 1.1, color: "#14110d", margin: 0, fontFamily, fontWeight: 700 }}>
            {String(c.text || "Ny rubrik")}
          </h1>
          {c.subtitle ? (
            <div style={{ fontSize: 14, color: "#7a7468", marginTop: 4, fontFamily }}>{String(c.subtitle)}</div>
          ) : null}
          <div style={{ height: 3, background: accent, borderRadius: 2, marginTop: 10, width: 48 }} />
        </div>
      );

    case "intro": {
      const text = String(c.text || "");
      const firstChar = text[0] ?? "";
      const rest = text.slice(1);
      return (
        <div style={wrapper} onClick={onClick}>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, fontFamily, color: "#14110d" }}>
            {firstChar && (
              <span style={{ float: "left", fontSize: 38, lineHeight: 0.9, marginRight: 6, marginTop: 4, color: accent, fontFamily }}>
                {firstChar}
              </span>
            )}
            {rest}
          </p>
        </div>
      );
    }

    case "instruction":
      return (
        <div style={{ ...wrapper, borderLeft: `3px solid ${accent}`, paddingLeft: 10 }} onClick={onClick}>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, fontFamily, color: "#3d3930", fontStyle: "italic" }}>
            {String(c.text || "")}
          </p>
        </div>
      );

    case "source":
      return (
        <div style={{ ...wrapper, background: "#FBF8F1", border: "1px solid #E7DDC4", borderRadius: 8, padding: "10px 12px" }} onClick={onClick}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7a7468", marginBottom: 6, fontFamily }}>
            {String(c.title || "KÄLLA")}
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: 0, fontStyle: "italic", color: "#14110d", fontFamily }}>
            {String(c.text || "")}
          </p>
          {c.attribution ? (
            <div style={{ fontSize: 10.5, color: "#7a7468", marginTop: 6, fontFamily }}>— {String(c.attribution)}</div>
          ) : null}
          {teacherView && c.note ? (
            <div style={{ marginTop: 8, padding: "6px 8px", background: "#FEF9C3", borderRadius: 5, fontSize: 11, color: "#78350f", fontFamily }}>
              Lärarnot: {String(c.note)}
            </div>
          ) : null}
        </div>
      );

    case "vocab":
      return (
        <div style={{ ...wrapper, border: "1.5px solid #7A1F2B44", borderRadius: 8, padding: "8px 12px" }} onClick={onClick}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A1F2B", marginBottom: 4, fontFamily }}>BEGREPP</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#14110d", marginBottom: 4, fontFamily }}>{String(c.word || "")}</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, color: "#3d3930", fontFamily }}>{String(c.definition || "")}</p>
          {(c.related as string[] | undefined)?.length ? (
            <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(c.related as string[]).map((r, i) => (
                <span key={i} style={{ fontSize: 10, background: "#7A1F2B14", color: "#7A1F2B", borderRadius: 4, padding: "1px 6px", fontFamily }}>{r}</span>
              ))}
            </div>
          ) : null}
        </div>
      );

    case "exercise": {
      const num = exerciseNum ?? (c.n as number) ?? 1;
      return (
        <div style={{ ...wrapper, paddingLeft: 36, position: "relative" }} onClick={onClick}>
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: 26, height: 26, borderRadius: "50%",
            background: accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, fontFamily,
          }}>
            {num}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily, color: "#14110d" }}>
            {String(c.text || "")}
          </p>
          <WriteLines count={(c.lines as number) ?? 4} accent={accent} />
          {teacherView && c.marginNote ? (
            <div style={{
              position: "absolute", right: -80, top: 0, width: 72,
              fontSize: 9.5, color: "#92400e", background: "#FEF9C3",
              padding: "4px 6px", borderRadius: 4, fontFamily,
            }}>
              {String(c.marginNote)}
            </div>
          ) : null}
        </div>
      );
    }

    case "quote":
      return (
        <div style={{ ...wrapper, borderLeft: `3px solid ${accent}`, paddingLeft: 12 }} onClick={onClick}>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, fontStyle: "italic", fontFamily, color: "#14110d" }}>
            "{String(c.text || "")}"
          </p>
          {c.attribution ? (
            <div style={{ fontSize: 11, color: "#7a7468", marginTop: 4, fontFamily }}>— {String(c.attribution)}</div>
          ) : null}
        </div>
      );

    case "image":
      return (
        <div style={wrapper} onClick={onClick}>
          <div style={{
            aspectRatio: "1.5", borderRadius: 6, overflow: "hidden",
            background: `linear-gradient(135deg, ${accent}22, ${accent}44)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accent, fontSize: 13, fontFamily,
          }}>
            {String(c.placeholder || "Bild")}
          </div>
          {c.caption ? (
            <div style={{ fontSize: 11, color: "#7a7468", textAlign: "center", marginTop: 4, fontFamily }}>{String(c.caption)}</div>
          ) : null}
        </div>
      );

    case "checklist":
      return (
        <div style={{ ...wrapper, border: "1px dashed #d6d0c8", borderRadius: 8, padding: "8px 12px" }} onClick={onClick}>
          {c.title ? (
            <div style={{ fontSize: 11, fontWeight: 600, color: "#14110d", marginBottom: 6, fontFamily }}>
              ✓ {String(c.title)}
            </div>
          ) : null}
          {((c.items as string[]) ?? []).map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, border: "1px solid #d6d0c8", borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "#3d3930", fontFamily }}>{item}</span>
            </div>
          ))}
        </div>
      );

    case "marginNote":
      if (!teacherView) return null;
      return (
        <div style={{ ...wrapper, background: "#FEF9C3", padding: "6px 10px", borderRadius: 6 }} onClick={onClick}>
          <span style={{ fontSize: 10.5, color: "#78350f", fontFamily }}>{String(c.text || "")}</span>
        </div>
      );

    case "divider":
      return (
        <div style={wrapper} onClick={onClick}>
          <hr style={{ border: "none", borderTop: `2px solid ${accent}44`, margin: "4px 0" }} />
        </div>
      );

    default:
      return null;
  }
}

/* ── Block inspector ──────────────────────────────────────────────────────── */
function WorkbookBlockInspector({
  block,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: ContentBlockRef;
  onEdit: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
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
      {/* Actions row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={onMoveUp} title="Flytta upp" style={actionBtnStyle}>↑</button>
        <button onClick={onMoveDown} title="Flytta ner" style={actionBtnStyle}>↓</button>
        <div style={{ flex: 1 }} />
        <button onClick={onDelete} title="Ta bort" style={{ ...actionBtnStyle, color: "#dc2626", borderColor: "#dc262640" }}>
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

const actionBtnStyle: React.CSSProperties = {
  height: 28, padding: "0 8px", borderRadius: 6,
  border: "1px solid var(--ps-rule-2)", background: "none", cursor: "pointer",
  fontFamily: "var(--ps-ui)", fontSize: 12, color: "var(--ps-ink-3)",
  display: "flex", alignItems: "center", gap: 4,
};

/* ── Page spread ──────────────────────────────────────────────────────────── */
function PageSpread({
  leftBlocks,
  rightBlocks,
  accent,
  fontFamily,
  teacherView,
  selectedId,
  onSelect,
  exerciseOffset,
}: {
  leftBlocks: ContentBlockRef[];
  rightBlocks: ContentBlockRef[];
  accent: string;
  fontFamily: string;
  teacherView: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  exerciseOffset: number;
}) {
  let exNum = exerciseOffset;
  const renderPage = (blocks: ContentBlockRef[]) => (
    <div style={{
      width: 480, minHeight: 640, background: "#fff",
      padding: "40px 36px 32px", boxSizing: "border-box",
      fontFamily,
    }}>
      {blocks.map(b => {
        if (b.block_type === "exercise") exNum++;
        return (
          <WorkbookBlock
            key={b.block_id}
            block={b}
            accent={accent}
            fontFamily={fontFamily}
            teacherView={teacherView}
            isSelected={selectedId === b.block_id}
            onClick={() => onSelect(b.block_id)}
            exerciseNum={b.block_type === "exercise" ? exNum : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <div style={{
      display: "flex", gap: 0,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
      borderRadius: 4, overflow: "hidden",
      marginBottom: 32,
    }}>
      {renderPage(leftBlocks)}
      <div style={{ width: 1, background: "#e0dbd4" }} />
      {renderPage(rightBlocks)}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function WorkbookPage({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const [title, setTitle]       = useState("");
  const [design, setDesign]     = useState({ accent: "#1E5F5C", font: "serif", showMarginNotes: true, twoColumn: true });
  const [blocks, setBlocks]     = useState<ContentBlockRef[]>([]);
  const [teacherView, setTeacherView] = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [rightTab, setRightTab]       = useState<"block" | "design" | "doc">("block");
  const [loading, setLoading]         = useState(true);
  const [saveState, setSaveState]     = useState<"idle" | "saving" | "saved">("idle");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bank, setBank]               = useState<Question[]>([]);
  const [subtitle, setSubtitle]       = useState("");
  const [course, setCourse]           = useState("");

  /* ── Load ── */
  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { toast.error("Kunde inte ladda dokumentet"); onBack(); return; }
    setTitle(doc.title);
    setSubtitle(doc.design_settings?.subtitle ?? "");
    setCourse(doc.design_settings?.course ?? "");
    // Load design settings from doc
    const ds = doc.design_settings;
    if (ds) {
      setDesign({
        accent: ds.primaryColor ?? "#1E5F5C",
        font: ds.fontFamily === "humanist" ? "humanist" : "serif",
        showMarginNotes: true,
        twoColumn: true,
      });
    }
    const orderBlocks = (doc.question_order ?? []).filter(isContentBlockRef) as ContentBlockRef[];
    setBlocks(orderBlocks);
    setBank(questionBank.list());
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  const lastSaved = useRef("");
  useEffect(() => {
    if (loading) return;
    const payload = JSON.stringify({ title, design, blocks, subtitle, course });
    if (payload === lastSaved.current) return;
    setSaveState("saving");
    const h = setTimeout(() => {
      documents.update(documentId, {
        title,
        question_order: blocks,
        design_settings: {
          primaryColor: design.accent,
          fontFamily: design.font as "serif" | "humanist",
          subtitle,
          course,
        } as unknown as DesignSettings,
      });
      scheduleSave();
      lastSaved.current = payload;
      setSaveState("saved");
    }, 1500);
    return () => clearTimeout(h);
  }, [title, design, blocks, subtitle, course, loading, documentId]);

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

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks(b => {
      const idx = b.findIndex(r => r.block_id === id);
      if (idx < 0) return b;
      const next = [...b];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return b;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

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
  const totalBlocks = blocks.filter(b => b.block_type !== "pageBreak" && b.block_type !== "divider").length;

  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
      Laddar…
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", height: "100vh", overflow: "hidden", fontFamily: "var(--ps-ui)" }}>

      {/* ── LEFT panel ── */}
      <aside style={{ borderRight: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Back + title */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ps-rule)", flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-3)", fontSize: 12, fontFamily: "var(--ps-ui)", padding: 0, marginBottom: 8 }}
          >
            <ChevronLeft size={12} /> Mina dokument
          </button>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ps-ink-4)", marginBottom: 3, fontFamily: "var(--ps-ui)" }}>Arbetshäfte</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title || "Namnlöst häfte"}
          </div>
        </div>

        {/* Block library */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ps-ink-4)", marginBottom: 8, paddingLeft: 2, fontFamily: "var(--ps-ui)" }}>
            Block
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 16 }}>
            {WORKBOOK_BLOCKS.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => addBlock(type as ContentBlockType)}
                style={{
                  padding: "7px 6px", borderRadius: 7,
                  border: `1px solid ${color}33`,
                  background: `${color}0d`,
                  cursor: "pointer", textAlign: "center",
                  fontFamily: "var(--ps-ui)", fontSize: 11, fontWeight: 500,
                  color: color,
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${color}0d`; }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Bank reuse */}
          <div style={{ border: "1px solid var(--ps-rule-2)", borderRadius: 8, padding: "10px 10px", marginTop: 4 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ps-ink-4)", marginBottom: 8, fontFamily: "var(--ps-ui)" }}>
              Återbruk från frågebanken
            </div>
            <button
              onClick={() => setBankPickerOpen(true)}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 7,
                border: "1px dashed var(--ps-rule-2)", background: "none",
                cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12, color: "var(--ps-ink-3)",
              }}
            >
              Öppna frågebanken
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
              { id: false, label: "Elevversion" },
              { id: true,  label: "Lärarversion" },
            ]).map(m => (
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
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 11, color: "var(--ps-ink-3)", minWidth: 80 }}>
            {saveState === "saving" ? "Sparar…" : saveState === "saved" ? "✓ Sparat" : ""} {totalBlocks} block
          </span>

          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => window.print()}>
            Skriv ut
          </button>
        </div>

        {/* Spread canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {spreads.map(([left, right], spreadIdx) => {
            // Calculate exercise offset for this spread
            let offset = 0;
            for (let s = 0; s < spreadIdx; s++) {
              offset += spreads[s][0].filter(b => b.block_type === "exercise").length;
              offset += spreads[s][1].filter(b => b.block_type === "exercise").length;
            }
            return (
              <PageSpread
                key={spreadIdx}
                leftBlocks={left}
                rightBlocks={right}
                accent={design.accent}
                fontFamily={fontFamily}
                teacherView={teacherView}
                selectedId={selectedId}
                onSelect={id => { setSelectedId(id); setRightTab("block"); }}
                exerciseOffset={offset}
              />
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
            { id: "block"  as const, label: "Block" },
            { id: "design" as const, label: "Layout" },
            { id: "doc"    as const, label: "Häfte" },
          ]).map(t => (
            <button key={t.id} onClick={() => setRightTab(t.id)} style={{
              flex: 1, height: 30, padding: "0 6px", borderRadius: 6,
              border: "1px solid",
              background: rightTab === t.id ? "var(--ps-paper)" : "transparent",
              color: rightTab === t.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
              borderColor: rightTab === t.id ? "var(--ps-rule)" : "transparent",
              fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: rightTab === t.id ? 500 : 400,
              cursor: "pointer",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 32px" }}>
          {/* Block tab */}
          {rightTab === "block" && (
            selectedBlock ? (
              <WorkbookBlockInspector
                block={selectedBlock}
                onEdit={(patch) => editBlock(selectedBlock.block_id, patch)}
                onDelete={() => deleteBlock(selectedBlock.block_id)}
                onMoveUp={() => moveBlock(selectedBlock.block_id, -1)}
                onMoveDown={() => moveBlock(selectedBlock.block_id, 1)}
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
                    onClick={() => setDesign(d => ({ ...d, accent: color }))}
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
                    onClick={() => setDesign(d => ({ ...d, font: f.id }))}
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
                  onChange={e => setDesign(d => ({ ...d, twoColumn: e.target.checked }))}
                />
                <span style={{ fontSize: 12.5, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>Två kolumner</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={design.showMarginNotes}
                  onChange={e => setDesign(d => ({ ...d, showMarginNotes: e.target.checked }))}
                />
                <span style={{ fontSize: 12.5, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>Visa marginalnoter (lärarversion)</span>
              </label>
            </div>
          )}

          {/* Doc tab */}
          {rightTab === "doc" && (
            <div>
              {[
                { label: "Titel", value: title, set: setTitle },
                { label: "Undertitel", value: subtitle, set: setSubtitle },
                { label: "Kurs", value: course, set: setCourse },
              ].map(({ label, value, set }) => (
                <label key={label} style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
                    {label}
                  </span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => set(e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--ps-rule-2)", fontFamily: "var(--ps-ui)", fontSize: 12.5, background: "var(--ps-bg-soft)" }}
                  />
                </label>
              ))}
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
            const text = ((q.content as { text?: string })?.text ?? "").replace(/<[^>]+>/g, "");
            const id = uuidv4();
            setBlocks(b => [...b, {
              block_id: id,
              block_type: "exercise" as ContentBlockType,
              content: {
                text: text,
                lines: 4,
                marginNote: "",
                n: b.filter(r => r.block_type === "exercise").length + 1,
              },
            }]);
            setBankPickerOpen(false);
          }}
          onRemove={() => { /* not used */ }}
          onClose={() => setBankPickerOpen(false)}
        />
      )}
    </div>
  );
}

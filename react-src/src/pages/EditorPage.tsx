/**
 * Editor v2 — Dokumentplattform
 * Route: /editor/$documentId
 *
 * Stöder doc_type: test | workbook | homework
 * Hanterar frågor (TestQuestionRef) + content-block (ContentBlockRef)
 * i question_order-arrayen (diskriminerad union).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { documents, questionBank, scheduleSave } from "@/lib/local-db";
import { toast } from "sonner";
import {
  CheckSquare,
  ChevronLeft,
  Download,
  Edit2,
  Eye,
  Flag,
  Grid,
  GripVertical,
  Layers,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import {
  CONTENT_BLOCK_TYPE_LABELS,
  DEFAULT_DESIGN,
  DOCUMENT_TYPE_LABELS,
  QUESTION_TYPE_LABELS,
  applyOverrides,
  getQuestionLines,
  isContentBlockRef,
  isQuestionRef,
  questionSupportsLines,
  type BlockLayout,
  type ContentBlockContent,
  type ContentBlockRef,
  type ContentBlockType,
  type DesignSettings,
  type DocumentType,
  type Question,
  type QuestionOrderItem,
  type QuestionType,
  type TestQuestionRef,
} from "@/lib/test-types";
import { PrintableTest, type PrintableItem } from "@/components/PrintableTest";
import { QuestionEditorModal } from "@/components/editor/QuestionEditorModal";
import { FreeformCanvas, FreeformItemLabel } from "@/components/editor/FreeformCanvas";

/* ─── Route ────────────────────────────────────────────────────────────── */


/* ─── Constants ─────────────────────────────────────────────────────────── */


const LAYOUT_NAMES: Record<string, string> = {
  classic:   "Klassisk",
  editorial: "Editorial",
  minimal:   "Minimal",
  exam:      "Officiellt",
};

/* ── Design presets ──────────────────────────────────────────────────────── */
const DESIGN_PRESETS: Array<{ id: string; name: string; accent: string; design: Partial<import("@/lib/test-types").DesignSettings> }> = [
  {
    id: "skolverket",
    name: "Skolverket",
    accent: "#1E5F5C",
    design: { headingFont: "Arial, sans-serif", bodyFont: "Arial, sans-serif", titleWeight: "700", titleTransform: "none", cardStyle: "flat", paperStyle: "white", numStyle: "plain", layout: "classic" },
  },
  {
    id: "editorial",
    name: "Editorial",
    accent: "#1C1B18",
    design: { headingFont: "Newsreader, serif", bodyFont: "Inter, sans-serif", titleWeight: "700", titleTransform: "none", cardStyle: "framed", paperStyle: "cream", numStyle: "display", layout: "editorial" },
  },
  {
    id: "akademiskt",
    name: "Akademiskt",
    accent: "#1E3A5F",
    design: { headingFont: "Lora, serif", bodyFont: "Lora, serif", titleWeight: "600", titleTransform: "none", cardStyle: "flat", paperStyle: "white", numStyle: "plain", layout: "exam" },
  },
  {
    id: "modern",
    name: "Modern",
    accent: "#4F46E5",
    design: { headingFont: "DM Sans, sans-serif", bodyFont: "DM Sans, sans-serif", titleWeight: "700", titleTransform: "uppercase", cardStyle: "banded", paperStyle: "white", numStyle: "chip", layout: "minimal" },
  },
  {
    id: "matte",
    name: "Mattehäfte",
    accent: "#1E5F5C",
    design: { headingFont: "Inter, sans-serif", bodyFont: "Inter, sans-serif", titleWeight: "600", titleTransform: "none", cardStyle: "gutter", paperStyle: "grid", numStyle: "plain", layout: "classic" },
  },
  {
    id: "vintage",
    name: "Vintage",
    accent: "#7A3B1E",
    design: { headingFont: "Playfair Display, serif", bodyFont: "Source Serif 4, serif", titleWeight: "700", titleItalic: true, titleTransform: "none", cardStyle: "indented", paperStyle: "warm", numStyle: "plain", numbering: "roman", layout: "editorial" },
  },
];

/* ── Font options ────────────────────────────────────────────────────────── */
const FONT_OPTIONS = [
  // Serifer
  { id: "Newsreader, serif",          name: "Newsreader",         category: "serif" },
  { id: "Lora, serif",                name: "Lora",               category: "serif" },
  { id: "Playfair Display, serif",    name: "Playfair Display",   category: "serif" },
  { id: "Source Serif 4, serif",      name: "Source Serif 4",     category: "serif" },
  { id: "Libre Baskerville, serif",   name: "Libre Baskerville",  category: "serif" },
  { id: "EB Garamond, serif",         name: "EB Garamond",        category: "serif" },
  { id: "Crimson Pro, serif",         name: "Crimson Pro",        category: "serif" },
  { id: "Spectral, serif",            name: "Spectral",           category: "serif" },
  { id: "Merriweather, serif",        name: "Merriweather",       category: "serif" },
  // Sans-serifer
  { id: "Inter, sans-serif",          name: "Inter",              category: "sans" },
  { id: "DM Sans, sans-serif",        name: "DM Sans",            category: "sans" },
  { id: "Nunito, sans-serif",         name: "Nunito",             category: "sans" },
  { id: "Arial, sans-serif",          name: "Arial",              category: "sans" },
];

/* ── Extended accent palette ─────────────────────────────────────────────── */
const ACCENT_PALETTE_FULL = [
  { name: "Skog",       color: "#1E5F5C" },
  { name: "Bordeaux",   color: "#7A1F2B" },
  { name: "Marin",      color: "#1E3A5F" },
  { name: "Senap",      color: "#A87F1A" },
  { name: "Plommon",    color: "#5C2A5C" },
  { name: "Grafit",     color: "#2C2C2C" },
  { name: "Indigo",     color: "#4F46E5" },
  { name: "Terrakotta", color: "#C05621" },
  { name: "Olivgrön",   color: "#4A5E1E" },
  { name: "Stålblå",    color: "#2563A8" },
  { name: "Rosenträ",   color: "#7A3B3B" },
  { name: "Ceder",      color: "#2D5F4A" },
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

/* ── Paper styles ────────────────────────────────────────────────────────── */
const PAPER_STYLE_NAMES: Record<string, string> = {
  white:  "Vit",
  cream:  "Gräddvit",
  warm:   "Varm",
  linen:  "Lin",
  dot:    "Prickar",
  grid:   "Rutnät",
  ruled:  "Linjerat",
  graph:  "Millimeter",
};

/* ── Card style names ────────────────────────────────────────────────────── */
const CARD_STYLE_NAMES: Record<string, string> = {
  flat:      "Platt",
  framed:    "Ram",
  banded:    "Band",
  gutter:    "Marginal",
  indented:  "Indragning",
  stamped:   "Stämpel",
};

/* ── Page frame names ────────────────────────────────────────────────────── */
const PAGE_FRAME_NAMES: Record<string, string> = {
  none:    "Ingen",
  thin:    "Tunn",
  thick:   "Tjock",
  double:  "Dubbel",
  shadow:  "Skugga",
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

/* Question types available per doc type */
const Q_TYPES_BY_DOC: Record<DocumentType, QuestionType[]> = {
  test:     ["open","short_answer","numeric","multiple_choice","true_false","cloze","matching","ranking","table","image","drawing","source_critique","essay","group","definition","diagram_label","two_column","formula"],
  workbook: ["open","short_answer","numeric","multiple_choice","true_false","cloze","matching","ranking","table","image","drawing","source_critique","essay","definition","two_column"],
  homework: ["open","short_answer","numeric","multiple_choice","true_false","cloze","essay"],
};

/* Content block types available per doc type */
const B_TYPES_BY_DOC: Record<DocumentType, ContentBlockType[]> = {
  test:     ["heading","instruction","source","image","pageBreak","divider"],
  workbook: ["intro","instruction","source","vocab","quote","callout","image","checklist","marginNote","heading","pageBreak","divider"],
  homework: ["intro","instruction","vocab","checklist","heading","divider"],
};

/* Default content for new content blocks */
function defaultBlockContent(blockType: ContentBlockType): ContentBlockContent {
  switch (blockType) {
    case "heading":     return { title: "Ny rubrik" };
    case "intro":       return { text: "" };
    case "instruction": return { text: "" };
    case "source":      return { title: "", text: "", attribution: "" };
    case "vocab":       return { word: "", definition: "" };
    case "quote":       return { text: "" };
    case "callout":     return { text: "" };
    case "image":       return { imageUrl: "" };
    case "checklist":   return { items: [""] };
    case "marginNote":  return { text: "" };
    case "pageBreak":   return {};
    case "divider":     return {};
    default:            return {};
  }
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function EditorPage({ documentId, onBack }: { documentId: string; onBack: () => void }) {

  /* State */
  const [title, setTitle]         = useState("");
  const [design, setDesign]       = useState<DesignSettings>(DEFAULT_DESIGN);
  const [order, setOrder]         = useState<QuestionOrderItem[]>([]);
  const [bank, setBank]           = useState<Question[]>([]);
  const [docType, setDocType]     = useState<DocumentType>("test");
  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved">("idle");
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [rightTab, setRightTab]       = useState<"layout"|"block"|"doc">("layout");
  const [centerMode, setCenterMode]   = useState<"edit"|"preview"|"answer">("edit");
  const [creatingType, setCreatingType] = useState<QuestionType | null>(null);
  const [editingQ, setEditingQ]       = useState<Question | null>(null);
  const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);
  const [addMode, setAddMode]         = useState<"questions"|"blocks">("questions");
  const [isFreeform, setIsFreeform]   = useState(false);
  const [showGrid, setShowGrid]       = useState(true);

  const setD = (patch: Partial<DesignSettings>) => setDesign(d => ({ ...d, ...patch }));

  /* ── Load ── */
  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { toast.error("Kunde inte ladda dokumentet"); onBack(); return; }
    setTitle(doc.title);
    setDesign({ ...DEFAULT_DESIGN, ...(doc.design_settings ?? {}) });
    setOrder(doc.question_order ?? []);
    setDocType(doc.doc_type ?? "test");
    setBank(questionBank.list());
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  const lastSaved = useRef("");
  useEffect(() => {
    if (loading) return;
    const payload = JSON.stringify({ title, design, order, docType });
    if (payload === lastSaved.current) return;
    setSaveState("saving");
    const h = setTimeout(() => {
      documents.update(documentId, { title, design_settings: design, question_order: order, doc_type: docType });
      scheduleSave();
      lastSaved.current = payload;
      setSaveState("saved");
    }, 1500);
    return () => clearTimeout(h);
  }, [title, design, order, docType, loading, documentId]);

  /* ── Derived ── */
  const bankMap = useMemo(() => new Map(bank.map(q => [q.id, q])), [bank]);

  /* Build PrintableTest items — questions + content blocks in order */
  const printItems = useMemo<PrintableItem[]>(() => {
    let lastSection: string | undefined;
    const result: PrintableItem[] = [];
    for (const ref of order) {
      if (isContentBlockRef(ref)) {
        result.push({ kind: "block", block_id: ref.block_id, block_type: ref.block_type, content: ref.content as Record<string, unknown> });
        continue;
      }
      if (isQuestionRef(ref)) {
        if (ref.question_id === "__section__") continue;
        const q = bankMap.get(ref.question_id);
        if (!q) continue;
        const sectionStart = !ref.group && ref.section_label && ref.section_label !== lastSection
          ? ref.section_label : undefined;
        if (sectionStart) lastSection = sectionStart;
        result.push({ kind: "question", question: applyOverrides(q, ref), group: ref.group, sectionStart });
      }
    }
    return result;
  }, [order, bankMap]);

  const totalPts = printItems.reduce((s, it) => {
    if ("kind" in it && it.kind === "block") return s;
    return s + (parseFloat((it as import("@/components/PrintableTest").PrintableQuestionItem).question.points ?? "0") || 0);
  }, 0);
  const qCount   = printItems.length;

  /* Selected item details */
  const selectedQ = selectedId ? (bankMap.get(selectedId) ?? null) : null;
  const selectedBlockRef = selectedId
    ? (order.find(it => isContentBlockRef(it) && it.block_id === selectedId) as ContentBlockRef | undefined) ?? null
    : null;

  /* ── Mutations ── */
  const removeItem = (idx: number) => setOrder(o => o.filter((_, i) => i !== idx));

  const reorderItems = (newOrder: QuestionOrderItem[]) => setOrder(newOrder);

  const addBlock = (blockType: ContentBlockType) => {
    const ref: ContentBlockRef = {
      block_id:   crypto.randomUUID(),
      block_type: blockType,
      content:    defaultBlockContent(blockType),
    };
    setOrder(o => [...o, ref]);
    setSelectedId(ref.block_id);
    setRightTab("block");
  };

  const updateBlockContent = (blockId: string, content: ContentBlockContent) => {
    setOrder(o => o.map(it =>
      isContentBlockRef(it) && it.block_id === blockId ? { ...it, content } : it
    ));
  };

  /** Update freeform layout for any item (question or content block). */
  const handleLayoutChange = (itemId: string, next: BlockLayout) => {
    setOrder(o => o.map(it => {
      if (isQuestionRef(it) && it.question_id === itemId) return { ...it, layout: next };
      if (isContentBlockRef(it) && it.block_id === itemId) return { ...it, layout: next };
      return it;
    }));
  };

  /** Toggle freeform mode. When entering, assign default positions to items without layout. */
  const toggleFreeform = () => {
    if (!isFreeform) {
      // Assign auto-positions to items that don't have layout yet
      let autoY = 15;
      setOrder(o => o.map((item, idx) => {
        if (isQuestionRef(item) && item.question_id !== "__section__" && !item.layout) {
          const l: BlockLayout = { x: 15, y: autoY, w: 180, h: 40 };
          autoY += 44;
          return { ...item, layout: l };
        }
        if (isContentBlockRef(item) && !item.layout) {
          const h = (item.block_type === "pageBreak" || item.block_type === "divider") ? 8 : 40;
          const l: BlockLayout = { x: 15, y: autoY, w: 180, h };
          autoY += h + 4;
          return { ...item, layout: l };
        }
        return item;
      }));
    }
    setIsFreeform(f => !f);
  };

  /** Remove all layout data (revert to linear mode). */
  const clearLayouts = () => {
    setOrder(o => o.map(it => {
      if (isQuestionRef(it)) { const { layout: _l, ...rest } = it; return rest as TestQuestionRef; }
      if (isContentBlockRef(it)) { const { layout: _l, ...rest } = it; return rest as ContentBlockRef; }
      return it;
    }));
    setIsFreeform(false);
  };

  const refreshBank = useCallback(() => {
    setBank(questionBank.list());
  }, []);

  const handleDownload = async () => {
    const el = document.getElementById("printable-root");
    if (!el) return;
    toast.info("Skapar PDF…");
    const html2pdf = (await import("html2pdf.js")).default as unknown as (opts?: unknown) => {
      from: (el: HTMLElement) => { set: (o: unknown) => { save: () => Promise<void> } }
    };
    await html2pdf().from(el).set({
      margin: 0, filename: `${title || "dokument"}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).save();
  };

  /* ── Loading state ── */
  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
      Laddar…
    </div>
  );

  /* ── Render ── */
  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", height: "100vh", overflow: "hidden", fontFamily: "var(--ps-ui)" }}>

      {/* ── LEFT: Outline + Block library ── */}
      <aside style={{ borderRight: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--ps-rule)", flexShrink: 0 }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-3)", fontSize: 12.5, fontFamily: "var(--ps-ui)", padding: 0, marginBottom: 8 }}
          >
            <ChevronLeft size={13} /> Mina dokument
          </button>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 15, fontWeight: 600, fontFamily: "var(--ps-ui)", color: "var(--ps-ink)", padding: 0, letterSpacing: "-0.01em" }}
            placeholder="Dokumentets titel"
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>
              {qCount} frågor{totalPts > 0 ? ` · ${totalPts} p` : ""}
            </div>
            <div style={{ flex: 1 }} />
            {/* Doc type toggle */}
            <div style={{ display: "flex", padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8, gap: 1 }}>
              {(["test", "workbook", "homework"] as DocumentType[]).map(dt => (
                <button key={dt} onClick={() => setDocType(dt)} style={{
                  height: 22, padding: "0 7px", borderRadius: 6, border: "none",
                  background: docType === dt ? "var(--ps-accent)" : "transparent",
                  color: docType === dt ? "white" : "var(--ps-ink-3)",
                  fontFamily: "var(--ps-ui)", fontSize: 10.5, fontWeight: 500,
                  cursor: "pointer",
                }}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Outline */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 10px" }}>
          <OutlineList
            order={order}
            bankMap={bankMap}
            selectedId={selectedId}
            onSelect={(id, tab) => { setSelectedId(id); setRightTab(tab ?? "block"); }}
            onDelete={removeItem}
            onReorder={reorderItems}
          />
        </div>

        {/* Block library */}
        <div style={{ borderTop: "1px solid var(--ps-rule)", flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", padding: "8px 10px 0" }}>
            <button
              onClick={() => setAddMode("questions")}
              style={{ flex: 1, height: 28, borderRadius: "6px 6px 0 0", border: "1px solid", borderBottom: "none", fontFamily: "var(--ps-ui)", fontSize: 11.5, cursor: "pointer",
                background: addMode === "questions" ? "var(--ps-paper)" : "transparent",
                color: addMode === "questions" ? "var(--ps-ink)" : "var(--ps-ink-3)",
                borderColor: addMode === "questions" ? "var(--ps-rule)" : "transparent",
                fontWeight: addMode === "questions" ? 500 : 400,
              }}
            >
              Ny fråga
            </button>
            <button
              onClick={() => setAddMode("blocks")}
              style={{ flex: 1, height: 28, borderRadius: "6px 6px 0 0", border: "1px solid", borderBottom: "none", fontFamily: "var(--ps-ui)", fontSize: 11.5, cursor: "pointer",
                background: addMode === "blocks" ? "var(--ps-paper)" : "transparent",
                color: addMode === "blocks" ? "var(--ps-ink)" : "var(--ps-ink-3)",
                borderColor: addMode === "blocks" ? "var(--ps-rule)" : "transparent",
                fontWeight: addMode === "blocks" ? 500 : 400,
              }}
            >
              <Layers size={11} style={{ display: "inline", marginRight: 3 }} />
              Block
            </button>
          </div>
          <div style={{ background: "var(--ps-paper)", border: "1px solid var(--ps-rule)", borderTop: "none", padding: "10px 10px 12px" }}>
            {addMode === "questions" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {Q_TYPES_BY_DOC[docType].map(t => (
                  <AddBtn key={t} label={QUESTION_TYPE_LABELS[t]} onClick={() => setCreatingType(t)} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 3 }}>
                {B_TYPES_BY_DOC[docType].map(t => (
                  <AddBtn key={t} label={CONTENT_BLOCK_TYPE_LABELS[t]} accent onClick={() => addBlock(t)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── CENTER: Canvas ── */}
      <main style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--ps-bg-soft)" }}>
        {/* Topbar */}
        <div style={{ background: "var(--ps-bg)", borderBottom: "1px solid var(--ps-rule)", padding: "9px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8, gap: 1 }}>
            {([
              { id: "edit"    as const, label: "Redigera",    icon: <Edit2 size={11} /> },
              { id: "preview" as const, label: "Förhandsgr.", icon: <Eye size={11} /> },
              { id: "answer"  as const, label: "Facit",       icon: <CheckSquare size={11} /> },
            ]).map(m => (
              <button key={m.id} onClick={() => setCenterMode(m.id)} style={{
                height: 27, padding: "0 10px", borderRadius: 6, border: "none",
                background: centerMode === m.id ? "var(--ps-paper)" : "transparent",
                color: centerMode === m.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
                fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: centerMode === m.id ? 500 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                boxShadow: centerMode === m.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}>{m.icon} {m.label}</button>
            ))}
          </div>
          {/* Freeform toggle — only in edit mode */}
          {centerMode === "edit" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
              <div style={{ width: 1, height: 18, background: "var(--ps-rule)" }} />
              <button
                onClick={toggleFreeform}
                title={isFreeform ? "Växla till linjärt läge" : "Växla till freeform-läge"}
                style={{
                  height: 27, padding: "0 10px", borderRadius: 6, border: "1px solid",
                  borderColor: isFreeform ? "var(--ps-accent)" : "var(--ps-rule-2)",
                  background: isFreeform ? "var(--ps-accent)14" : "transparent",
                  color: isFreeform ? "var(--ps-accent)" : "var(--ps-ink-3)",
                  fontFamily: "var(--ps-ui)", fontSize: 11.5, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, fontWeight: isFreeform ? 500 : 400,
                }}
              >
                <Layers size={11} /> {isFreeform ? "Freeform" : "Linjärt"}
              </button>
              {isFreeform && (
                <>
                  <button
                    onClick={() => setShowGrid(g => !g)}
                    title="Visa/dölj rutnät"
                    style={{ height: 27, width: 27, borderRadius: 6, border: "1px solid", borderColor: showGrid ? "var(--ps-accent)" : "var(--ps-rule-2)", background: showGrid ? "var(--ps-accent)14" : "transparent", color: showGrid ? "var(--ps-accent)" : "var(--ps-ink-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Grid size={12} />
                  </button>
                  <button
                    onClick={clearLayouts}
                    title="Återställ till linjärt läge och ta bort alla positioner"
                    style={{ height: 27, padding: "0 8px", borderRadius: 6, border: "1px solid var(--ps-rule-2)", background: "transparent", color: "var(--ps-ink-4)", fontFamily: "var(--ps-ui)", fontSize: 10.5, cursor: "pointer" }}
                  >
                    Återställ
                  </button>
                </>
              )}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)", minWidth: 56 }}>
            {saveState === "saving" ? "Sparar…" : saveState === "saved" ? "✓ Sparat" : ""}
          </span>
          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => window.print()}>
            <Printer size={12} /> Skriv ut
          </button>
          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={handleDownload}>
            <Download size={12} /> PDF
          </button>
        </div>

        {/* Paper */}
        <div style={{ flex: 1, overflow: "auto", padding: isFreeform && centerMode === "edit" ? "0" : "28px 32px" }}>
          <div id="printable-root">
            {/* ── Freeform edit mode ── */}
            {centerMode === "edit" && isFreeform && (
              <FreeformCanvas
                order={order}
                bankMap={bankMap}
                selectedId={selectedId}
                showGrid={showGrid}
                onSelect={(id) => { setSelectedId(id); if (id) setRightTab("block"); }}
                onLayoutChange={handleLayoutChange}
                renderItemContent={(item, q) => (
                  <FreeformItemLabel item={item} q={q} />
                )}
              />
            )}

            {/* ── Linear edit mode ── */}
            {centerMode === "edit" && !isFreeform && (
              <InlineQuestionCanvas
                order={order}
                bankMap={bankMap}
                design={design}
                selectedId={selectedId}
                onSelect={(id) => { setSelectedId(id); setRightTab("block"); }}
                onEdit={(q) => setEditingQ(q)}
                onDelete={(idx) => removeItem(idx)}
              />
            )}

            {/* ── Preview / Facit mode ── */}
            {(centerMode === "preview" || centerMode === "answer") && (
              <PrintableTest
                title={title}
                subtitle={design.subtitle ?? ""}
                design={design}
                items={printItems}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT: Inspector ── */}
      <aside style={{ borderLeft: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 12px 0", gap: 3, flexShrink: 0 }}>
          {([
            { id: "layout" as const, label: "Design" },
            { id: "block"  as const, label: "Block" },
            { id: "doc"    as const, label: "Dokument" },
          ]).map(t => (
            <button key={t.id} onClick={() => setRightTab(t.id)} style={{
              flex: 1, height: 30, padding: "0 6px", borderRadius: 6,
              border: "1px solid",
              background: rightTab === t.id ? "var(--ps-paper)" : "transparent",
              color: rightTab === t.id ? "var(--ps-ink)" : "var(--ps-ink-3)",
              borderColor: rightTab === t.id ? "var(--ps-rule)" : "transparent",
              fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: rightTab === t.id ? 500 : 400,
              cursor: "pointer",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "14px 14px 32px" }}>
          {rightTab === "layout" && <LayoutPanel design={design} setD={setD} />}
          {rightTab === "block" && (
            selectedQ
              ? <QuestionInspector q={selectedQ} onEdit={() => setEditingQ(selectedQ)} onRefresh={refreshBank} />
              : selectedBlockRef
                ? <BlockInspector ref_={selectedBlockRef} onUpdate={(content) => updateBlockContent(selectedBlockRef.block_id, content)} />
                : <div style={{ color: "var(--ps-ink-4)", fontSize: 12.5, padding: "40px 0", textAlign: "center" }}>
                    Klicka på ett element i listan eller canvas.
                  </div>
          )}
          {rightTab === "doc" && <DocPanel design={design} setD={setD} title={title} setTitle={setTitle} />}
        </div>
      </aside>

      {/* ── Modals ── */}
      {creatingType && (
        <QuestionEditorModal
          mode="create"
          type={creatingType}
          defaultLines={design.defaultLines ?? 4}
          onClose={() => setCreatingType(null)}
          onSaved={async (newId) => {
            await refreshBank();
            if (newId) setOrder(o => [...o, { question_id: newId } as TestQuestionRef]);
            setCreatingType(null);
          }}
        />
      )}
      {editingQ && (
        <QuestionEditorModal
          mode="edit"
          question={editingQ}
          defaultLines={design.defaultLines ?? 4}
          onClose={() => setEditingQ(null)}
          onSaved={async () => { await refreshBank(); setEditingQ(null); }}
        />
      )}
      {editingBlockIdx !== null && (
        <ContentBlockEditorModal
          blockRef={order[editingBlockIdx] as ContentBlockRef}
          onClose={() => setEditingBlockIdx(null)}
          onSave={(content) => {
            const ref = order[editingBlockIdx] as ContentBlockRef;
            updateBlockContent(ref.block_id, content);
            setEditingBlockIdx(null);
          }}
        />
      )}

      <style>{`
        .del-btn { opacity: 0 !important; }
        div:hover > .del-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

/* ─── AddBtn ─────────────────────────────────────────────────────────────── */

function AddBtn({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "5px 3px", borderRadius: 5, border: "1px dashed var(--ps-rule-2)", background: "none", cursor: "pointer", color: accent ? "var(--ps-ink-2)" : "var(--ps-ink-3)", fontSize: 10.5, fontFamily: "var(--ps-ui)", display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ps-accent)"; e.currentTarget.style.color = "var(--ps-accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ps-rule-2)"; e.currentTarget.style.color = accent ? "var(--ps-ink-2)" : "var(--ps-ink-3)"; }}
    >
      <Plus size={9} /> {label}
    </button>
  );
}

/* ─── OutlineList (with dnd-kit sortable) ───────────────────────────────── */

interface OutlineListProps {
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  selectedId: string | null;
  onSelect: (id: string, tab?: "block" | "layout") => void;
  onDelete: (idx: number) => void;
  onReorder: (newOrder: QuestionOrderItem[]) => void;
}

function OutlineList({ order, bankMap, selectedId, onSelect, onDelete, onReorder }: OutlineListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const dragIds = order.map((item, idx) => {
    if (isQuestionRef(item)) return `q-${item.question_id}-${idx}`;
    if (isContentBlockRef(item)) return `b-${item.block_id}-${idx}`;
    return `item-${idx}`;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = dragIds.indexOf(active.id as string);
    const newIdx = dragIds.indexOf(over.id as string);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(order, oldIdx, newIdx));
  };

  let qNum = 0;
  let subNum = 0;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={dragIds} strategy={verticalListSortingStrategy}>
        {order.length === 0 && (
          <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--ps-ink-4)", fontSize: 12.5 }}>
            Inga element ännu.<br />
            <span style={{ fontSize: 11 }}>Använd panelen nedan för att lägga till.</span>
          </div>
        )}
        {order.map((item, idx) => {
          const dragId = dragIds[idx];

          /* Section separator */
          if (isQuestionRef(item) && item.question_id === "__section__") {
            return (
              <div key={dragId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 4px 4px", fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <Flag size={10} style={{ color: "var(--ps-accent)", flexShrink: 0 }} />
                <span>{item.section_label ?? "Del"}</span>
                <div style={{ flex: 1, height: 1, background: "var(--ps-rule)" }} />
              </div>
            );
          }

          if (isQuestionRef(item)) {
            if (item.group) subNum++;
            else { qNum++; subNum = 0; }
            const label = item.group ? `${String.fromCharCode(96 + subNum)})` : `${qNum}.`;
            const q = bankMap.get(item.question_id);
            const text = q ? ((q.content as { text?: string })?.text ?? "(Tom fråga)") : "— fråga saknas —";
            const typeLabel = q ? QUESTION_TYPE_LABELS[q.type] : "";
            const isSelected = selectedId === item.question_id;

            return (
              <SortableOutlineItem key={dragId} id={dragId} isSelected={isSelected}
                indent={item.group ? 14 : 0}
                onClick={() => onSelect(item.question_id, "block")}
                onDelete={() => onDelete(idx)}
              >
                <span style={{ flexShrink: 0, width: 18, textAlign: "right", fontSize: 11, fontWeight: 500, color: isSelected ? "var(--ps-accent)" : "var(--ps-ink-4)", paddingTop: 1, fontFeatureSettings: '"tnum"' }}>{label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ps-ink)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{text}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                    {typeLabel && <span style={{ fontSize: 10, background: "var(--ps-accent)14", color: "var(--ps-accent)", borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>{typeLabel}</span>}
                    {q?.points && <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)" }}>{q.points} p</span>}
                  </div>
                </div>
              </SortableOutlineItem>
            );
          }

          if (isContentBlockRef(item)) {
            const blockLabel = CONTENT_BLOCK_TYPE_LABELS[item.block_type];
            const preview = (item.content as { text?: string; title?: string })?.text
              ?? (item.content as { title?: string })?.title
              ?? "";
            const isSelected = selectedId === item.block_id;

            return (
              <SortableOutlineItem key={dragId} id={dragId} isSelected={isSelected}
                onClick={() => onSelect(item.block_id, "block")}
                onDelete={() => onDelete(idx)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, background: "#A87F1A14", color: "#A87F1A", borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>{blockLabel}</span>
                  </div>
                  {preview && (
                    <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--ps-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{preview}</div>
                  )}
                </div>
              </SortableOutlineItem>
            );
          }

          return null;
        })}
      </SortableContext>
    </DndContext>
  );
}

function SortableOutlineItem({
  id, isSelected, indent = 0, onClick, onDelete, children,
}: {
  id: string; isSelected: boolean; indent?: number;
  onClick: () => void; onDelete: () => void; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.4 : 1,
        display: "flex", alignItems: "flex-start", gap: 6,
        padding: "8px 8px", marginBottom: 1, borderRadius: 7,
        background: isSelected ? "var(--ps-paper)" : "transparent",
        border: "1px solid", borderColor: isSelected ? "var(--ps-rule)" : "transparent",
        cursor: "pointer", marginLeft: indent,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--ps-bg-soft)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div {...attributes} {...listeners} style={{ cursor: "grab", color: "var(--ps-ink-4)", display: "flex", paddingTop: 2, flexShrink: 0 }}>
        <GripVertical size={11} />
      </div>
      {children}
      <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", display: "flex", padding: 2 }} className="del-btn" title="Ta bort">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

/* ─── InlineQuestionCanvas (edit mode) ───────────────────────────────────── */

function InlineQuestionCanvas({ order, bankMap, design, selectedId, onSelect, onEdit, onDelete }: {
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  design: DesignSettings;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (q: Question) => void;
  onDelete: (idx: number) => void;
}) {
  let qNum = 0;
  return (
    <div style={{ fontFamily: "var(--ps-ui)" }}>
      {order.map((item, idx) => {
        if (isQuestionRef(item)) {
          if (item.question_id === "__section__") {
            return (
              <div key={idx} style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "12px 0 4px", borderBottom: "1px solid var(--ps-rule)", marginBottom: 8 }}>
                <Flag size={10} style={{ color: "var(--ps-accent)", display: "inline", marginRight: 4 }} />
                {item.section_label}
              </div>
            );
          }
          if (!item.group) qNum++;
          const q = bankMap.get(item.question_id);
          if (!q) return null;
          const eff = applyOverrides(q, item);
          const isSelected = selectedId === item.question_id;
          const text = (eff.content as { text?: string })?.text ?? "";
          return (
            <div
              key={idx}
              onClick={() => onSelect(item.question_id)}
              style={{
                marginBottom: 8, borderRadius: 8, padding: "12px 14px",
                border: "2px solid", borderColor: isSelected ? "var(--ps-accent)" : "var(--ps-rule)",
                background: "var(--ps-paper)", cursor: "pointer",
                transition: "border-color 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "var(--ps-accent)" : "var(--ps-ink-3)", minWidth: 20, textAlign: "right", flexShrink: 0 }}>
                  {item.group ? `${String.fromCharCode(96 + qNum)})` : `${qNum}.`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ps-ink)" }}>
                    {text || <span style={{ color: "var(--ps-ink-4)" }}>(Ingen frågetext)</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 10, background: "var(--ps-accent)14", color: "var(--ps-accent)", borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>{QUESTION_TYPE_LABELS[eff.type]}</span>
                    {eff.points && <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)" }}>{eff.points} p</span>}
                    {isSelected && (
                      <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ marginLeft: "auto" }} onClick={e => { e.stopPropagation(); onEdit(eff); }}>
                        Redigera
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (isContentBlockRef(item)) {
          const isSelected = selectedId === item.block_id;
          return (
            <ContentBlockCard
              key={idx}
              blockRef={item}
              isSelected={isSelected}
              onClick={() => onSelect(item.block_id)}
            />
          );
        }
        return null;
      })}
      {order.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--ps-ink-4)", fontSize: 13, padding: "60px 0" }}>
          Inga element ännu — lägg till frågor eller block i vänster panel.
        </div>
      )}
    </div>
  );
}

/* ─── ContentBlocksCanvas (preview of blocks interspersed) ──────────────── */

function ContentBlocksCanvas({ order, bankMap, design, selectedId, onSelect, mode }: {
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  design: DesignSettings;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: "edit" | "preview" | "answer";
}) {
  // Only renders in preview/answer mode (edit mode uses InlineQuestionCanvas)
  if (mode === "edit") return null;

  // Render only standalone content blocks (not mixed with questions in preview)
  return null; // PrintableTest handles its own layout
}

/* ─── ContentBlockCard ───────────────────────────────────────────────────── */

function ContentBlockCard({ blockRef, isSelected, onClick }: {
  blockRef: ContentBlockRef;
  isSelected: boolean;
  onClick: () => void;
}) {
  const c = blockRef.content;
  const accent = "#A87F1A";

  const renderContent = () => {
    switch (blockRef.block_type) {
      case "heading": {
        const h = c as { title?: string; subtitle?: string; chapterLabel?: string };
        return (
          <div>
            {h.chapterLabel && <div style={{ fontSize: 10, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{h.chapterLabel}</div>}
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ps-ink)", letterSpacing: "-0.02em" }}>{h.title || "Rubrik"}</div>
            {h.subtitle && <div style={{ fontSize: 13, color: "var(--ps-ink-3)", marginTop: 3 }}>{h.subtitle}</div>}
          </div>
        );
      }
      case "intro": {
        const text = (c as { text?: string }).text ?? "";
        return <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ps-ink-2)" }}>{text || "(Tom introduktionstext)"}</div>;
      }
      case "instruction": {
        const text = (c as { text?: string }).text ?? "";
        return (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 3, background: "var(--ps-accent)", borderRadius: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--ps-ink-2)" }}>{text || "(Tom instruktion)"}</div>
          </div>
        );
      }
      case "source": {
        const s = c as { title?: string; text?: string; attribution?: string };
        return (
          <div style={{ background: "var(--ps-bg-soft)", borderRadius: 6, padding: "10px 12px", borderLeft: "3px solid var(--ps-rule-2)" }}>
            {s.title && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ps-ink-2)", marginBottom: 4 }}>{s.title}</div>}
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--ps-ink-2)", fontStyle: "italic" }}>{s.text || "(Tom källtext)"}</div>
            {s.attribution && <div style={{ fontSize: 10.5, color: "var(--ps-ink-3)", marginTop: 6 }}>{s.attribution}</div>}
          </div>
        );
      }
      case "vocab": {
        const v = c as { word?: string; definition?: string };
        return (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ps-ink)" }}>{v.word || "Ord"}</span>
            <span style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>—</span>
            <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>{v.definition || "(Definiera)"}</span>
          </div>
        );
      }
      case "quote": {
        const q = c as { text?: string; attribution?: string };
        return (
          <div style={{ borderLeft: "3px solid var(--ps-accent)", paddingLeft: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, fontStyle: "italic", color: "var(--ps-ink)" }}>{q.text || "(Citat)"}</div>
            {q.attribution && <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginTop: 4 }}>— {q.attribution}</div>}
          </div>
        );
      }
      case "callout": {
        const ca = c as { text?: string; color?: string };
        const bg = (ca.color ?? "var(--ps-accent)") + "18";
        return (
          <div style={{ background: bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${ca.color ?? "var(--ps-accent)"}30` }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--ps-ink)" }}>{ca.text || "(Tom informationsruta)"}</div>
          </div>
        );
      }
      case "checklist": {
        const cl = c as { items?: string[] };
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(cl.items ?? [""]).map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid var(--ps-rule-2)", flexShrink: 0 }} />
                {it || "(Tom)"}
              </div>
            ))}
          </div>
        );
      }
      case "marginNote": {
        const mn = c as { text?: string };
        return (
          <div style={{ background: "#FFF8E1", borderRadius: 6, padding: "8px 10px", border: "1px solid #F0C040", fontSize: 11.5, color: "#7A600A", fontStyle: "italic" }}>
            📝 {mn.text || "(Lärarnotering)"}
          </div>
        );
      }
      case "pageBreak":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ps-ink-4)" }}>
            <div style={{ flex: 1, height: 1, background: "var(--ps-rule)", borderRadius: 1, borderStyle: "dashed", borderWidth: "0 0 1px 0" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sidbrytning</span>
            <div style={{ flex: 1, height: 1, background: "var(--ps-rule)", borderRadius: 1 }} />
          </div>
        );
      case "divider":
        return <div style={{ height: 1, background: "var(--ps-rule)" }} />;
      case "image": {
        const img = c as { imageUrl?: string; caption?: string };
        return (
          <div>
            {img.imageUrl
              ? <img src={img.imageUrl} alt={img.caption} style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid var(--ps-rule)" }} />
              : <div style={{ height: 80, background: "var(--ps-bg-soft)", borderRadius: 6, border: "1px dashed var(--ps-rule-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)", fontSize: 12.5 }}>Välj bild</div>}
            {img.caption && <div style={{ fontSize: 10.5, color: "var(--ps-ink-3)", marginTop: 4, textAlign: "center" }}>{img.caption}</div>}
          </div>
        );
      }
      default:
        return <div style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>{CONTENT_BLOCK_TYPE_LABELS[blockRef.block_type]}</div>;
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        marginBottom: 8, borderRadius: 8, padding: "12px 14px",
        border: "2px solid", borderColor: isSelected ? accent : "var(--ps-rule)",
        background: "var(--ps-paper)", cursor: "pointer",
        transition: "border-color 0.1s",
      }}
    >
      {/* Block type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, background: `${accent}18`, color: accent, borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>
          {CONTENT_BLOCK_TYPE_LABELS[blockRef.block_type]}
        </span>
      </div>
      {renderContent()}
    </div>
  );
}

/* ─── QuestionInspector (right panel) ────────────────────────────────────── */

function QuestionInspector({ q, onEdit, onRefresh }: { q: Question; onEdit: () => void; onRefresh: () => void }) {
  const text = (q.content as { text?: string })?.text ?? "";
  const supportsLines = questionSupportsLines(q);
  const lines = getQuestionLines(q);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, background: "var(--ps-accent)14", color: "var(--ps-accent)", borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>{QUESTION_TYPE_LABELS[q.type]}</span>
        {q.difficulty && <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)" }}>{{ easy: "Lätt", medium: "Medel", hard: "Svår" }[q.difficulty]}</span>}
        <div style={{ flex: 1 }} />
        <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={onEdit}>Redigera</button>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ps-ink)", padding: "10px 12px", background: "var(--ps-bg-soft)", borderRadius: 8 }}>
        {text || <span style={{ color: "var(--ps-ink-4)" }}>(Ingen frågetext)</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginBottom: 3 }}>Poäng</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{q.points ?? "—"}</div>
        </div>
        {supportsLines && <div>
          <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginBottom: 3 }}>Skrivlinjer</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{lines ?? "—"}</div>
        </div>}
        {q.subject && <div>
          <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginBottom: 3 }}>Ämne</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{q.subject}</div>
        </div>}
      </div>
    </div>
  );
}

/* ─── BlockInspector (right panel for content blocks) ───────────────────── */

function BlockInspector({ ref_, onUpdate }: { ref_: ContentBlockRef; onUpdate: (content: ContentBlockContent) => void }) {
  const c = ref_.content;

  const field = (label: string, value: string, onChange: (v: string) => void, multiline?: boolean) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>{label}</span>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="ps-input" style={{ resize: "vertical" }} />
        : <input value={value} onChange={e => onChange(e.target.value)} className="ps-input" />}
    </label>
  );

  const update = (patch: Record<string, unknown>) => onUpdate({ ...c, ...patch } as ContentBlockContent);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {CONTENT_BLOCK_TYPE_LABELS[ref_.block_type]}
      </div>

      {ref_.block_type === "heading" && <>
        {field("Kapitelrubrik", (c as { chapterLabel?: string }).chapterLabel ?? "", v => update({ chapterLabel: v }))}
        {field("Titel", (c as { title?: string }).title ?? "", v => update({ title: v }))}
        {field("Undertitel", (c as { subtitle?: string }).subtitle ?? "", v => update({ subtitle: v }))}
      </>}

      {(ref_.block_type === "intro" || ref_.block_type === "instruction" || ref_.block_type === "marginNote") && <>
        {field("Text", (c as { text?: string }).text ?? "", v => update({ text: v }), true)}
      </>}

      {ref_.block_type === "source" && <>
        {field("Titel", (c as { title?: string }).title ?? "", v => update({ title: v }))}
        {field("Källtext", (c as { text?: string }).text ?? "", v => update({ text: v }), true)}
        {field("Attribution", (c as { attribution?: string }).attribution ?? "", v => update({ attribution: v }))}
      </>}

      {ref_.block_type === "vocab" && <>
        {field("Ord", (c as { word?: string }).word ?? "", v => update({ word: v }))}
        {field("Definition", (c as { definition?: string }).definition ?? "", v => update({ definition: v }), true)}
      </>}

      {ref_.block_type === "quote" && <>
        {field("Citat", (c as { text?: string }).text ?? "", v => update({ text: v }), true)}
        {field("Upphovsman", (c as { attribution?: string }).attribution ?? "", v => update({ attribution: v }))}
      </>}

      {ref_.block_type === "callout" && <>
        {field("Text", (c as { text?: string }).text ?? "", v => update({ text: v }), true)}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Färg</span>
          <input type="color" value={(c as { color?: string }).color ?? "#1E5F5C"}
            onChange={e => update({ color: e.target.value })}
            style={{ width: 40, height: 30, borderRadius: 4, border: "1px solid var(--ps-rule)", padding: 2, cursor: "pointer" }} />
        </label>
      </>}

      {ref_.block_type === "image" && <>
        {field("Bild-URL", (c as { imageUrl?: string }).imageUrl ?? "", v => update({ imageUrl: v }))}
        {field("Bildtext", (c as { caption?: string }).caption ?? "", v => update({ caption: v }))}
      </>}

      {ref_.block_type === "checklist" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Punkter</span>
          {((c as { items?: string[] }).items ?? [""]).map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input value={it}
                onChange={e => {
                  const items = [...((c as { items?: string[] }).items ?? [""])];
                  items[i] = e.target.value;
                  update({ items });
                }}
                className="ps-input" style={{ flex: 1 }} />
              <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                onClick={() => {
                  const items = ((c as { items?: string[] }).items ?? [""]).filter((_, j) => j !== i);
                  update({ items: items.length ? items : [""] });
                }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }}
            onClick={() => {
              const items = [...((c as { items?: string[] }).items ?? [""]), ""];
              update({ items });
            }}>
            <Plus size={12} /> Lägg till
          </button>
        </div>
      )}

      {(ref_.block_type === "pageBreak" || ref_.block_type === "divider") && (
        <div style={{ color: "var(--ps-ink-4)", fontSize: 12.5 }}>Det här blocket har inga inställningar.</div>
      )}
    </div>
  );
}

/* ─── ContentBlockEditorModal ────────────────────────────────────────────── */

function ContentBlockEditorModal({ blockRef, onClose, onSave }: {
  blockRef: ContentBlockRef;
  onClose: () => void;
  onSave: (content: ContentBlockContent) => void;
}) {
  const [content, setContent] = useState<ContentBlockContent>(blockRef.content);
  const update = (patch: Record<string, unknown>) => setContent(c => ({ ...c, ...patch }) as ContentBlockContent);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 500, maxHeight: "80vh", overflow: "auto", borderRadius: 14, background: "var(--ps-paper)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", fontFamily: "var(--ps-ui)" }}>
          Redigera block · {CONTENT_BLOCK_TYPE_LABELS[blockRef.block_type]}
        </h3>
        <BlockInspector ref_={{ ...blockRef, content }} onUpdate={c => setContent(c)} />
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ps-btn ps-btn-outline" onClick={onClose}>Avbryt</button>
          <button className="ps-btn ps-btn-accent" onClick={() => onSave(content)}>Spara</button>
        </div>
      </div>
    </div>
  );
}

/* ─── LayoutPanel ────────────────────────────────────────────────────────── */

function LayoutPanel({ design, setD }: { design: DesignSettings; setD: (p: Partial<DesignSettings>) => void }) {
  const accent = design.primaryColor ?? "#1E5F5C";

  // Custom tones stored in localStorage
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Presets */}
      <PsGroup title="Designmall">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
          {DESIGN_PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)} style={{
              padding: "7px 5px 8px", borderRadius: 7,
              border: "1.5px solid", borderColor: isPresetActive(p) ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: isPresetActive(p) ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 11, textAlign: "center",
            }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: p.accent, margin: "0 auto 4px" }} />
              <span style={{ fontWeight: isPresetActive(p) ? 600 : 400, color: "var(--ps-ink-2)" }}>{p.name}</span>
            </button>
          ))}
          {tones.map(t => (
            <button key={t.id} onClick={() => applyPreset(t)} style={{
              padding: "7px 5px 8px", borderRadius: 7, position: "relative",
              border: "1.5px solid", borderColor: isPresetActive(t) ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: isPresetActive(t) ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 11, textAlign: "center",
            }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: t.accent, margin: "0 auto 4px" }} />
              <span style={{ fontWeight: isPresetActive(t) ? 600 : 400, color: "var(--ps-ink-2)" }}>{t.name}</span>
              <span
                onClick={e => { e.stopPropagation(); saveTones(tones.filter(x => x.id !== t.id)); }}
                style={{ position: "absolute", top: 2, right: 4, fontSize: 10, color: "var(--ps-ink-4)", cursor: "pointer" }}
                title="Ta bort ton"
              >×</span>
            </button>
          ))}
        </div>
        <button
          className="ps-btn ps-btn-outline ps-btn-sm"
          style={{ alignSelf: "flex-start", fontSize: 11 }}
          onClick={() => {
            const name = prompt("Namn på ny designton:");
            if (!name) return;
            const newTone = {
              id: crypto.randomUUID(),
              name,
              accent,
              design: {
                headingFont: design.headingFont, bodyFont: design.bodyFont,
                titleWeight: design.titleWeight, titleItalic: design.titleItalic,
                titleTransform: design.titleTransform, titleTracking: design.titleTracking,
                titleColor: design.titleColor, cardStyle: design.cardStyle,
                paperStyle: design.paperStyle, numStyle: design.numStyle,
                layout: design.layout,
              },
            };
            saveTones([...tones, newTone]);
          }}
        >
          + Spara som ton
        </button>
      </PsGroup>

      {/* Layout style */}
      <PsGroup title="Layout-stil">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(LAYOUT_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ layout: k as DesignSettings["layout"] })} style={{
              padding: "8px 8px 10px", borderRadius: 7,
              border: "1px solid", borderColor: design.layout === k ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: design.layout === k ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12.5, textAlign: "left",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <LayoutThumb variant={k} accent={accent} />
              <span style={{ fontWeight: design.layout === k ? 500 : 400 }}>{name}</span>
            </button>
          ))}
        </div>
      </PsGroup>

      {/* Accent color */}
      <PsGroup title="Accentfärg">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
          {ACCENT_PALETTE_FULL.map(p => (
            <button key={p.color} title={p.name} onClick={() => setD({ primaryColor: p.color })} style={{
              aspectRatio: "1", borderRadius: 6, background: p.color, cursor: "pointer",
              border: accent === p.color ? "2px solid var(--ps-ink)" : "1px solid var(--ps-rule-2)",
              outline: accent === p.color ? "2px solid var(--ps-paper)" : "none",
              outlineOffset: -4,
            }} />
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ps-ink-3)", marginTop: 2 }}>
          Anpassad
          <input type="color" value={accent} onChange={e => setD({ primaryColor: e.target.value })}
            style={{ width: 28, height: 22, borderRadius: 4, border: "1px solid var(--ps-rule)", padding: 2, cursor: "pointer" }} />
        </label>
      </PsGroup>

      {/* Heading font */}
      <PsGroup title="Rubrikstypsnitt">
        <select
          value={design.headingFont ?? "Newsreader, serif"}
          onChange={e => setD({ headingFont: e.target.value })}
          className="ps-input"
          style={{ fontSize: 12.5 }}
        >
          <optgroup label="Serif">
            {FONT_OPTIONS.filter(f => f.category === "serif").map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
          <optgroup label="Sans-serif">
            {FONT_OPTIONS.filter(f => f.category === "sans").map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Vikt</span>
            <select value={design.titleWeight ?? "700"} onChange={e => setD({ titleWeight: e.target.value as DesignSettings["titleWeight"] })} className="ps-input" style={{ fontSize: 12 }}>
              {[["400","Normal"],["500","Medium"],["600","Halvfet"],["700","Fet"],["800","Extra fet"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Transform</span>
            <select value={design.titleTransform ?? "none"} onChange={e => setD({ titleTransform: e.target.value as DesignSettings["titleTransform"] })} className="ps-input" style={{ fontSize: 12 }}>
              <option value="none">Normal</option>
              <option value="uppercase">VERSALER</option>
              <option value="capitalize">Inled.Versal</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PsToggle label="Kursiv" on={design.titleItalic ?? false} onChange={v => setD({ titleItalic: v })} />
        </div>
        <Segmented value={design.titleColor ?? "ink"} onChange={v => setD({ titleColor: v as "ink"|"accent" })}
          options={[{ v: "ink", label: "Svart" }, { v: "accent", label: "Accentfärg" }]} />
      </PsGroup>

      {/* Body font */}
      <PsGroup title="Brödtexttypsnitt">
        <select
          value={design.bodyFont ?? "Inter, sans-serif"}
          onChange={e => setD({ bodyFont: e.target.value })}
          className="ps-input"
          style={{ fontSize: 12.5 }}
        >
          <optgroup label="Serif">
            {FONT_OPTIONS.filter(f => f.category === "serif").map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
          <optgroup label="Sans-serif">
            {FONT_OPTIONS.filter(f => f.category === "sans").map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
        </select>
      </PsGroup>

      {/* Highlight color */}
      <PsGroup title="Markeringsfärg">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {HIGHLIGHT_PALETTE.map(h => (
            <button key={h.color} title={h.name} onClick={() => setD({ highlightColor: h.color })} style={{
              width: 22, height: 22, borderRadius: 5,
              background: h.color === "none" ? "white" : h.color,
              border: `${(design.highlightColor ?? "none") === h.color ? "2px" : "1px"} solid ${(design.highlightColor ?? "none") === h.color ? "var(--ps-ink)" : "var(--ps-rule-2)"}`,
              cursor: "pointer",
              ...(h.color === "none" ? { backgroundImage: "linear-gradient(135deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)", backgroundSize: "8px 8px" } : {}),
            }} />
          ))}
        </div>
      </PsGroup>

      {/* Numbering style */}
      <PsGroup title="Numreringsstil">
        <Segmented value={design.numStyle ?? "plain"} onChange={v => setD({ numStyle: v as DesignSettings["numStyle"] })}
          options={[{ v: "plain", label: "1." }, { v: "fraga", label: "Fråga" }, { v: "display", label: "Stor" }, { v: "chip", label: "⬤" }]} />
        <Segmented value={design.numbering ?? "number"} onChange={v => setD({ numbering: v as DesignSettings["numbering"] })}
          options={[{ v: "number", label: "1" }, { v: "letter", label: "A" }, { v: "roman", label: "i" }, { v: "paren", label: "(1)" }]} />
        <Segmented value={design.numColor ?? "ink"} onChange={v => setD({ numColor: v as DesignSettings["numColor"] })}
          options={[{ v: "ink", label: "Svart" }, { v: "accent", label: "Accent" }]} />
      </PsGroup>

      {/* Card style */}
      <PsGroup title="Frågekort">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
          {Object.entries(CARD_STYLE_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ cardStyle: k as DesignSettings["cardStyle"] })} style={{
              padding: "6px 4px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ps-ui)",
              border: "1px solid", borderColor: (design.cardStyle ?? "flat") === k ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: (design.cardStyle ?? "flat") === k ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontWeight: (design.cardStyle ?? "flat") === k ? 500 : 400,
              color: "var(--ps-ink-2)",
            }}>
              {name}
            </button>
          ))}
        </div>
        <Segmented value={design.density ?? "comfortable"} onChange={v => setD({ density: v as DesignSettings["density"] })}
          options={[{ v: "compact", label: "Kompakt" }, { v: "comfortable", label: "Bekväm" }, { v: "spacious", label: "Luftig" }]} />
      </PsGroup>

      {/* Paper surface */}
      <PsGroup title="Pappersyta">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
          {Object.entries(PAPER_STYLE_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ paperStyle: k as DesignSettings["paperStyle"] })} style={{
              padding: "5px 3px", borderRadius: 6, fontSize: 10.5, fontFamily: "var(--ps-ui)",
              border: "1px solid", borderColor: (design.paperStyle ?? "white") === k ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: (design.paperStyle ?? "white") === k ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontWeight: (design.paperStyle ?? "white") === k ? 500 : 400,
              color: "var(--ps-ink-2)",
            }}>
              {name}
            </button>
          ))}
        </div>
      </PsGroup>

      {/* Page frame */}
      <PsGroup title="Sidram">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
          {Object.entries(PAGE_FRAME_NAMES).map(([k, name]) => (
            <button key={k} onClick={() => setD({ pageFrame: k as DesignSettings["pageFrame"] })} style={{
              padding: "5px 3px", borderRadius: 6, fontSize: 10.5, fontFamily: "var(--ps-ui)",
              border: "1px solid", borderColor: (design.pageFrame ?? "none") === k ? "var(--ps-ink)" : "var(--ps-rule-2)",
              background: (design.pageFrame ?? "none") === k ? "var(--ps-paper)" : "transparent",
              cursor: "pointer", fontWeight: (design.pageFrame ?? "none") === k ? 500 : 400,
              color: "var(--ps-ink-2)",
            }}>
              {name}
            </button>
          ))}
        </div>
      </PsGroup>

      {/* Watermark */}
      <PsGroup title="Vattenstämpel">
        <input
          value={design.watermark ?? ""}
          onChange={e => setD({ watermark: e.target.value })}
          placeholder="t.ex. PROVEXEMPLAR"
          className="ps-input"
          style={{ fontSize: 12.5 }}
        />
      </PsGroup>

      {/* Cover image */}
      <PsGroup title="Försättsbild">
        <PsToggle
          label="Aktivera försättsbild"
          on={design.coverImage?.enabled ?? false}
          onChange={v => setD({ coverImage: { ...(design.coverImage ?? { kind: "painting", height: 60, fadeY: 40, fadeX: 0, opacity: 0.6, src: "" }), enabled: v } })}
        />
        {(design.coverImage?.enabled) && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
              {COVER_KINDS.map(k => (
                <button key={k.id} onClick={() => setD({ coverImage: { ...design.coverImage!, kind: k.id as NonNullable<DesignSettings["coverImage"]>["kind"] } })} style={{
                  padding: "5px 3px", borderRadius: 6, fontSize: 10.5, fontFamily: "var(--ps-ui)",
                  border: "1px solid", borderColor: (design.coverImage?.kind ?? "painting") === k.id ? "var(--ps-ink)" : "var(--ps-rule-2)",
                  background: (design.coverImage?.kind ?? "painting") === k.id ? "var(--ps-paper)" : "transparent",
                  cursor: "pointer", color: "var(--ps-ink-2)",
                  fontWeight: (design.coverImage?.kind ?? "painting") === k.id ? 500 : 400,
                }}>
                  {k.name}
                </button>
              ))}
            </div>
            <PsSlider label="Höjd" value={design.coverImage?.height ?? 60} min={20} max={120} suffix="mm"
              onChange={v => setD({ coverImage: { ...design.coverImage!, height: v } })} />
            <PsSlider label="Toningspunkt" value={design.coverImage?.fadeY ?? 40} min={0} max={100} suffix="%"
              onChange={v => setD({ coverImage: { ...design.coverImage!, fadeY: v } })} />
            <PsSlider label="Opacitet" value={Math.round((design.coverImage?.opacity ?? 0.6) * 100)} min={10} max={100} suffix="%"
              onChange={v => setD({ coverImage: { ...design.coverImage!, opacity: v / 100 } })} />
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Egen bild-URL (overridar illustration)</span>
              <input value={design.coverImage?.src ?? ""} onChange={e => setD({ coverImage: { ...design.coverImage!, src: e.target.value } })} className="ps-input" style={{ fontSize: 12 }} placeholder="https://…" />
            </label>
          </>
        )}
      </PsGroup>

      {/* Drop cap, header ornament, section divider */}
      <PsGroup title="Typografiska detaljer">
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Dropplock</span>
          <Segmented value={design.dropCap ?? "none"} onChange={v => setD({ dropCap: v as DesignSettings["dropCap"] })}
            options={[{ v: "none", label: "Inga" }, { v: "first", label: "Första" }, { v: "all", label: "Alla" }]} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Avdelare</span>
          <Segmented value={design.sectionDivider ?? "none"} onChange={v => setD({ sectionDivider: v as DesignSettings["sectionDivider"] })}
            options={[{ v: "none", label: "Ingen" }, { v: "thin", label: "Tunn" }, { v: "thick", label: "Tjock" }, { v: "ornament", label: "Ornament" }]} />
        </label>
      </PsGroup>

      {/* Write lines */}
      <PsGroup title="Skrivlinjer">
        <Segmented value={design.lineStyle ?? "solid"} onChange={v => setD({ lineStyle: v as DesignSettings["lineStyle"] })}
          options={[{ v: "solid", label: "Heldraget" }, { v: "dashed", label: "Streckat" }, { v: "dotted", label: "Punktat" }]} />
        <PsSlider label="Radhöjd" value={design.lineSpacing ?? 12} min={8} max={20} suffix="mm" onChange={v => setD({ lineSpacing: v })} />
      </PsGroup>

      {/* Multiple choice marker */}
      <PsGroup title="Flerval">
        <Segmented value={design.mcMarker ?? "square"} onChange={v => setD({ mcMarker: v as DesignSettings["mcMarker"] })}
          options={[{ v: "square", label: "☐" }, { v: "circle", label: "○" }, { v: "letter", label: "A" }]} />
      </PsGroup>

      {/* Points */}
      <PsGroup title="Poäng">
        <Segmented value={design.pointsStyle ?? "italic"} onChange={v => setD({ pointsStyle: v as DesignSettings["pointsStyle"] })}
          options={[{ v: "italic", label: "kursivt" }, { v: "pill", label: "pill" }, { v: "box", label: "ruta" }, { v: "blank", label: "___/p" }]} />
        <PsToggle label="Visa poäng vid fråga" on={design.showPoints !== false} onChange={v => setD({ showPoints: v })} />
      </PsGroup>

      {/* Page settings */}
      <PsGroup title="Sida">
        <PsSlider label="Marginal" value={design.marginLeft ?? 20} min={10} max={35} suffix="mm"
          onChange={v => setD({ marginLeft: v, marginRight: v, marginTop: v, marginBottom: v })} />
        <PsToggle label="Försättsblad" on={design.showCover !== false} onChange={v => setD({ showCover: v })} />
        <PsToggle label="Sidnummer" on={design.showPageNumbers !== false} onChange={v => setD({ showPageNumbers: v })} />
        <PsToggle label="Fråge-metadata (Bloom m.m.)" on={design.showMeta ?? false} onChange={v => setD({ showMeta: v })} />
      </PsGroup>
    </div>
  );
}

/* ─── DocPanel ───────────────────────────────────────────────────────────── */

function DocPanel({ design, setD, title, setTitle }: { design: DesignSettings; setD: (p: Partial<DesignSettings>) => void; title: string; setTitle: (v: string) => void }) {
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
    </div>
  );
}

function DocField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="ps-input" style={{ fontSize: 13 }} />
    </label>
  );
}

/* ─── Design controls ────────────────────────────────────────────────────── */

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

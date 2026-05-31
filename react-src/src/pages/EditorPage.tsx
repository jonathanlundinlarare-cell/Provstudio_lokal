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
import { getLgr22Label, getLgr22ForSubject } from "@/lib/lgr22-so";
import type { LocalDocument } from "@/lib/local-db";
import { toast } from "sonner";
import {
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Download,
  Eye,
  Flag,
  GripVertical,
  ImagePlus,
  Plus,
  Printer,
  Shuffle,
  Trash2,
  X,
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
import { useAutosave } from "@/hooks/useAutosave";
import { QuestionEditModal2 } from "@/components/editor/QuestionEditModal2";
import { BankPickerModal } from "@/components/BankPickerModal";
import { LayoutPanel, SektionerPanel, DocPanel, VersionsPanel } from "./editor/DesignPanel";

/* ─── Route ────────────────────────────────────────────────────────────── */


/* ─── Constants ─────────────────────────────────────────────────────────── */


const LAYOUT_NAMES: Record<string, string> = {
  classic:   "Klassisk",
  editorial: "Editorial",
  minimal:   "Minimal",
  exam:      "Officiellt",
};

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').trim() || str.trim();
}
/* Question types available per doc type */
const Q_TYPES_BY_DOC: Record<DocumentType, QuestionType[]> = {
  test:       ["open","short_answer","numeric","multiple_choice","true_false","cloze","matching","ranking","table","image","drawing","source_critique","essay","group","definition","diagram_label","two_column","formula"],
  workbook:   ["open","short_answer","numeric","multiple_choice","true_false","cloze","matching","ranking","table","image","drawing","source_critique","essay","definition","two_column"],
  homework:   ["open","short_answer","numeric","multiple_choice","true_false","cloze","essay"],
  wordsearch: [], // Ordpussel har inga frågetyper — redigeras i WordsearchPage
};

/* Content block types available per doc type */
const B_TYPES_BY_DOC: Record<DocumentType, ContentBlockType[]> = {
  test:       ["heading","instruction","source","image","pageBreak","divider"],
  workbook:   ["intro","instruction","source","vocab","quote","callout","image","checklist","marginNote","heading","pageBreak","divider"],
  homework:   ["intro","instruction","vocab","checklist","heading","divider"],
  wordsearch: [],
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
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [rightTab, setRightTab]       = useState<"layout"|"sections"|"doc"|"versions">("layout");
  const [centerMode, setCenterMode]   = useState<"preview"|"answer">("preview");
  const [editingQ, setEditingQ]       = useState<Question | null>(null);
  const [addMode, setAddMode]         = useState<"questions"|"blocks">("questions");
  const [newQOpen, setNewQOpen]       = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [pdfMenuOpen,    setPdfMenuOpen]    = useState(false);
  const [docSubject, setDocSubject]         = useState<string>("");

  const setD = (patch: Partial<DesignSettings>) => setDesign(d => ({ ...d, ...patch }));

  /* ── Load ── */
  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { toast.error("Kunde inte ladda dokumentet"); onBack(); return; }
    setTitle(doc.title);
    setDesign({ ...DEFAULT_DESIGN, ...(doc.design_settings ?? {}) });
    setOrder(doc.question_order ?? []);
    setDocType(doc.doc_type ?? "test");
    setDocSubject(doc.subject ?? "");
    setBank(questionBank.list());
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  const saveState = useAutosave(
    JSON.stringify({ title, design, order, docType }),
    () => {
      documents.update(documentId, { title, design_settings: design, question_order: order, doc_type: docType });
      scheduleSave();
    },
    loading,
  );

  /* ── Derived ── */
  const bankMap = useMemo(() => new Map(bank.map(q => [q.id, q])), [bank]);

  /* Build PrintableTest items — questions + content blocks in order */
  const printItems = useMemo<PrintableItem[]>(() => {
    let lastSection: string | undefined;
    let lastSectionId: string | undefined;
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

        let sectionStart: string | undefined;
        if (!ref.group) {
          if (ref.sectionId && ref.sectionId !== lastSectionId) {
            const sec = (design.sections ?? []).find(s => s.id === ref.sectionId);
            sectionStart = sec?.name;
            lastSectionId = ref.sectionId;
          } else if (!ref.sectionId && ref.section_label && ref.section_label !== lastSection) {
            // backward compat
            sectionStart = ref.section_label;
            lastSection = ref.section_label;
          }
        }
        result.push({ kind: "question", question: applyOverrides(q, ref), group: ref.group, sectionStart });
      }
    }
    return result;
  }, [order, bankMap, design.sections]);

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
    setRightTab("layout");
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

  const refreshBank = useCallback(() => {
    setBank(questionBank.list());
  }, []);

  const addQuestion = useCallback((type: QuestionType | "info") => {
    const defaults: Record<string, unknown> = {
      info:       { text: "Skriv informationen här. Detta block visar text för eleven — inget svar krävs.", points: 0 },
      wordsearch: { entries: [], gridSize: 16, instructions: "Leta upp orden i rutnätet och ringa in dem.", points: 0 },
    };
    const defaultContent = defaults[type];
    const content = defaultContent
      ? (type === "wordsearch" ? defaultContent : { text: (defaultContent as { text: string }).text })
      : { text: "Ny fråga" };
    const q = questionBank.create({
      type: type as QuestionType,
      content,
      points: String((defaultContent as { points?: number })?.points ?? 1),
      user_id: "local",
      subject: docSubject || null, tags: null, difficulty: null,
    } as Partial<Question>);
    setOrder(o => [...o, { question_id: q.id } as TestQuestionRef]);
    setBank(b => [...b, q]);
    setNewQOpen(false);
    setEditingQ(q);
  }, [docSubject]);

  const handleDownload = async () => {
    if (window.localAPI?.exportPdf) {
      toast.info("Skapar PDF…");
      const result = await window.localAPI.exportPdf(documentId, stripHtml(title));
      if (result?.success) toast.success("PDF sparad!");
      else toast.info("PDF-export avbruten.");
    } else {
      // Fallback för webbläsarläge
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
    }
  };

  function createVersionB() {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const copy = documents.duplicate(documentId);
    if (!copy) return;
    documents.update(copy.id, {
      title: `${stripHtml(title)} — Version B`,
      question_order: shuffled,
    } as Partial<LocalDocument>);
    scheduleSave();
    toast.success("Version B skapad! Öppnas nu…");
    setTimeout(() => onBack(), 100);
  }

  /* ── Loading state ── */
  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-3)", fontFamily: "var(--ps-ui)" }}>
      Laddar…
    </div>
  );

  /* ── Render ── */
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh", overflow: "hidden", fontFamily: "var(--ps-ui)" }}>

      {/* ── CENTER: Canvas ── */}
      <main style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--ps-bg-soft)" }}>
        {/* Topbar */}
        <div style={{ background: "var(--ps-bg)", borderBottom: "1px solid var(--ps-rule)", padding: "9px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Left: back + divider + title + meta */}
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-3)", fontSize: 12.5, fontFamily: "var(--ps-ui)", padding: 0, whiteSpace: "nowrap" }}
          >
            <ChevronLeft size={13} /> Mina dokument
          </button>
          <div style={{ width: 1, height: 18, background: "var(--ps-rule)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stripHtml(title) || "Namnlöst dokument"}</span>
            <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)" }}>{design.subtitle ?? ""}{design.subtitle ? " · " : ""}{qCount} frågor · {totalPts} p</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Mode tabs */}
          <div style={{ display: "flex", padding: 2, background: "var(--ps-bg-soft)", borderRadius: 8, gap: 1 }}>
            {([
              { id: "preview" as const, label: "Förhandsgranska", icon: <Eye size={11} /> },
              { id: "answer"  as const, label: "Facit",           icon: <CheckSquare size={11} /> },
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

          <span style={{ fontSize: 11, color: "var(--ps-ink-3)", minWidth: 56 }}>
            {saveState === "saving" ? "Sparar…" : saveState === "saved" ? "✓ Sparat" : ""}
          </span>
          <button
            className="ps-btn ps-btn-outline ps-btn-sm"
            onClick={() => setBankPickerOpen(true)}
          >
            Frågebank
          </button>
          <button
            className="ps-btn ps-btn-outline ps-btn-sm"
            onClick={createVersionB}
            title="Skapa en kopia med slumpad frågeordning"
          >
            <Shuffle size={12} /> Version B
          </button>
          <button
            className="ps-btn ps-btn-outline ps-btn-sm"
            onClick={() => {
              if (window.localAPI?.openPrint) {
                window.localAPI.openPrint(documentId);
              } else {
                window.print();
              }
            }}
            title="Skriv ut provet"
          >
            <Printer size={12} /> Skriv ut
          </button>
          {/* PDF split-button with dropdown */}
          <div style={{ position: "relative", display: "flex" }}>
            <button
              className="ps-btn ps-btn-outline ps-btn-sm"
              style={{ borderRadius: "6px 0 0 6px", borderRight: "none" }}
              onClick={handleDownload}
              title="Ladda ned provet som PDF"
            >
              <Download size={12} /> PDF
            </button>
            <button
              className="ps-btn ps-btn-outline ps-btn-sm"
              style={{ borderRadius: "0 6px 6px 0", padding: "0 5px" }}
              onClick={() => setPdfMenuOpen(o => !o)}
              title="Fler PDF-alternativ"
            >
              <ChevronDown size={11} />
            </button>
            {pdfMenuOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setPdfMenuOpen(false)}
                />
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0,
                  background: "var(--ps-paper)", border: "1px solid var(--ps-rule)",
                  borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 1000, minWidth: 160, overflow: "hidden",
                }}>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "9px 14px", background: "none", border: "none",
                      cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12.5,
                      color: "var(--ps-ink)", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--ps-bg-soft)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    onClick={() => { setPdfMenuOpen(false); handleDownload(); }}
                  >
                    <Download size={13} /> Prov PDF
                  </button>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "9px 14px", background: "none", border: "none",
                      cursor: "pointer", fontFamily: "var(--ps-ui)", fontSize: 12.5,
                      color: "var(--ps-ink)", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--ps-bg-soft)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    onClick={() => {
                      setPdfMenuOpen(false);
                      if (window.localAPI?.exportPdf) {
                        window.localAPI.exportPdf(documentId + "::answers", stripHtml(title) + " - Facit");
                      }
                    }}
                  >
                    <Download size={13} /> Facit PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Paper */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
          <div id="printable-root">
            {/* Preview / Facit mode */}
            <div
              onClick={e => {
                const el = (e.target as HTMLElement).closest("[data-qid]") as HTMLElement | null;
                if (el) {
                  const q = bankMap.get(el.dataset.qid!);
                  if (q) setEditingQ(q);
                }
              }}
              style={{ cursor: "default" }}
              title="Klicka på en fråga för att redigera"
            >
              <PrintableTest
                title={title}
                subtitle={design.subtitle ?? ""}
                design={design}
                items={printItems}
                showAnswers={centerMode === "answer"}
                onTitleChange={setTitle}
                onDesignChange={setD}
              />
            </div>
          </div>

          {/* Floating "Ny fråga" pill */}
          <div style={{
            position: "sticky", bottom: 24, marginTop: -80,
            display: "flex", justifyContent: "center",
            pointerEvents: "none", zIndex: 10,
          }}>
            <button onClick={() => setNewQOpen(true)} style={{
              pointerEvents: "auto",
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 44, padding: "0 22px",
              borderRadius: 999,
              background: "var(--ps-ink)", color: "white",
              border: "none", cursor: "pointer",
              fontFamily: "var(--ps-ui)", fontSize: 14, fontWeight: 500,
              boxShadow: "0 10px 28px -8px rgba(20,17,13,0.4), 0 2px 6px rgba(20,17,13,0.15)",
            }}>
              <Plus size={15} /> Ny fråga
            </button>
          </div>
        </div>
      </main>

      {/* ── RIGHT: Inspector ── */}
      <aside style={{ borderLeft: "1px solid var(--ps-rule)", background: "var(--ps-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 12px 0", gap: 3, flexShrink: 0 }}>
          {([
            { id: "layout"   as const, label: "Layout" },
            { id: "sections" as const, label: "Sektioner" },
            { id: "doc"      as const, label: "Dokument" },
            { id: "versions" as const, label: "Versioner" },
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
          {rightTab === "layout" && <LayoutPanel design={design} setD={setD} title={title} />}
          {rightTab === "sections" && (
            <SektionerPanel
              sections={design.sections ?? []}
              order={order}
              bankMap={bankMap}
              onChange={secs => setD({ sections: secs })}
              onOrderChange={setOrder}
              onBankPick={() => setBankPickerOpen(true)}
            />
          )}
          {rightTab === "doc" && <DocPanel design={design} setD={setD} title={title} setTitle={setTitle} bank={bank} questionOrder={order} />}
          {rightTab === "versions" && (
            <VersionsPanel documentId={documentId} />
          )}
        </div>
      </aside>

      {/* ── Modals ── */}
      {editingQ && (
        <QuestionEditModal2
          q={editingQ}
          onEdit={(patch) => {
            const updated = questionBank.update(editingQ.id, patch);
            if (updated) {
              setBank(b => b.map(x => x.id === editingQ.id ? updated : x));
              setEditingQ(updated);
            }
          }}
          onDelete={() => {
            setOrder(o => o.filter(r => !isQuestionRef(r) || r.question_id !== editingQ.id));
            questionBank.delete(editingQ.id);
            setBank(b => b.filter(x => x.id !== editingQ.id));
            setEditingQ(null);
          }}
          onClose={() => setEditingQ(null)}
        />
      )}
      {newQOpen && <NewQuestionModal onClose={() => setNewQOpen(false)} onPick={addQuestion} />}
      {bankPickerOpen && (
        <BankPickerModal
          bank={bank}
          inDocument={new Set(order.filter(isQuestionRef).map(r => r.question_id))}
          defaultSubject={docSubject || undefined}
          onAdd={(qId) => {
            setOrder(o => [...o, { question_id: qId } as TestQuestionRef]);
          }}
          onRemove={(qId) => {
            setOrder(o => o.filter(r => !isQuestionRef(r) || r.question_id !== qId));
          }}
          onClose={() => setBankPickerOpen(false)}
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

/* ─── InlineAddRow ────────────────────────────────────────────────────────── */

const INLINE_QUICK_TYPES: { type: QuestionType; label: string; icon: string; auto?: boolean }[] = [
  { type: "open",            label: "Fritext",     icon: "≡" },
  { type: "multiple_choice", label: "Flerval",     icon: "☑",  auto: true },
  { type: "short_answer",    label: "Kortsvar",    icon: "—" },
  { type: "cloze",           label: "Fyll luckor", icon: "[ ]", auto: true },
  { type: "matching",        label: "Matcha",      icon: "⇌",  auto: true },
  { type: "ranking",         label: "Rangordna",   icon: "⊞" },
  { type: "essay",           label: "Resonerande", icon: "¶" },
  { type: "image",           label: "Bildfråga",   icon: "🖼" },
  { type: "wordsearch",      label: "Wordsearch",  icon: "🔤" },
];

function InlineAddRow({ afterIdx, onPick }: { afterIdx: number; onPick: (idx: number, type: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", margin: "2px 0" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6, height: 22,
          opacity: open ? 1 : 0, transition: "opacity 0.15s",
          cursor: "pointer",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.opacity = "0"; }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--ps-rule-2)" }} />
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 10px", borderRadius: 12,
            border: "1px solid var(--ps-rule-2)",
            background: open ? "var(--ps-accent)" : "var(--ps-paper)",
            color: open ? "#fff" : "var(--ps-ink-3)",
            fontSize: 11, fontFamily: "var(--ps-ui)", cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ＋ Ny fråga
        </button>
        <div style={{ flex: 1, height: 1, background: "var(--ps-rule-2)" }} />
      </div>

      {open && (
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          zIndex: 20, top: 26,
          background: "var(--ps-paper)",
          border: "1px solid var(--ps-rule)",
          borderRadius: 10, padding: "10px 12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          width: 300,
        }}>
          <div style={{ fontSize: 10.5, color: "var(--ps-ink-4)", marginBottom: 8, fontFamily: "var(--ps-ui)" }}>
            <span style={{ background: "var(--ps-ink)", color: "var(--ps-paper)", borderRadius: 3, padding: "1px 5px", fontWeight: 700, marginRight: 4, fontSize: 10 }}>A</span>
            = Automaträttande
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
            {INLINE_QUICK_TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => { setOpen(false); onPick(afterIdx, t.type); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, padding: "8px 4px", borderRadius: 7,
                  border: "1px solid var(--ps-rule-2)",
                  background: "var(--ps-bg-soft)", cursor: "pointer",
                  fontFamily: "var(--ps-ui)", position: "relative",
                }}
              >
                {t.auto && (
                  <span style={{
                    position: "absolute", top: 2, right: 3,
                    fontSize: 7, fontWeight: 800,
                    background: "var(--ps-ink)", color: "var(--ps-paper)",
                    borderRadius: 3, padding: "0 2px",
                  }}>A</span>
                )}
                <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 9.5, color: "var(--ps-ink-2)", textAlign: "center", lineHeight: 1.2 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineQuestionCanvas({ order, bankMap, design, selectedId, onSelect, onEdit, onDelete, onInsertAfter }: {
  order: QuestionOrderItem[];
  bankMap: Map<string, Question>;
  design: DesignSettings;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (q: Question) => void;
  onDelete: (idx: number) => void;
  onInsertAfter: (afterIdx: number, type: QuestionType) => void;
}) {
  let qNum = 0;
  const items = order.map((item, idx) => {
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
      const rawText = (eff.content as { text?: string })?.text ?? "";
      const displayText = rawText.replace(/<[^>]+>/g, "");
      return (
        <div key={idx}>
          <div
            onClick={() => onEdit(eff)}
            style={{
              marginBottom: 2, borderRadius: 8, padding: "10px 14px",
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
                  {displayText || <span style={{ color: "var(--ps-ink-4)" }}>(Ingen frågetext)</span>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, background: "var(--ps-accent)14", color: "var(--ps-accent)", borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>{QUESTION_TYPE_LABELS[eff.type]}</span>
                  {eff.points && <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)" }}>{eff.points} p</span>}
                  <button
                    className="del-btn ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    style={{ marginLeft: "auto" }}
                    onClick={e => { e.stopPropagation(); onDelete(idx); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <InlineAddRow afterIdx={idx} onPick={onInsertAfter} />
        </div>
      );
    }

    if (isContentBlockRef(item)) {
      const isSelected = selectedId === item.block_id;
      return (
        <div key={idx}>
          <ContentBlockCard
            blockRef={item}
            isSelected={isSelected}
            onClick={() => onSelect(item.block_id)}
          />
          <InlineAddRow afterIdx={idx} onPick={onInsertAfter} />
        </div>
      );
    }
    return null;
  });

  return (
    <div style={{ fontFamily: "var(--ps-ui)" }}>
      {order.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--ps-ink-4)", fontSize: 13, padding: "60px 0" }}>
          Inga element ännu — lägg till frågor eller block i vänster panel.
        </div>
      ) : (
        <>
          <InlineAddRow afterIdx={-1} onPick={onInsertAfter} />
          {items}
        </>
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

/* ─── SektionerPanel ─────────────────────────────────────────────────────── */


/* ─── NewQuestionModal ───────────────────────────────────────────────────── */

const AUTO_Q_TYPES = new Set<QuestionType>([
  "multiple_choice", "short_answer", "true_false", "cloze",
  "matching", "ranking", "numeric", "definition",
]);

type QCardDef = { type: QuestionType | "info"; label: string; icon: React.ReactNode };

const NEW_Q_GROUPS: Array<{ title: string; types: QCardDef[] }> = [
  {
    title: "Klassiska",
    types: [
      {
        type: "info",
        label: "Information",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="20" cy="16" r="2" fill="currentColor"/>
            <line x1="20" y1="21" x2="20" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "open",
        label: "Öppen fråga",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="28" x2="22" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "essay",
        label: "Uppsats",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="13" x2="30" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="25" x2="30" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="31" x2="22" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "drawing",
        label: "Rityta",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="9" y="12" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M14 24 L18 18 L22 22 L25 19 L30 24" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Automaträttande",
    types: [
      {
        type: "multiple_choice",
        label: "Flerval",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="13" cy="15" r="4" fill="currentColor"/>
            <line x1="20" y1="15" x2="30" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="13" cy="25" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <line x1="20" y1="25" x2="30" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "short_answer",
        label: "Enkelt svar",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="25" x2="22" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "true_false",
        label: "Sant/Falskt",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="15" cy="20" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M12 20 L14 22 L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="28" cy="20" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M25 17 L31 23 M31 17 L25 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "cloze",
        label: "Lucktext",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="14" y="17" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2"/>
            <line x1="10" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22" y1="12" x2="30" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="29" x2="30" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "matching",
        label: "Matchning",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="8" y="12" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <rect x="22" y="12" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <rect x="8" y="22" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <rect x="22" y="22" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <line x1="18" y1="15" x2="22" y2="25" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5"/>
            <line x1="18" y1="25" x2="22" y2="15" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5"/>
          </svg>
        ),
      },
      {
        type: "ranking",
        label: "Rangordning",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <text x="9" y="18" style={{ fontSize: 9 }} fill="currentColor" fontFamily="sans-serif">1.</text>
            <line x1="17" y1="15" x2="30" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <text x="9" y="25" style={{ fontSize: 9 }} fill="currentColor" fontFamily="sans-serif">2.</text>
            <line x1="17" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <text x="9" y="32" style={{ fontSize: 9 }} fill="currentColor" fontFamily="sans-serif">3.</text>
            <line x1="17" y1="29" x2="30" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "numeric",
        label: "Numerisk",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="10" y="15" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <text x="13" y="23" style={{ fontSize: 8 }} fill="currentColor" fontFamily="monospace">123</text>
          </svg>
        ),
      },
      {
        type: "definition",
        label: "Begrepp",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M10 28 C10 20 14 14 20 14 C26 14 30 20 30 28" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <line x1="14" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="20" y1="14" x2="20" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Specialfunktioner",
    types: [
      {
        type: "source_critique",
        label: "Källkritik",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="10" y="8" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <line x1="14" y1="15" x2="26" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="14" y1="20" x2="26" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="14" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "group",
        label: "Flerdelad",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <text x="9" y="16" style={{ fontSize: 8 }} fill="currentColor" fontFamily="sans-serif">a)</text>
            <line x1="18" y1="13" x2="30" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <text x="9" y="22" style={{ fontSize: 8 }} fill="currentColor" fontFamily="sans-serif">b)</text>
            <line x1="18" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <text x="9" y="28" style={{ fontSize: 8 }} fill="currentColor" fontFamily="sans-serif">c)</text>
            <line x1="18" y1="25" x2="30" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        type: "formula",
        label: "Formel",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <text x="10" y="24" style={{ fontSize: 11 }} fill="currentColor" fontFamily="serif" fontStyle="italic">x² = a</text>
          </svg>
        ),
      },
      {
        type: "image",
        label: "Bildfråga",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="9" y="12" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="15" cy="18" r="2.5" fill="currentColor" opacity="0.5"/>
            <path d="M9 24 L15 19 L20 23 L24 20 L31 27" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        type: "table",
        label: "Tabell",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="9" y="12" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <line x1="9" y1="19" x2="31" y2="19" stroke="currentColor" strokeWidth="1"/>
            <line x1="20" y1="12" x2="20" y2="28" stroke="currentColor" strokeWidth="1"/>
          </svg>
        ),
      },
      {
        type: "diagram_label",
        label: "Diagramnamn",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <line x1="20" y1="11" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="20" y1="27" x2="20" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="11" y1="20" x2="13" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="27" y1="20" x2="29" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="20" cy="20" r="2" fill="currentColor"/>
          </svg>
        ),
      },
      {
        type: "two_column",
        label: "Jämför kol.",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="8" y="12" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <rect x="22" y="12" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        ),
      },
      {
        type: "wordsearch",
        label: "Wordsearch",
        icon: (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {[0,1,2,3].map(r => [0,1,2,3].map(c => (
              <text key={`${r}-${c}`} x={9 + c * 6} y={15 + r * 7}
                style={{ fontSize: 6 }} fill="currentColor" fontFamily="monospace" fontWeight="600">
                {[["S","T","A","T"],["R","E","A","C"],["O","I","K","E"],["L","G","E","N"]][r][c]}
              </text>
            )))}
            <rect x="8" y="8" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <line x1="8" y1="15" x2="32" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
            <line x1="8" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
            <line x1="14" y1="8" x2="14" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
            <line x1="20" y1="8" x2="20" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
            <line x1="26" y1="8" x2="26" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
          </svg>
        ),
      },
    ],
  },
];

function NewQuestionModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: QuestionType | "info") => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(20,17,13,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "white",
          borderRadius: 12,
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.3)",
          border: "1px solid var(--ps-rule)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--ps-rule)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>
            Ny uppgift
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--ps-ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: "var(--ps-ink)",
                  color: "white",
                  fontSize: 9,
                  fontWeight: 800,
                  fontFamily: "var(--ps-ui)",
                }}
              >
                A
              </span>
              = Automaträttande
            </span>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ps-ink-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Groups */}
        <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {NEW_Q_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ps-ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 10,
                  fontFamily: "var(--ps-ui)",
                }}
              >
                {group.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {group.types.map(({ type, label, icon }) => {
                  const isAuto = AUTO_Q_TYPES.has(type as QuestionType);
                  return (
                    <button
                      key={type}
                      onClick={() => onPick(type)}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "14px 8px",
                        borderRadius: 8,
                        border: "1px solid var(--ps-rule-2)",
                        background: "var(--ps-bg-soft)",
                        cursor: "pointer",
                        fontFamily: "var(--ps-ui)",
                        color: "var(--ps-ink-2)",
                        transition: "border-color 0.1s, background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ps-accent)";
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--ps-paper)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ps-rule-2)";
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--ps-bg-soft)";
                      }}
                    >
                      {isAuto && (
                        <span
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: 0,
                            height: 0,
                            borderStyle: "solid",
                            borderWidth: "20px 20px 0 0",
                            borderColor: "var(--ps-ink) transparent transparent transparent",
                            borderRadius: "7px 0 0 0",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: -18,
                              left: 2,
                              fontSize: 7,
                              fontWeight: 800,
                              color: "white",
                              fontFamily: "var(--ps-ui)",
                            }}
                          >
                            A
                          </span>
                        </span>
                      )}
                      {icon}
                      <span style={{ fontSize: 11.5, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

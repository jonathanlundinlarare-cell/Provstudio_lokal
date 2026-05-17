import { useEffect, useMemo, useRef, useState } from "react";
import { documents, questionBank, taxonomy } from "../lib/local-db";
import { isQuestionRef } from "@/lib/test-types";
import { SO_TAXONOMY, SO_SUBJECTS } from "@/lib/so-taxonomy";
import type { Question, QuestionType, Difficulty, OpenContent, MultipleChoiceContent, MatchingContent, ImageContent, TableContent, RankingContent, DrawingContent, QuestionStatus } from "@/lib/test-types";
import {
  Plus, Upload, Edit2, List, CheckSquare, Type,
  Link2, Image, Table, AlignJustify, Pencil, Trash2, X, ChevronDown,
  ChevronRight, ArrowLeft, Search, Clock, Copy, Eye,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  open: "Öppen", multiple_choice: "Flerval", true_false: "Sant/falskt",
  cloze: "Lucktext", matching: "Matchning", image: "Bildfråga",
  table: "Tabell", ranking: "Rangordning", drawing: "Rityta",
  source_critique: "Källkritik",
  short_answer: "Kortsvar", numeric: "Numerisk", essay: "Resonerande",
  group: "Grupp", definition: "Definition", diagram_label: "Diagram",
  two_column: "Jämförelse", formula: "Formel",
};

const ALL_TYPES: QuestionType[] = [
  "open", "short_answer", "numeric", "multiple_choice", "true_false", "cloze",
  "matching", "ranking", "table", "image", "drawing", "source_critique",
  "essay", "group", "definition", "diagram_label", "two_column", "formula",
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  open: Edit2, multiple_choice: List, true_false: CheckSquare,
  cloze: Type, matching: Link2, image: Image,
  table: Table, ranking: AlignJustify, drawing: Pencil,
  source_critique: AlignJustify, short_answer: Edit2, numeric: Type,
  essay: Edit2, group: List, definition: Type, diagram_label: Image,
  two_column: Table, formula: Type,
};

const STATUS: Record<QuestionStatus, { label: string; short: string; color: string; bg: string }> = {
  approved: { label: "Godkänd",   short: "A", color: "#2D7A4F", bg: "rgba(45,122,79,0.12)" },
  review:   { label: "Granska",   short: "G", color: "#B7791F", bg: "rgba(183,121,31,0.12)" },
  draft:    { label: "Utkast",    short: "U", color: "#6B6459", bg: "var(--ps-bg-soft)" },
  archived: { label: "Arkiverad", short: "−", color: "#9A9286", bg: "var(--ps-bg-soft)" },
};

// SO_TAXONOMY and SO_SUBJECTS are now imported from @/lib/so-taxonomy

// ── Tree helpers ──────────────────────────────────────────────────────────────

type TreeNode = {
  id: string;
  label: string;
  count: number;
  children?: TreeNode[];
};

function buildTree(questions: Question[], customTax: Record<string, string[]> = {}): TreeNode[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const key = `${q.subject ?? "Övrigt"}::${q.cat ?? ""}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const nodes: TreeNode[] = [];

  // Build merged taxonomy: SO + custom
  const mergedTax: Record<string, string[]> = {};
  for (const [s, cats] of Object.entries(SO_TAXONOMY)) mergedTax[s] = [...cats];
  for (const [s, cats] of Object.entries(customTax)) {
    if (mergedTax[s]) {
      for (const c of cats) if (!mergedTax[s].includes(c)) mergedTax[s].push(c);
    } else {
      mergedTax[s] = [...cats];
    }
  }

  const definedSubjects = new Set(Object.keys(mergedTax));

  // All defined subjects (always visible)
  for (const [subj, cats] of Object.entries(mergedTax)) {
    const children: TreeNode[] = cats.map(cat => ({
      id: `${subj}::${cat}`,
      label: cat,
      count: counts.get(`${subj}::${cat}`) ?? 0,
    }));
    const total = children.reduce((s, c) => s + c.count, 0) + (counts.get(`${subj}::`) ?? 0);
    nodes.push({ id: `subj::${subj}`, label: subj, count: total, children });
  }

  // Extra subjects from questions that aren't in merged taxonomy
  const extra = new Map<string, Map<string, number>>();
  for (const q of questions) {
    const subj = q.subject ?? "Övrigt";
    if (definedSubjects.has(subj)) continue;
    if (!extra.has(subj)) extra.set(subj, new Map());
    const cat = q.cat ?? "";
    extra.get(subj)!.set(cat, (extra.get(subj)!.get(cat) ?? 0) + 1);
  }
  for (const [subj, cats] of extra) {
    const children: TreeNode[] = [];
    for (const [cat, count] of cats) if (cat) children.push({ id: `${subj}::${cat}`, label: cat, count });
    const total = Array.from(cats.values()).reduce((a, b) => a + b, 0);
    nodes.push({ id: `subj::${subj}`, label: subj, count: total, children: children.length ? children : undefined });
  }

  return nodes;
}

// ── BankCircle ────────────────────────────────────────────────────────────────

function BankCircle({ letter, value, color }: { letter: string; value: number | undefined; color?: string }) {
  const c = color || "var(--ps-ink-3)";
  const hasValue = value !== undefined && value !== null && value > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 99,
        border: `1.5px solid ${c}`, color: c,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 600, fontFamily: "var(--ps-ui)",
      }}>{letter}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: hasValue ? "var(--ps-ink)" : "var(--ps-ink-4)" }}>
        {hasValue ? value : "—"}
      </span>
    </div>
  );
}

// ── QuestionPreview ───────────────────────────────────────────────────────────

function QuestionPreview({ q, expanded }: { q: Question; expanded: boolean }) {
  const c = q.content as Record<string, unknown>;

  if (q.type === "multiple_choice") {
    const opts = (c.options as string[]) ?? [];
    const correct = typeof c.correctIndex === "number" ? c.correctIndex : -1;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opts.map((o, i) => {
          const isCorrect = expanded && correct === i;
          return (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "default" }}>
              <span style={{
                width: 16, height: 16, borderRadius: 99, flexShrink: 0, position: "relative",
                border: `1.5px solid ${isCorrect ? "#2D7A4F" : "#C8C2B5"}`,
                background: isCorrect ? "#2D7A4F" : "transparent",
              }}>
                {isCorrect && <span style={{ position: "absolute", inset: 3, borderRadius: 99, background: "white" }} />}
              </span>
              <span style={{ color: isCorrect ? "#2D7A4F" : "var(--ps-ink-2)", fontWeight: isCorrect ? 500 : 400 }}>{o}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (q.type === "matching") {
    const pairs = (c.pairs as Array<{ left: string; right: string }>) ?? [];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {pairs.map((p, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ padding: "5px 9px", border: "1px solid var(--ps-rule-2)", borderRadius: 4, background: "var(--ps-paper)", fontSize: 12.5 }}>{p.left}</div>
            <div style={{ padding: "5px 9px", border: "1px solid var(--ps-rule-2)", borderRadius: 4, background: "var(--ps-paper)", fontSize: 12.5, color: "var(--ps-ink-2)" }}>{p.right}</div>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "true_false") {
    const correct = typeof (c as { correct?: number }).correct === "number" ? (c as { correct?: number }).correct : -1;
    return (
      <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
        {[{ v: 0, l: "Sant" }, { v: 1, l: "Falskt" }].map(o => {
          const isCorrect = expanded && correct === o.v;
          return (
            <span key={o.l} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: isCorrect ? "#2D7A4F" : "var(--ps-ink-2)", fontWeight: isCorrect ? 500 : 400 }}>
              <span style={{ width: 15, height: 15, border: `1.5px solid ${isCorrect ? "#2D7A4F" : "#C8C2B5"}`, borderRadius: 3, background: isCorrect ? "#2D7A4F" : "transparent", display: "inline-block" }} />
              {o.l}
            </span>
          );
        })}
      </div>
    );
  }

  if (q.type === "ranking") {
    const items = (c.items as string[]) ?? [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ width: 20, height: 20, border: "1.5px solid #C8C2B5", borderRadius: 3, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--ps-ink-3)" }}>
              {expanded ? (i + 1) : ""}
            </span>
            <span style={{ color: "var(--ps-ink-2)" }}>{it}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "source_critique") {
    const sc = c as { sourceTitle?: string; sourceText?: string; sourceAttribution?: string };
    return (
      <div style={{ padding: "10px 14px", background: "#FBF8F1", border: "1px solid #E7DDC4", borderRadius: 4, fontSize: 12.5, fontStyle: "italic", color: "#3a3530", lineHeight: 1.5 }}>
        {sc.sourceTitle && <div style={{ fontSize: 9, color: "#A87F1A", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4, fontStyle: "normal" }}>{sc.sourceTitle}</div>}
        {sc.sourceText}
        {sc.sourceAttribution && <div style={{ fontSize: 10, color: "#8a7e64", marginTop: 4, textAlign: "right" }}>— {sc.sourceAttribution}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: "7px 10px", border: "1px dashed var(--ps-rule-2)", borderRadius: 6, fontSize: 12, color: "var(--ps-ink-3)", fontStyle: "italic" }}>
      {TYPE_LABELS[q.type] ?? q.type} · öppet svar
    </div>
  );
}

// ── TreeNavNode ───────────────────────────────────────────────────────────────

function TreeNavNode({ node, depth, activeId, onSelect, openSet, toggleOpen }: {
  node: TreeNode; depth: number; activeId: string;
  onSelect: (id: string) => void;
  openSet: Set<string>; toggleOpen: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen   = openSet.has(node.id);
  const isActive = activeId === node.id;
  const pl = 10 + depth * 14;

  return (
    <>
      <button
        onClick={() => { if (hasChildren) toggleOpen(node.id); onSelect(node.id); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          padding: `7px ${pl}px`,
          border: "none", borderRadius: 6, cursor: "pointer",
          background: isActive ? "var(--ps-paper)" : "transparent",
          color: isActive ? "var(--ps-ink)" : "var(--ps-ink-2)",
          fontFamily: "var(--ps-ui)", fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          textAlign: "left",
        }}
      >
        {hasChildren && (
          <ChevronRight size={11} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s", color: "var(--ps-ink-3)", flexShrink: 0 }} />
        )}
        {!hasChildren && <span style={{ width: 11, flexShrink: 0 }} />}
        <span style={{ flex: 1, color: isActive ? "var(--ps-accent)" : "inherit", textDecoration: isActive && !hasChildren ? "underline" : "none", textDecorationColor: "var(--ps-accent)", textUnderlineOffset: 3 }}>
          {node.label}
        </span>
        <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", fontFamily: "monospace" }}>{node.count}</span>
      </button>
      {hasChildren && isOpen && node.children!.map(child => (
        <TreeNavNode key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} openSet={openSet} toggleOpen={toggleOpen} />
      ))}
    </>
  );
}

// ── QuestionCard ──────────────────────────────────────────────────────────────

function QuestionCard({ q, expanded, onToggle, onEdit, onDelete, onAddToDoc, usedIn }: {
  q: Question; expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToDoc?: (q: Question) => void;
  usedIn?: number;
}) {
  const statusKey = (q.status ?? "draft") as QuestionStatus;
  const status = STATUS[statusKey] || STATUS.draft;
  const gp = q.grade_points ?? {};
  const totalPoints = (gp.E ?? 0) + (gp.C ?? 0) + (gp.A ?? 0);
  const qc = q.content as Record<string, unknown>;
  const questionText = (qc?.text as string) ?? (qc?.term as string) ?? (qc?.title as string) ?? "";

  return (
    <div style={{ background: "var(--ps-paper)", border: "1px solid var(--ps-rule)", borderRadius: 12, overflow: "hidden" }}>
      {/* Category bar */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 18px 0" }}>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--ps-amber)", fontWeight: 500, letterSpacing: "0.01em" }}>{q.subject || "Övrigt"}{q.cat ? `: ${q.cat}` : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {usedIn !== undefined && usedIn > 0 && (
            <span title={`Används i ${usedIn} dokument`} style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 10,
              background: "var(--ps-accent)14", color: "var(--ps-accent)",
              fontWeight: 500, fontFamily: "var(--ps-ui)",
            }}>
              {usedIn} dok
            </span>
          )}
          <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", fontFamily: "monospace" }}>ID: {q.id.slice(0, 6)}</span>
          <span title={status.label} style={{
            width: 22, height: 22, borderRadius: 99,
            background: status.bg, color: status.color,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, fontFamily: "var(--ps-ui)",
            border: `1px solid ${status.color}4D`,
          }}>{status.short}</span>
          <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" title="Redigera" onClick={onEdit}><Edit2 size={13} /></button>
          <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" title="Ta bort" style={{ color: "var(--ps-red)" }} onClick={onDelete}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 22, padding: "12px 18px 18px" }}>
        {/* Left: question */}
        <div>
          <div style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ps-ink)", marginBottom: 14, fontFamily: "var(--ps-display)", fontWeight: 400 }}>
            {questionText
              ? <span dangerouslySetInnerHTML={{ __html: questionText }} />
              : <span style={{ color: "var(--ps-ink-4)", fontStyle: "italic", fontFamily: "var(--ps-ui)", fontSize: 14 }}>(Ingen frågetext)</span>}
          </div>
          <QuestionPreview q={q} expanded={false} />

          <button onClick={onToggle} style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: 14, padding: 0, border: "none", background: "transparent",
            cursor: "pointer", color: "var(--ps-accent)",
            fontFamily: "var(--ps-ui)", fontSize: 12.5, fontWeight: 500,
          }}>
            Bedömningsanvisningar
            <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>

          {expanded && (
            <div style={{ marginTop: 12, padding: 14, background: "var(--ps-bg-soft)", border: "1px solid var(--ps-rule)", borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <QuestionPreview q={q} expanded />
              </div>
              <div style={{ borderTop: "1px solid var(--ps-rule-2)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 10.5, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ämneskunskaper</span>
                  <div style={{ flex: 1, height: 1, background: "var(--ps-rule-2)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {(["E", "C", "A"] as const).map(g => {
                    const rubricText = q.rubric?.[g] ?? "";
                    const hasText = !!rubricText;
                    return (
                      <div key={g}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: 99,
                            border: `1.5px solid ${hasText ? "var(--ps-accent)" : "var(--ps-rule-2)"}`,
                            color: hasText ? "var(--ps-accent)" : "var(--ps-ink-4)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 600,
                          }}>{g}</span>
                          <span style={{ fontSize: 10, color: "var(--ps-ink-3)" }}>
                            {(gp[g] ?? 0) ? `${gp[g]} p` : "—"}
                          </span>
                        </div>
                        <div style={{
                          minHeight: 64, padding: "8px 10px",
                          background: "var(--ps-paper)",
                          border: "1px solid var(--ps-rule-2)",
                          borderRadius: 4, fontSize: 11.5, lineHeight: 1.45,
                          color: hasText ? "var(--ps-ink-2)" : "var(--ps-ink-4)",
                          fontStyle: hasText ? "normal" : "italic",
                        }}>
                          {rubricText || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 11, color: "var(--ps-ink-3)", flexWrap: "wrap" }}>
            {q.updated && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {q.updated}</span>}
            {q.used_in !== undefined && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Copy size={11} /> använd i {q.used_in} prov</span>}
            <span className="ps-chip" style={{ fontSize: 10.5 }}>{TYPE_LABELS[q.type] ?? q.type}</span>
          </div>
        </div>

        {/* Right: curriculum panel */}
        <aside style={{
          background: "var(--ps-bg-soft)", border: "1px solid var(--ps-rule)",
          borderRadius: 8, padding: "14px 14px 12px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Ämneskunskaper</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
              <BankCircle letter="E" value={gp.E} color={gp.E ? "var(--ps-accent)" : undefined} />
              <BankCircle letter="C" value={gp.C} color={gp.C ? "var(--ps-accent)" : undefined} />
              <BankCircle letter="A" value={gp.A} color={gp.A ? "var(--ps-accent)" : undefined} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderLeft: "1px solid var(--ps-rule-2)", paddingLeft: 6 }}>
                <span style={{ fontSize: 9, color: "var(--ps-ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Tot.</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{totalPoints || "—"}</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {onAddToDoc ? (
              <button className="ps-btn ps-btn-accent" style={{ width: "100%", justifyContent: "center", height: 40 }} onClick={() => onAddToDoc(q)}>
                <Plus size={15} /> Lägg till
              </button>
            ) : (
              <button className="ps-btn ps-btn-outline" style={{ width: "100%", justifyContent: "center", height: 40 }} disabled>
                <Plus size={15} /> Lägg till
              </button>
            )}
            <button className="ps-btn ps-btn-ghost ps-btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={onToggle}>
              <Eye size={12} /> Bedömning
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── BankPage ──────────────────────────────────────────────────────────────────

export default function BankPage({ onBack, onAddQuestion }: {
  onBack: () => void;
  onAddQuestion?: (q: Question) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [customTax, setCustomTax] = useState<Record<string, string[]>>(taxonomy.get);
  const [activeId, setActiveId]   = useState<string>("__all__");
  const [openSet, setOpenSet]     = useState<Set<string>>(new Set());
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("Alla");
  const [creatingType, setCreatingType] = useState<QuestionType | null>(null);
  const [editingQ, setEditingQ]   = useState<Question | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  function load() { setQuestions(questionBank.list()); }
  function reloadTax() { setCustomTax({ ...taxonomy.get() }); }
  useEffect(() => { load(); }, []);

  // Compute how many documents each question appears in
  const usedInMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents.list()) {
      const seen = new Set<string>();
      for (const ref of doc.question_order ?? []) {
        if (isQuestionRef(ref) && ref.question_id && !seen.has(ref.question_id)) {
          seen.add(ref.question_id);
          map.set(ref.question_id, (map.get(ref.question_id) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [questions]); // questions as proxy for "data changed"

  const tree = buildTree(questions, customTax);

  const toggleOpen = (id: string) => setOpenSet(s => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Filter logic
  const visible = questions.filter(q => {
    if (activeId !== "__all__") {
      if (activeId.startsWith("subj::")) {
        const subj = activeId.slice(6);
        if ((q.subject || "Övrigt") !== subj) return false;
      } else if (activeId.includes("::")) {
        const [subj, cat] = activeId.split("::");
        if ((q.subject || "Övrigt") !== subj) return false;
        if ((q.cat || "") !== cat) return false;
      }
    }
    if (typeFilter !== "Alla" && q.type !== typeFilter) return false;
    if (search) {
      const c = q.content as Record<string, unknown>;
      const text = ((c?.text as string) ?? (c?.term as string) ?? (c?.title as string) ?? "").toLowerCase();
      if (!text.includes(search.toLowerCase()) && !q.id.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Active node label for breadcrumb
  const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) { const f = findNode(n.children, id); if (f) return f; }
    }
    return null;
  };
  const activeNode = activeId === "__all__" ? null : findNode(tree, activeId);
  const parentNode = activeId.includes("::") && !activeId.startsWith("subj::") ? tree.find(n => n.children?.some(c => c.id === activeId)) : null;

  function deleteQ(id: string) { if (confirm("Ta bort frågan?")) { questionBank.delete(id); load(); } }

  return (
    <div className="ps-body" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: "1px solid var(--ps-rule)", background: "var(--ps-paper)", flexShrink: 0 }}>
        <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Tillbaka
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--ps-ui)", color: "var(--ps-ink)" }}>Frågebank</span>
        <div style={{ flex: 1 }} />
        <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => setShowImport(true)}>
          <Upload size={14} /> Importera
        </button>
        <div style={{ position: "relative" }}>
          <button className="ps-btn ps-btn-accent" onClick={() => setTypePickerOpen(o => !o)}>
            <Plus size={15} /> Skapa uppgift <ChevronDown size={13} />
          </button>
          {typePickerOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
              background: "var(--ps-paper)", border: "1px solid var(--ps-rule)", borderRadius: 10,
              padding: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, width: 280,
            }}>
              {ALL_TYPES.map(t => {
                const Icon = TYPE_ICONS[t] ?? Edit2;
                return (
                  <button key={t} onClick={() => { setCreatingType(t); setTypePickerOpen(false); }}
                    style={{ padding: "8px 8px", borderRadius: 7, border: "none", background: "none", cursor: "pointer", color: "var(--ps-ink-2)", fontSize: 12, fontFamily: "var(--ps-ui)", display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--ps-bg-soft)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >
                    <Icon size={13} /> {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr", gap: 0 }}>
        {/* Tree nav */}
        <aside style={{ overflow: "auto", padding: 14, borderRight: "1px solid var(--ps-rule)", background: "var(--ps-bg)" }}>
          <div style={{ padding: "6px 10px 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--ps-ui)", color: "var(--ps-ink)", letterSpacing: "-0.01em" }}>Uppgiftsbanken</div>
            <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginTop: 1 }}>
              {questions.length} uppgifter totalt
            </div>
          </div>

          {/* All questions node */}
          <button onClick={() => setActiveId("__all__")} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 6,
            padding: "7px 10px", border: "none", borderRadius: 6, cursor: "pointer",
            background: activeId === "__all__" ? "var(--ps-paper)" : "transparent",
            color: activeId === "__all__" ? "var(--ps-ink)" : "var(--ps-ink-2)",
            fontFamily: "var(--ps-ui)", fontSize: 13,
            fontWeight: activeId === "__all__" ? 500 : 400, textAlign: "left",
          }}>
            <span style={{ flex: 1, color: activeId === "__all__" ? "var(--ps-accent)" : "inherit" }}>Alla ämnen</span>
            <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", fontFamily: "monospace" }}>{questions.length}</span>
          </button>

          <div style={{ height: 1, background: "var(--ps-rule)", margin: "8px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {tree.map(node => (
              <TreeNavNode key={node.id} node={node} depth={0} activeId={activeId} onSelect={setActiveId} openSet={openSet} toggleOpen={toggleOpen} />
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div style={{ overflow: "auto", padding: "20px 24px 40px", background: "var(--ps-bg)", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header card */}
          <div className="ps-card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: "var(--ps-ui)", fontSize: 22, margin: 0, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ps-ink)" }}>
                {parentNode ? (() => { const parts = parentNode.label.split("::"); return parts[parts.length - 1] ?? parentNode.label; })() : (activeNode?.label ?? "Alla ämnen")}
                {parentNode && activeNode && (
                  <span style={{ color: "var(--ps-ink-3)", fontWeight: 400 }}> · {activeNode.label}</span>
                )}
              </h2>
              <div style={{ fontSize: 12.5, color: "var(--ps-ink-3)", marginTop: 2 }}>
                <span>{visible.length}</span> uppgifter
                {questions.length !== visible.length && ` (av ${questions.length} totalt)`}
              </div>
            </div>
            {/* Search */}
            <div style={{ position: "relative", width: 240, flexShrink: 0 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ps-ink-4)" }} />
              <input type="text" placeholder="Sök i uppgifter…" value={search} onChange={e => setSearch(e.target.value)}
                className="ps-input" style={{ width: "100%", paddingLeft: 32, height: 36, fontSize: 13 }} />
            </div>
            {/* Type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="ps-input" style={{ height: 36, fontSize: 12.5, flexShrink: 0 }}>
              <option value="Alla">Alla typer</option>
              {Array.from(new Set(questions.map(q => q.type))).sort().map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>

          {/* Question cards */}
          {visible.length === 0 ? (
            <div className="ps-card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>❓</div>
              <h3 style={{ fontFamily: "var(--ps-ui)", fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: "var(--ps-ink)" }}>
                {questions.length === 0 ? "Frågebanken är tom" : "Inga uppgifter matchade"}
              </h3>
              <p style={{ color: "var(--ps-ink-3)", margin: "0 0 18px", fontSize: 13, fontFamily: "var(--ps-ui)" }}>
                {questions.length === 0
                  ? "Frågor du skapar sparas här och kan återanvändas i dina prov."
                  : "Prova att ändra filter, sök eller välj ett annat ämne."}
              </p>
              {questions.length === 0 && (
                <button className="ps-btn ps-btn-accent" onClick={() => setTypePickerOpen(o => !o)}>
                  <Plus size={14} /> Skapa uppgift
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {visible.map(q => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    expanded={expanded === q.id}
                    onToggle={() => setExpanded(e => e === q.id ? null : q.id)}
                    onEdit={() => setEditingQ(q)}
                    onDelete={() => deleteQ(q.id)}
                    onAddToDoc={onAddQuestion}
                    usedIn={usedInMap.get(q.id) ?? 0}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--ps-ink-3)", textAlign: "center", paddingTop: 4, fontFamily: "var(--ps-ui)" }}>
                Visar {visible.length} av {questions.length} uppgifter
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {creatingType && (() => {
        let defSubj = "";
        let defCat = "";
        if (activeId.startsWith("subj::")) defSubj = activeId.slice(6);
        else if (activeId.includes("::")) { const [s, c] = activeId.split("::"); defSubj = s; defCat = c; }
        return (
          <QuestionModal mode="create" type={creatingType} defaultSubject={defSubj} defaultCat={defCat}
            customTax={customTax} onTaxChange={reloadTax}
            onClose={() => setCreatingType(null)} onSaved={() => { setCreatingType(null); load(); }} />
        );
      })()}
      {editingQ && (
        <QuestionModal mode="edit" question={editingQ}
          customTax={customTax} onTaxChange={reloadTax}
          onClose={() => setEditingQ(null)} onSaved={() => { setEditingQ(null); load(); }} />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} />
      )}
    </div>
  );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

type ParsedRow = { text: string; type: string; options: string[]; points: string | null; subject: string | null; difficulty: string | null; valid: boolean; error?: string; };
const VALID_TYPES = new Set(["open","multiple_choice","true_false","cloze","matching","image","table","ranking","drawing","source_critique","short_answer","numeric","essay","group","definition","diagram_label","two_column","formula"]);

function parseCSV(raw: string): ParsedRow[] {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const firstLower = lines[0].toLowerCase();
  const dataLines = (firstLower.includes("text") || firstLower.includes("typ") || firstLower.includes("fråge")) ? lines.slice(1) : lines;
  return dataLines.map((line): ParsedRow => {
    const [rawText = "", rawType = "open", rawOptions = "", rawPoints = "", rawSubject = "", rawDiff = ""] = parseCsvLine(line);
    const text = rawText.trim();
    const type = rawType.trim().toLowerCase();
    const options = rawOptions ? rawOptions.split(";").map(s => s.trim()).filter(Boolean) : [];
    const points = rawPoints.trim() || null;
    const subject = rawSubject.trim() || null;
    const difficulty = rawDiff.trim().toLowerCase() || null;
    if (!text) return { text, type, options, points, subject, difficulty, valid: false, error: "Tom frågetext" };
    if (!VALID_TYPES.has(type)) return { text, type, options, points, subject, difficulty, valid: false, error: `Okänd typ "${type}"` };
    if (type === "multiple_choice" && options.length < 2) return { text, type, options, points, subject, difficulty, valid: false, error: "Flervalsfråga behöver minst 2 alternativ" };
    return { text, type, options, points, subject, difficulty, valid: true };
  });
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRows(parseCSV(csvText)); }, [csvText]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setCsvText(e.target?.result as string ?? "");
    reader.readAsText(file, "UTF-8");
  };

  const validRows = rows.filter(r => r.valid);

  function doImport() {
    if (!validRows.length) return;
    setImporting(true);
    validRows.forEach(r => {
      let content: Record<string, unknown>;
      if (r.type === "multiple_choice") content = { text: r.text, options: r.options, multi: false };
      else if (r.type === "open")       content = { text: r.text, lines: 4 };
      else if (r.type === "drawing")    content = { text: r.text, heightMm: 60 };
      else                              content = { text: r.text };
      questionBank.create({ type: r.type as QuestionType, content: content as never, points: r.points, subject: r.subject, difficulty: r.difficulty as Difficulty | null });
    });
    setImporting(false);
    onImported();
  }

  const EXAMPLE = `text,typ,alternativ,poäng,ämne,svårighet\nVad är vattnets kemiska formel?,multiple_choice,H2O;CO2;NaCl;O2,1,Kemi,easy\nSverige är ett land i Norden.,true_false,,1,Geografi,easy\nBeskriv fotosyntesen med egna ord.,open,,3,Biologi,medium`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: 16 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 14, background: "var(--ps-paper)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Importera frågor via CSV</h3>
          <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ fontSize: 12, color: "var(--ps-ink-3)", marginBottom: 12, lineHeight: 1.6 }}>
          <strong>Format:</strong>{" "}
          <code style={{ fontSize: 11.5, background: "var(--ps-bg-soft)", padding: "1px 5px", borderRadius: 3 }}>text,typ,alternativ,poäng,ämne,svårighet</code>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => fileRef.current?.click()}><Upload size={13} /> Välj CSV-fil</button>
          <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setCsvText(EXAMPLE)} style={{ color: "var(--ps-ink-3)" }}>Läs in exempel</button>
        </div>
        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="Klistra in CSV-innehåll här, eller välj en fil ovan." rows={8} className="ps-input" style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }} />
        {rows.length > 0 && (
          <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--ps-ink-3)", marginBottom: 8 }}>
              <span style={{ color: "var(--ps-ink)" }}>{rows.length}</span> rader —{" "}
              <span style={{ color: "var(--ps-green)", fontWeight: 500 }}>{validRows.length} giltiga</span>
              {rows.length - validRows.length > 0 && <span style={{ color: "var(--ps-red)" }}>{" · "}{rows.length - validRows.length} med fel</span>}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ps-btn ps-btn-outline" onClick={onClose}>Avbryt</button>
          <button className="ps-btn ps-btn-accent" onClick={doImport} disabled={importing || validRows.length === 0}>
            {importing ? "Importerar…" : `Importera ${validRows.length} ${validRows.length === 1 ? "fråga" : "frågor"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question Modal ────────────────────────────────────────────────────────────

function QuestionModal({ mode, type, question, defaultSubject, defaultCat, customTax, onTaxChange, onClose, onSaved }: {
  mode: "create" | "edit";
  type?: QuestionType;
  question?: Question;
  defaultSubject?: string;
  defaultCat?: string;
  customTax?: Record<string, string[]>;
  onTaxChange?: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qType: QuestionType = (question?.type as QuestionType) || type!;
  const c = question?.content as Record<string, unknown> | undefined;
  const [text, setText]       = useState((c?.text as string) || "");
  const [lines, setLines]     = useState((c?.lines as number) || 4);
  const [options, setOptions] = useState<string[]>((c?.options as string[]) || ["", ""]);
  const [multi, setMulti]     = useState((c?.multi as boolean) || false);
  const [correctIndex, setCorrectIndex] = useState<number | null>(
    typeof c?.correctIndex === "number" ? c.correctIndex : null
  );
  const [tfCorrect, setTfCorrect] = useState<number | null>(
    typeof c?.correct === "number" ? c.correct : null
  );
  const [pairs, setPairs]     = useState<Array<{ left: string; right: string }>>((c?.pairs as Array<{ left: string; right: string }>) || [{ left: "", right: "" }, { left: "", right: "" }]);
  const [imageUrl, setImageUrl]     = useState((c?.imageUrl as string) || "");
  const [imageCaption, setCaption]  = useState((c?.caption as string) || "");
  const [imageLines, setImgLines]   = useState((c?.lines as number) || 0);
  const [tableHeaders, setHeaders]  = useState((c?.headers as string[]) || ["", ""]);
  const [tableRows, setTableRows]   = useState((c?.rows as string[][]) || [["", ""], ["", ""]]);
  const [rankItems, setRankItems]   = useState((c?.items as string[]) || ["", ""]);
  const [drawHeight, setDrawHeight] = useState((c?.heightMm as number) || 60);
  const [points, setPoints]   = useState(question?.points || "");
  const [subject, setSubject] = useState(question?.subject || defaultSubject || "");
  const [cat, setCat]         = useState(question?.cat || defaultCat || "");
  const [customSubject, setCustomSubject] = useState(false);
  const [customCat, setCustomCat] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newSubjectVal, setNewSubjectVal] = useState("");
  const [newCatVal, setNewCatVal] = useState("");

  // Merged subjects: SO + custom
  const allSubjects = [...SO_SUBJECTS, ...Object.keys(customTax ?? {}).filter(s => !SO_SUBJECTS.includes(s))];
  // Merged categories for current subject
  const soSubjCats = SO_TAXONOMY[subject] ?? [];
  const customSubjCats = (customTax ?? {})[subject] ?? [];
  const allCats = [...soSubjCats, ...customSubjCats.filter(c => !soSubjCats.includes(c))];

  const isKnownSubject = allSubjects.includes(subject);
  const [difficulty, setDiff] = useState<Difficulty | "">(question?.difficulty as Difficulty || "");
  const [status, setStatus]   = useState<QuestionStatus>(question?.status || "draft");
  const [rubricE, setRubricE] = useState(question?.rubric?.E || "");
  const [rubricC, setRubricC] = useState(question?.rubric?.C || "");
  const [rubricA, setRubricA] = useState(question?.rubric?.A || "");
  const [gpE, setGpE]         = useState<number>(question?.grade_points?.E ?? 0);
  const [gpC, setGpC]         = useState<number>(question?.grade_points?.C ?? 0);
  const [gpA, setGpA]         = useState<number>(question?.grade_points?.A ?? 0);
  const [author, setAuthor]   = useState(question?.author || "");
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState<"content" | "rubric">("content");
  const imgRef = useRef<HTMLInputElement>(null);

  const ensureCols = (n: number) => {
    setHeaders(h => { const nx = [...h]; while (nx.length < n) nx.push(""); while (nx.length > n) nx.pop(); return nx; });
    setTableRows(rs => rs.map(r => { const nx = [...r]; while (nx.length < n) nx.push(""); while (nx.length > n) nx.pop(); return nx; }));
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  function save() {
    setSaving(true);
    let content: Record<string, unknown>;
    switch (qType) {
      case "open":            content = { text, lines: Math.max(1, lines) }; break;
      case "multiple_choice": content = { text, options: options.filter(o => o.trim()), multi, correctIndex: correctIndex ?? null }; break;
      case "true_false":      content = { text, correct: tfCorrect ?? null }; break;
      case "cloze":           content = { text }; break;
      case "matching":        content = { text, pairs: pairs.filter(p => p.left.trim() || p.right.trim()) }; break;
      case "image":           content = { text, imageUrl, caption: imageCaption, lines: imageLines }; break;
      case "table":           content = { text, headers: tableHeaders, rows: tableRows }; break;
      case "ranking":         content = { text, items: rankItems.filter(i => i.trim()) }; break;
      case "drawing":         content = { text, heightMm: drawHeight }; break;
      default:                content = { text };
    }
    const rubric = { E: rubricE, C: rubricC, A: rubricA };
    const grade_points = { E: gpE, C: gpC, A: gpA };
    const patch: Partial<Question> = {
      content: content as never,
      points: points || null,
      subject: subject || null,
      cat: cat || null,
      difficulty: (difficulty as Difficulty) || null,
      status,
      rubric,
      grade_points,
      author: author || undefined,
      updated: "just nu",
    };
    if (mode === "create") {
      questionBank.create({ type: qType, ...patch });
    } else if (question) {
      questionBank.update(question.id, patch);
    }
    setSaving(false);
    onSaved();
  }

  const tabStyle = (t: "content" | "rubric"): React.CSSProperties => ({
    padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer",
    background: tab === t ? "var(--ps-paper)" : "transparent",
    color: tab === t ? "var(--ps-ink)" : "var(--ps-ink-3)",
    fontFamily: "var(--ps-ui)", fontSize: 13, fontWeight: tab === t ? 500 : 400,
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }} onClick={onClose}>
      <div style={{ maxHeight: "90vh", width: "100%", maxWidth: 620, overflow: "auto", borderRadius: 14, background: "var(--ps-paper)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{mode === "create" ? "Ny uppgift" : "Redigera uppgift"} · {TYPE_LABELS[qType]}</h3>
          <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "var(--ps-bg-soft)", borderRadius: 8, padding: 3, marginBottom: 18 }}>
          <button style={tabStyle("content")} onClick={() => setTab("content")}>Frågeinnehåll</button>
          <button style={tabStyle("rubric")} onClick={() => setTab("rubric")}>Bedömning</button>
        </div>

        {tab === "content" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Frågetext{qType === "cloze" ? " — använd ___ för luckor" : ""}</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="ps-input" style={{ width: "100%", marginTop: 4, resize: "vertical" }} />
            </div>

            {qType === "open" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</label>
                <input type="number" min={1} max={30} value={lines} onChange={e => setLines(Number(e.target.value) || 1)} className="ps-input" style={{ width: 100, marginTop: 4 }} />
              </div>
            )}

            {qType === "multiple_choice" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Svarsalternativ</label>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type={multi ? "checkbox" : "radio"} checked={multi ? false : correctIndex === i} onChange={() => !multi && setCorrectIndex(i)} style={{ flexShrink: 0 }} />
                      <input value={opt} onChange={e => setOptions(a => a.map((o, j) => j === i ? e.target.value : o))} placeholder={`Alternativ ${i + 1}`} className="ps-input" style={{ flex: 1 }} />
                      <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={() => setOptions(a => a.filter((_, j) => j !== i))} disabled={options.length <= 2}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setOptions(a => [...a, ""])} disabled={options.length >= 8}><Plus size={12} /> Lägg till alternativ</button>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12.5 }}>
                  <input type="checkbox" checked={multi} onChange={e => { setMulti(e.target.checked); setCorrectIndex(null); }} />
                  Flera korrekta svar tillåtna
                </label>
              </div>
            )}

            {qType === "true_false" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Rätt svar</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {[{ label: "Sant", val: 0 }, { label: "Falskt", val: 1 }, { label: "Ej satt", val: null as number | null }].map(({ label, val }) => (
                    <button key={label} onClick={() => setTfCorrect(val)}
                      style={{ padding: "8px 18px", borderRadius: 7, cursor: "pointer", background: tfCorrect === val ? "rgba(30,95,92,0.08)" : "var(--ps-bg-soft)", border: `1px solid ${tfCorrect === val ? "var(--ps-accent)" : "var(--ps-rule)"}`, color: tfCorrect === val ? "var(--ps-accent)" : "var(--ps-ink-2)", fontFamily: "var(--ps-ui)", fontSize: 13, fontWeight: tfCorrect === val ? 600 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {qType === "matching" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Par att matcha</label>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                  {pairs.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 6 }}>
                      <input value={p.left} placeholder="Vänster" onChange={e => setPairs(a => a.map((q, j) => j === i ? { ...q, left: e.target.value } : q))} className="ps-input" style={{ flex: 1 }} />
                      <input value={p.right} placeholder="Höger" onChange={e => setPairs(a => a.map((q, j) => j === i ? { ...q, right: e.target.value } : q))} className="ps-input" style={{ flex: 1 }} />
                      <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={() => setPairs(a => a.filter((_, j) => j !== i))} disabled={pairs.length <= 2}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setPairs(a => [...a, { left: "", right: "" }])}><Plus size={12} /> Lägg till par</button>
                </div>
              </div>
            )}

            {qType === "image" && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bild</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                    {imageUrl
                      ? <img src={imageUrl} alt="" style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", objectFit: "cover" }} />
                      : <div style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)" }}><Image size={16} /></div>}
                    <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                    <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => imgRef.current?.click()}>{imageUrl ? "Byt bild" : "Ladda upp"}</button>
                    {imageUrl && <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setImageUrl("")}>Ta bort</button>}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bildtext (valfri)</label>
                  <input value={imageCaption} onChange={e => setCaption(e.target.value)} className="ps-input" style={{ width: "100%", marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Skrivlinjer under bild (0 = inga)</label>
                  <input type="number" min={0} max={30} value={imageLines} onChange={e => setImgLines(Math.max(0, Number(e.target.value) || 0))} className="ps-input" style={{ width: 100, marginTop: 4 }} />
                </div>
              </>
            )}

            {qType === "table" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Tabell</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginTop: 6 }}>
                  <span>Kolumner:</span>
                  <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => ensureCols(tableHeaders.length - 1)} disabled={tableHeaders.length <= 1}>−</button>
                  <span>{tableHeaders.length}</span>
                  <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => ensureCols(tableHeaders.length + 1)} disabled={tableHeaders.length >= 6}>+</button>
                </div>
                <div style={{ overflowX: "auto", marginTop: 8 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                    <thead><tr>{tableHeaders.map((h, i) => (<th key={i} style={{ border: "1px solid var(--ps-rule)", padding: 4 }}><input value={h} onChange={e => setHeaders(a => a.map((x, j) => j === i ? e.target.value : x))} placeholder={`Rubrik ${i + 1}`} className="ps-input" style={{ fontSize: 11 }} /></th>))}</tr></thead>
                    <tbody>{tableRows.map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => (<td key={ci} style={{ border: "1px solid var(--ps-rule)", padding: 4 }}><input value={cell} onChange={e => setTableRows(rs => rs.map((r, j) => j === ri ? r.map((c2, k) => k === ci ? e.target.value : c2) : r))} className="ps-input" style={{ fontSize: 11 }} /></td>))}<td style={{ padding: 4 }}><button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={() => setTableRows(rs => rs.filter((_, j) => j !== ri))} disabled={tableRows.length <= 1}><Trash2 size={12} /></button></td></tr>))}</tbody>
                  </table>
                </div>
                <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ marginTop: 8 }} onClick={() => setTableRows(rs => [...rs, tableHeaders.map(() => "")])}><Plus size={12} /> Lägg till rad</button>
              </div>
            )}

            {qType === "ranking" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Föremål att rangordna</label>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                  {rankItems.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 6 }}>
                      <input value={it} onChange={e => setRankItems(a => a.map((x, j) => j === i ? e.target.value : x))} placeholder={`Föremål ${i + 1}`} className="ps-input" style={{ flex: 1 }} />
                      <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm" onClick={() => setRankItems(a => a.filter((_, j) => j !== i))} disabled={rankItems.length <= 2}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setRankItems(a => [...a, ""])}><Plus size={12} /> Lägg till</button>
                </div>
              </div>
            )}

            {qType === "drawing" && (
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Höjd på rityta (mm)</label>
                <input type="number" min={20} max={250} value={drawHeight} onChange={e => setDrawHeight(Math.max(20, Number(e.target.value) || 60))} className="ps-input" style={{ width: 100, marginTop: 4 }} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* Subject */}
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Ämne</label>
                {customSubject ? (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Nytt ämnesnamn" className="ps-input" style={{ flex: 1 }} />
                    <button type="button" className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => { setCustomSubject(false); setSubject(""); setCat(""); setCustomCat(false); setAddingSubject(false); }} title="Avbryt">↩</button>
                  </div>
                ) : addingSubject ? (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <input autoFocus value={newSubjectVal} onChange={e => setNewSubjectVal(e.target.value)}
                      placeholder="Nytt ämnesnamn" className="ps-input" style={{ flex: 1 }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newSubjectVal.trim()) {
                          taxonomy.addSubject(newSubjectVal.trim());
                          setSubject(newSubjectVal.trim());
                          setCat("");
                          setNewSubjectVal("");
                          setAddingSubject(false);
                          onTaxChange?.();
                        } else if (e.key === "Escape") { setAddingSubject(false); setNewSubjectVal(""); }
                      }}
                    />
                    <button type="button" className="ps-btn ps-btn-accent ps-btn-sm" onClick={() => {
                      if (!newSubjectVal.trim()) return;
                      taxonomy.addSubject(newSubjectVal.trim());
                      setSubject(newSubjectVal.trim());
                      setCat("");
                      setNewSubjectVal("");
                      setAddingSubject(false);
                      onTaxChange?.();
                    }}>Spara</button>
                    <button type="button" className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => { setAddingSubject(false); setNewSubjectVal(""); }}>✕</button>
                  </div>
                ) : (
                  <select value={subject} onChange={e => {
                    if (e.target.value === "__add__") { setAddingSubject(true); }
                    else if (e.target.value === "__custom__") { setCustomSubject(true); setSubject(""); setCat(""); }
                    else { setSubject(e.target.value); setCat(""); setCustomCat(false); }
                  }} className="ps-input" style={{ width: "100%", marginTop: 4 }}>
                    <option value="">— Välj ämne —</option>
                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    <option disabled>─────────</option>
                    <option value="__add__">＋ Lägg till nytt ämne…</option>
                  </select>
                )}
              </div>

              {/* Category */}
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Kategori / Avsnitt</label>
                {customCat ? (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <input value={cat} onChange={e => setCat(e.target.value)} placeholder="Eget avsnitt" className="ps-input" style={{ flex: 1 }} />
                    <button type="button" className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => { setCustomCat(false); setCat(""); }} title="Avbryt">↩</button>
                  </div>
                ) : addingCat ? (
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <input autoFocus value={newCatVal} onChange={e => setNewCatVal(e.target.value)}
                      placeholder="Ny kategori" className="ps-input" style={{ flex: 1 }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newCatVal.trim() && subject) {
                          taxonomy.addCategory(subject, newCatVal.trim());
                          setCat(newCatVal.trim());
                          setNewCatVal("");
                          setAddingCat(false);
                          onTaxChange?.();
                        } else if (e.key === "Escape") { setAddingCat(false); setNewCatVal(""); }
                      }}
                    />
                    <button type="button" className="ps-btn ps-btn-accent ps-btn-sm" onClick={() => {
                      if (!newCatVal.trim() || !subject) return;
                      taxonomy.addCategory(subject, newCatVal.trim());
                      setCat(newCatVal.trim());
                      setNewCatVal("");
                      setAddingCat(false);
                      onTaxChange?.();
                    }}>Spara</button>
                    <button type="button" className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => { setAddingCat(false); setNewCatVal(""); }}>✕</button>
                  </div>
                ) : isKnownSubject ? (
                  <select value={cat} onChange={e => {
                    if (e.target.value === "__add__") setAddingCat(true);
                    else if (e.target.value === "__custom__") { setCustomCat(true); setCat(""); }
                    else setCat(e.target.value);
                  }} className="ps-input" style={{ width: "100%", marginTop: 4 }} disabled={!subject}>
                    <option value="">— Välj kategori —</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                    <option disabled>─────────</option>
                    <option value="__add__">＋ Lägg till ny kategori…</option>
                  </select>
                ) : (
                  <input value={cat} onChange={e => setCat(e.target.value)} placeholder="t.ex. Avsnitt 3" className="ps-input" style={{ width: "100%", marginTop: 4 }} />
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Svårighetsgrad</label>
                <select value={difficulty} onChange={e => setDiff(e.target.value as Difficulty | "")} className="ps-input" style={{ width: "100%", marginTop: 4 }}>
                  <option value="">—</option>
                  <option value="easy">Lätt</option>
                  <option value="medium">Medel</option>
                  <option value="hard">Svår</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as QuestionStatus)} className="ps-input" style={{ width: "100%", marginTop: 4 }}>
                  <option value="draft">Utkast</option>
                  <option value="review">Granska</option>
                  <option value="approved">Godkänd</option>
                  <option value="archived">Arkiverad</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Författare</label>
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Namn" className="ps-input" style={{ width: "100%", marginTop: 4 }} />
              </div>
            </div>
          </div>
        )}

        {tab === "rubric" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12.5, color: "var(--ps-ink-3)", lineHeight: 1.5 }}>
              Ange bedömningsanvisningar och poäng per betygssteg.
            </div>
            {(["E", "C", "A"] as const).map((g, gi) => (
              <div key={g} style={{ background: "var(--ps-bg-soft)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    border: "1.5px solid var(--ps-accent)", color: "var(--ps-accent)",
                    fontSize: 12, fontWeight: 700, fontFamily: "var(--ps-ui)",
                  }}>{g}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>
                    {g === "E" ? "Godtagbart" : g === "C" ? "Välutvecklat" : "Välutvecklat och nyanserat"}
                  </span>
                  <div style={{ flex: 1 }} />
                  <label style={{ fontSize: 11.5, color: "var(--ps-ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                    Poäng:
                    <input type="number" min={0} max={10} value={gi === 0 ? gpE : gi === 1 ? gpC : gpA}
                      onChange={e => { const v = Math.max(0, Number(e.target.value) || 0); if (gi === 0) setGpE(v); else if (gi === 1) setGpC(v); else setGpA(v); }}
                      className="ps-input" style={{ width: 60 }} />
                  </label>
                </div>
                <textarea
                  value={gi === 0 ? rubricE : gi === 1 ? rubricC : rubricA}
                  onChange={e => { if (gi === 0) setRubricE(e.target.value); else if (gi === 1) setRubricC(e.target.value); else setRubricA(e.target.value); }}
                  placeholder={`Vad krävs för ${g}…`}
                  rows={3}
                  className="ps-input"
                  style={{ width: "100%", resize: "vertical", fontSize: 12.5 }}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ps-btn ps-btn-outline" onClick={onClose}>Avbryt</button>
          <button className="ps-btn ps-btn-accent" onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara uppgift"}</button>
        </div>
      </div>
    </div>
  );
}

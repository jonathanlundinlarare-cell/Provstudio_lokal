/**
 * WordsearchPage — fristående ordpussel-editor.
 * A4-canvas (vänster) + inspector-panel (höger).
 * Sparar via useAutosave till documents-store.
 * Stödjer printMode (rendrerar only print-view för PDF-export).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, RefreshCw, Printer } from "lucide-react";
import { documents, scheduleSave } from "@/lib/local-db";
import { useAutosave } from "@/hooks/useAutosave";
import { generateWordSearch } from "@/lib/wordsearch-gen";
import type { WordsearchDocContent, WordSearchEntry, WordSearchSolution } from "@/lib/test-types";
import { toast } from "sonner";

interface Props {
  documentId: string;
  onBack: () => void;
  printMode?: boolean;
}

/* ── A4 canvas scale helper ─────────────────────────────────────────────── */
const A4_W_MM = 210;
const A4_H_MM = 297;
const MM_TO_PX = 3.7795275591; // 1mm = ~3.78px at 96dpi
const A4_W = A4_W_MM * MM_TO_PX;
const A4_H = A4_H_MM * MM_TO_PX;

function useA4Scale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    let rafId: number;
    function update() {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) {
        // Retry on next frame — layout may not be stable yet
        rafId = requestAnimationFrame(update);
        return;
      }
      const sw = width  / A4_W;
      const sh = height / A4_H;
      setScale(Math.min(sw, sh, 1) * 0.97);
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return scale;
}

/* ── Direction vectors (E SE S SW W NW N NE) ───────────────────────────── */
const DIRS: [number, number][] = [
  [0, 1],[1, 1],[1, 0],[1,-1],[0,-1],[-1,-1],[-1, 0],[-1, 1],
];
const DIR_ARROWS = ['→','↘','↓','↙','←','↖','↑','↗'];

function solutionCellSet(solution: WordSearchSolution[]): Set<string> {
  const cells = new Set<string>();
  for (const s of solution) {
    const word = s.word.toUpperCase().replace(/[^A-ZÅÄÖ]/g, '');
    const [dr, dc] = DIRS[s.dir];
    for (let i = 0; i < word.length; i++) {
      cells.add(`${s.row + dr * i},${s.col + dc * i}`);
    }
  }
  return cells;
}

/* ── Shared grid cell sizing ────────────────────────────────────────────── */
function cellDims(N: number) {
  const cellMm  = Math.min(8, Math.floor(160 / N));
  const cellPx  = cellMm * MM_TO_PX;
  const fontSize = Math.max(7, cellMm * 2.1);
  return { cellPx, fontSize };
}

/* ── WordsearchPrintView — the A4 page content (puzzle) ─────────────────── */
function WordsearchPrintView({ content }: { content: WordsearchDocContent }) {
  const N       = content.gridSize ?? 16;
  const grid    = content.grid ?? [];
  const hasGrid = grid.length > 0;
  const { cellPx, fontSize } = cellDims(N);

  return (
    <div style={{
      width: A4_W, height: A4_H,
      background: "#fff",
      padding: "14mm 14mm 10mm",
      boxSizing: "border-box",
      fontFamily: "var(--ps-ui, system-ui)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {content.title && (
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", color: "#14110D" }}>
            {content.title}
          </div>
          {content.subtitle && (
            <div style={{ fontSize: 11, color: "#6B6459", marginTop: 2 }}>{content.subtitle}</div>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, fontStyle: "italic", color: "#6B6459", marginBottom: 8, textAlign: "center" }}>
        {content.instructions || "Leta upp orden i rutnätet och ringa in dem."}
      </div>

      {hasGrid ? (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, ${cellPx}px)`, border: "1px solid #ccc" }}>
            {grid.flat().map((letter, i) => (
              <div key={i} style={{
                width: cellPx, height: cellPx,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize, fontFamily: "'Geist Mono','Courier New',monospace", fontWeight: 600,
                color: "#14110D", border: "0.3px solid #e5e5e5", boxSizing: "border-box",
              }}>
                {letter}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px dashed #ddd", borderRadius: 8, margin: "0 0 10mm",
          color: "#aaa", fontSize: 12, textAlign: "center", padding: 24,
        }}>
          Klicka på "Generera rutnät" i högermenyn<br />för att skapa pusselrutnätet
        </div>
      )}

      {content.entries.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5mm 8mm", marginTop: hasGrid ? 0 : "auto" }}>
          {content.entries.map((e, i) => (
            <div key={i} style={{ fontSize: 9, display: "flex", gap: "2mm", alignItems: "flex-start" }}>
              <span style={{ fontWeight: 700, flexShrink: 0, color: "#1E5F5C", minWidth: 16 }}>{i + 1}.</span>
              <span style={{ color: "#3a3730" }}>{e.clue || <em style={{ color: "#aaa" }}>Ingen ledtråd</em>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── WordsearchAnswerView — facit-sidan ─────────────────────────────────── */
function WordsearchAnswerView({ content }: { content: WordsearchDocContent }) {
  const N        = content.gridSize ?? 16;
  const grid     = content.grid ?? [];
  const solution = content.solution ?? [];
  const { cellPx, fontSize } = cellDims(N);
  const highlighted = solutionCellSet(solution);

  return (
    <div style={{
      width: A4_W, height: A4_H,
      background: "#fff",
      padding: "14mm 14mm 10mm",
      boxSizing: "border-box",
      fontFamily: "var(--ps-ui, system-ui)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Facit title */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#14110D" }}>
          {content.title ? `${content.title} — Facit` : "Facit"}
        </div>
      </div>

      {/* Grid with highlighted cells */}
      {grid.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, ${cellPx}px)`, border: "1px solid #ccc" }}>
            {grid.flat().map((letter, i) => {
              const row = Math.floor(i / N);
              const col = i % N;
              const hl  = highlighted.has(`${row},${col}`);
              return (
                <div key={i} style={{
                  width: cellPx, height: cellPx,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize, fontFamily: "'Geist Mono','Courier New',monospace", fontWeight: hl ? 700 : 500,
                  color: hl ? "#1E5F5C" : "#bbb",
                  background: hl ? "rgba(30,95,92,0.13)" : "transparent",
                  border: "0.3px solid #e5e5e5", boxSizing: "border-box",
                }}>
                  {letter}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Word list with positions */}
      {solution.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6B6459", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Svar
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5mm 8mm" }}>
            {solution.map((s, i) => (
              <div key={i} style={{ fontSize: 9, display: "flex", gap: "2mm", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, flexShrink: 0, color: "#1E5F5C", minWidth: 16 }}>{i + 1}.</span>
                <span style={{ fontWeight: 700, color: "#14110D" }}>{s.word}</span>
                <span style={{ color: "#9B8F83", fontSize: 8, marginLeft: 2 }}>
                  rad {s.row + 1}, kol {s.col + 1} {DIR_ARROWS[s.dir]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Input styles ───────────────────────────────────────────────────────── */
const psInput: React.CSSProperties = {
  width: "100%", padding: "5px 8px", fontSize: 12,
  border: "1px solid var(--ps-rule-2)", borderRadius: 5,
  background: "var(--ps-paper)", color: "var(--ps-ink)",
  outline: "none", boxSizing: "border-box",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--ps-ink-3)", marginBottom: 6,
};

/* ── Main component ─────────────────────────────────────────────────────── */
export default function WordsearchPage({ documentId, onBack, printMode = false }: Props) {
  const [loading, setLoading]   = useState(true);
  const [docTitle, setDocTitle] = useState("Namnlöst ordpussel");
  const [content, setContent]   = useState<WordsearchDocContent>({
    title: "", subtitle: "", instructions: "", entries: [], gridSize: 16,
  });
  const [generated, setGenerated] = useState(false);
  const [viewMode, setViewMode]   = useState<"puzzle"|"facit">("puzzle");

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scale = useA4Scale(canvasContainerRef);

  /* ── Load ── */
  useEffect(() => {
    const doc = documents.get(documentId);
    if (!doc) { setLoading(false); return; }
    setDocTitle(doc.title || "Namnlöst ordpussel");
    const stored = doc.wordsearch_content;
    if (stored) {
      setContent(stored);
      if (stored.grid && stored.grid.length > 0) setGenerated(true);
    } else {
      setContent(c => ({ ...c, title: doc.title || "" }));
    }
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  useAutosave(
    JSON.stringify({ docTitle, content }),
    () => {
      documents.update(documentId, { title: docTitle, wordsearch_content: content });
      scheduleSave();
    },
    loading,
  );

  /* ── Patch helpers ── */
  const patch = useCallback((delta: Partial<WordsearchDocContent>) => {
    setContent(c => ({ ...c, ...delta }));
  }, []);

  const patchEntry = useCallback((idx: number, delta: Partial<WordSearchEntry>) => {
    setContent(c => {
      const entries = c.entries.map((e, i) => i === idx ? { ...e, ...delta } : e);
      return { ...c, entries };
    });
  }, []);

  const addEntry    = useCallback(() => setContent(c => ({ ...c, entries: [...c.entries, { word: "", clue: "" }] })), []);
  const removeEntry = useCallback((idx: number) => setContent(c => ({ ...c, entries: c.entries.filter((_, i) => i !== idx) })), []);

  /* ── Generate ── */
  const handleGenerate = useCallback(() => {
    const valid = content.entries.filter(e => e.word.trim().length >= 2);
    if (valid.length === 0) {
      toast.error("Lägg till minst ett ord (minst 2 bokstäver) innan du genererar rutnätet.");
      return;
    }
    const { grid, solution } = generateWordSearch(
      valid.map(e => ({ word: e.word.toUpperCase().trim(), clue: e.clue })),
      content.gridSize ?? 16,
    );
    setContent(c => ({ ...c, grid, solution }));
    setGenerated(true);
    toast.success(`Rutnät genererat med ${valid.length} ord!`);
  }, [content.entries, content.gridSize]);

  /* ── PDF export ── */
  const handlePrint = useCallback(async () => {
    if (window.localAPI?.exportPdfWordsearch) {
      toast.info("Skapar PDF…");
      const res = await window.localAPI.exportPdfWordsearch(documentId, docTitle);
      if (res?.success) toast.success("PDF sparad! (pussel + facit)");
      else toast.info("PDF-export avbruten.");
    } else {
      window.print();
    }
  }, [documentId, docTitle]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span style={{ color: "var(--ps-ink-3)", fontSize: 13 }}>Laddar…</span>
      </div>
    );
  }

  /* ── Print / PDF mode — no chrome, just the pages ── */
  if (printMode) {
    // Inject the same width-reset as TestPrintMode so Chromium maps 794px→A4
    // 1:1 with no scaling (old main.js may still use a 900px window).
    const styleTag = document.getElementById('ps-print-reset') || (() => {
      const s = document.createElement('style');
      s.id = 'ps-print-reset';
      s.textContent = `
        html, body {
          margin: 0 !important; padding: 0 !important;
          width: 794px !important; max-width: 794px !important;
          overflow: visible !important; background: #fff !important;
        }
        @page { size: A4 portrait; margin: 0; }
      `;
      document.head.appendChild(s);
      return s;
    })();
    void styleTag; // used

    return (
      <div style={{ background: "#fff", margin: 0, padding: 0 }}>
        {/* Page 1: Puzzle */}
        <div style={{ width: A4_W, pageBreakAfter: "always", breakAfter: "page" }}>
          <WordsearchPrintView content={content} />
        </div>
        {/* Page 2: Facit */}
        <div style={{ width: A4_W }}>
          <WordsearchAnswerView content={content} />
        </div>
      </div>
    );
  }

  /* ── Normal editor mode ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Topbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", height: 44,
        borderBottom: "1px solid var(--ps-rule)",
        background: "var(--ps-paper)",
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ps-ink-3)", fontSize: 13, padding: "4px 6px", borderRadius: 5,
          }}
        >
          <ChevronLeft size={16} />
          Tillbaka
        </button>

        <div style={{ width: 1, height: 20, background: "var(--ps-rule-2)" }} />

        <input
          value={docTitle}
          onChange={e => setDocTitle(e.target.value)}
          style={{
            border: "none", background: "none", outline: "none",
            fontSize: 14, fontWeight: 600, color: "var(--ps-ink)",
            flex: 1, minWidth: 0,
          }}
          placeholder="Dokumentnamn"
        />

        <span style={{
          fontSize: 10.5, color: "var(--ps-ink-4)",
          background: "var(--ps-bg-soft)", border: "1px solid var(--ps-rule-2)",
          borderRadius: 4, padding: "1px 8px",
        }}>
          Ordpussel
        </span>

        {/* PDF export button */}
        <button
          onClick={handlePrint}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--ps-accent)", color: "#fff",
            border: "none", borderRadius: 5, padding: "4px 12px",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}
          title="Exportera pussel + facit som PDF"
        >
          <Printer size={13} />
          Skriv ut PDF
        </button>
      </div>

      {/* ── Body: canvas + panel ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* A4 Canvas area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* View toggle */}
          <div style={{
            display: "flex", gap: 6, padding: "8px 16px",
            borderBottom: "1px solid var(--ps-rule-2)",
            background: "var(--ps-paper)",
            flexShrink: 0,
          }}>
            {(["puzzle", "facit"] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  fontSize: 11.5, padding: "3px 12px", borderRadius: 4, cursor: "pointer",
                  border: viewMode === v ? "1px solid var(--ps-accent)" : "1px solid var(--ps-rule-2)",
                  background: viewMode === v ? "var(--ps-accent)" : "transparent",
                  color: viewMode === v ? "#fff" : "var(--ps-ink-3)",
                  fontWeight: viewMode === v ? 600 : 400,
                }}
              >
                {v === "puzzle" ? "Pussel" : "Facit"}
              </button>
            ))}
            {viewMode === "facit" && !generated && (
              <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", alignSelf: "center", marginLeft: 4 }}>
                Generera rutnätet för att se facit
              </span>
            )}
          </div>

          {/* A4 scaled canvas */}
          <div
            ref={canvasContainerRef}
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--ps-bg)",
              minHeight: 0,
            }}
          >
            {scale !== null && (
              <div style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                flexShrink: 0,
                boxShadow: "0 4px 32px rgba(20,17,13,0.14)",
                borderRadius: 2,
              }}>
                {viewMode === "puzzle"
                  ? <WordsearchPrintView content={content} />
                  : <WordsearchAnswerView content={content} />
                }
              </div>
            )}
          </div>
        </div>

        {/* Right inspector panel */}
        <div style={{
          width: 280, flexShrink: 0,
          borderLeft: "1px solid var(--ps-rule)",
          background: "var(--ps-paper)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Title fields */}
            <div>
              <div style={sectionLabel}>Titel</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  style={psInput}
                  placeholder="Rubrik t.ex. Ordpussel — Kapitel 3"
                  value={content.title ?? ""}
                  onChange={e => patch({ title: e.target.value })}
                />
                <input
                  style={psInput}
                  placeholder="Underrubrik (frivillig)"
                  value={content.subtitle ?? ""}
                  onChange={e => patch({ subtitle: e.target.value })}
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div style={sectionLabel}>Instruktion</div>
              <textarea
                style={{ ...psInput, resize: "vertical", minHeight: 48 }}
                placeholder="Leta upp orden i rutnätet och ringa in dem."
                value={content.instructions ?? ""}
                onChange={e => patch({ instructions: e.target.value })}
                rows={2}
              />
            </div>

            {/* Word list */}
            <div>
              <div style={{ ...sectionLabel, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Ord och ledtrådar</span>
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10.5, color: "var(--ps-ink-4)" }}>
                  {content.entries.length} ord
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {content.entries.map((entry, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 26px", gap: 4, alignItems: "center" }}>
                    <input
                      style={{ ...psInput, textTransform: "uppercase", fontFamily: "monospace", fontSize: 11 }}
                      placeholder="ORD"
                      value={entry.word}
                      onChange={e => patchEntry(i, { word: e.target.value.toUpperCase() })}
                    />
                    <input
                      style={{ ...psInput, fontSize: 11 }}
                      placeholder="Ledtråd…"
                      value={entry.clue}
                      onChange={e => patchEntry(i, { clue: e.target.value })}
                    />
                    <button
                      onClick={() => removeEntry(i)}
                      style={{
                        width: 26, height: 26, border: "none", cursor: "pointer",
                        background: "none", color: "var(--ps-ink-4)", borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                      title="Ta bort"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addEntry}
                style={{
                  marginTop: 8, width: "100%", padding: "5px 0",
                  border: "1px dashed var(--ps-rule-2)", borderRadius: 5,
                  background: "none", cursor: "pointer",
                  color: "var(--ps-ink-3)", fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Plus size={13} />
                Lägg till ord
              </button>
            </div>

            {/* Grid settings */}
            <div>
              <div style={sectionLabel}>Rutnät</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ps-ink-2)", flexShrink: 0 }}>Storlek</span>
                <select
                  value={content.gridSize ?? 16}
                  onChange={e => patch({ gridSize: Number(e.target.value), grid: undefined, solution: undefined })}
                  style={{ ...psInput, width: "auto", flex: 1 }}
                >
                  {[10, 12, 14, 16, 18, 20].map(s => (
                    <option key={s} value={s}>{s}×{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                style={{
                  width: "100%", padding: "7px 0",
                  background: "var(--ps-accent)", color: "#fff",
                  border: "none", borderRadius: 5, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <RefreshCw size={13} />
                {generated ? "Generera om rutnätet" : "Generera rutnät"}
              </button>

              {generated && (
                <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ps-ink-3)", textAlign: "center" }}>
                  ✓ {content.entries.filter(e => e.word.trim().length >= 2).length} ord placerade
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

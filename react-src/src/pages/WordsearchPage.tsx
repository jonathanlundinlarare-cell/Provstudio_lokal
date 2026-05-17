/**
 * WordsearchPage — fristående ordpussel-editor.
 * A4-canvas (vänster) + inspector-panel (höger).
 * Sparar via useAutosave till documents-store.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { documents, scheduleSave } from "@/lib/local-db";
import { useAutosave } from "@/hooks/useAutosave";
import { generateWordSearch } from "@/lib/wordsearch-gen";
import type { WordsearchDocContent, WordSearchEntry } from "@/lib/test-types";

interface Props {
  documentId: string;
  onBack: () => void;
}

/* ── A4 canvas scale helper ─────────────────────────────────────────────── */
const A4_W_MM = 210;
const A4_H_MM = 297;
const MM_TO_PX = 3.7795275591; // 1mm = ~3.78px at 96dpi

function useA4Scale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const sw = width  / (A4_W_MM * MM_TO_PX);
      const sh = height / (A4_H_MM * MM_TO_PX);
      setScale(Math.min(sw, sh, 1) * 0.92);
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return scale;
}

/* ── WordsearchPrintView — the A4 page content ──────────────────────────── */
function WordsearchPrintView({ content }: { content: WordsearchDocContent }) {
  const N        = content.gridSize ?? 16;
  const grid     = content.grid ?? [];
  const hasGrid  = grid.length > 0;
  const cellMm   = Math.min(8, Math.floor(160 / N));
  const cellPx   = cellMm * MM_TO_PX;
  const fontSize = Math.max(7, cellMm * 2.1);

  return (
    <div style={{
      width: A4_W_MM * MM_TO_PX,
      height: A4_H_MM * MM_TO_PX,
      background: "#fff",
      padding: "14mm 14mm 10mm",
      boxSizing: "border-box",
      fontFamily: "var(--ps-ui, system-ui)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Title */}
      {content.title && (
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", color: "#14110D" }}>
            {content.title}
          </div>
          {content.subtitle && (
            <div style={{ fontSize: 11, color: "#6B6459", marginTop: 2 }}>
              {content.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{ fontSize: 10, fontStyle: "italic", color: "#6B6459", marginBottom: 8, textAlign: "center" }}>
        {content.instructions || "Leta upp orden i rutnätet och ringa in dem."}
      </div>

      {/* Grid */}
      {hasGrid ? (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${N}, ${cellPx}px)`,
            border: "1px solid #ccc",
          }}>
            {grid.flat().map((letter, i) => (
              <div key={i} style={{
                width: cellPx, height: cellPx,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize,
                fontFamily: "'Geist Mono', 'Courier New', monospace",
                fontWeight: 600,
                color: "#14110D",
                border: "0.3px solid #e5e5e5",
                boxSizing: "border-box",
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

      {/* Clues — 2 columns */}
      {content.entries.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5mm 8mm",
          marginTop: hasGrid ? 0 : "auto",
        }}>
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
export default function WordsearchPage({ documentId, onBack }: Props) {
  const [loading, setLoading]   = useState(true);
  const [docTitle, setDocTitle] = useState("Namnlöst ordpussel");
  const [content, setContent]   = useState<WordsearchDocContent>({
    title: "",
    subtitle: "",
    instructions: "",
    entries: [],
    gridSize: 16,
  });
  const [generated, setGenerated] = useState(false);

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
      // Pre-fill title from doc title
      setContent(c => ({ ...c, title: doc.title || "" }));
    }
    setLoading(false);
  }, [documentId]);

  /* ── Autosave ── */
  useAutosave(
    JSON.stringify({ docTitle, content }),
    () => {
      documents.update(documentId, {
        title: docTitle,
        wordsearch_content: content,
      });
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

  const addEntry = useCallback(() => {
    setContent(c => ({ ...c, entries: [...c.entries, { word: "", clue: "" }] }));
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setContent(c => ({ ...c, entries: c.entries.filter((_, i) => i !== idx) }));
  }, []);

  /* ── Generate ── */
  const handleGenerate = useCallback(() => {
    const validEntries = content.entries.filter(e => e.word.trim().length >= 2);
    if (validEntries.length === 0) {
      alert("Lägg till minst ett ord (minst 2 bokstäver) innan du genererar rutnätet.");
      return;
    }
    const { grid, solution } = generateWordSearch(
      validEntries.map(e => ({ word: e.word.toUpperCase().trim(), clue: e.clue })),
      content.gridSize ?? 16,
    );
    setContent(c => ({ ...c, grid, solution }));
    setGenerated(true);
  }, [content.entries, content.gridSize]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span style={{ color: "var(--ps-ink-3)", fontSize: 13 }}>Laddar…</span>
      </div>
    );
  }

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
            color: "var(--ps-ink-3)", fontSize: 13, padding: "4px 6px",
            borderRadius: 5,
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
      </div>

      {/* ── Body: canvas + panel ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* A4 Canvas area */}
        <div
          ref={canvasContainerRef}
          style={{
            flex: 1, overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--ps-bg)",
          }}
        >
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            boxShadow: "0 4px 32px rgba(20,17,13,0.14)",
            borderRadius: 2,
          }}>
            <WordsearchPrintView content={content} />
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
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
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
                  {[12, 14, 16, 18, 20].map(s => (
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
                  ✓ Rutnät genererat med {content.entries.filter(e => e.word.trim().length >= 2).length} ord
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

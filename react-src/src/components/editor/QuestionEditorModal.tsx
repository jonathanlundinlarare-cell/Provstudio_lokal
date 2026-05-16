/**
 * QuestionEditorModal — Skapa eller redigera en fråga.
 * Stöder alla frågetyper inklusive source_critique (v2).
 */
import { useRef, useState } from "react";
import { questionBank } from "@/lib/local-db";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import {
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type DrawingContent,
  type FormulaContent,
  type ImageContent,
  type MatchingContent,
  type MultipleChoiceContent,
  type NumericContent,
  type OpenContent,
  type Question,
  type QuestionType,
  type RankingContent,
  type ShortAnswerContent,
  type SourceCritiqueContent,
  type TableContent,
  type TwoColumnContent,
} from "@/lib/test-types";

/* ─── Props ──────────────────────────────────────────────────────────── */

export interface QuestionEditorModalProps {
  mode: "create" | "edit";
  type?: QuestionType;
  question?: Question;
  defaultLines: number;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function QuestionEditorModal({
  mode, type, question, defaultLines, onClose, onSaved,
}: QuestionEditorModalProps) {
  const qType: QuestionType = question?.type ?? type!;

  /* ── State ── */
  const [text, setText]           = useState((question?.content as { text?: string })?.text ?? "");
  const [lines, setLines]         = useState((question?.content as OpenContent)?.lines ?? defaultLines);
  const [options, setOptions]     = useState<string[]>((question?.content as MultipleChoiceContent)?.options ?? ["", ""]);
  const [multi, setMulti]         = useState((question?.content as MultipleChoiceContent)?.multi ?? false);
  const [pairs, setPairs]         = useState((question?.content as MatchingContent)?.pairs ?? [{ left: "", right: "" }, { left: "", right: "" }]);
  const [imageUrl, setImageUrl]   = useState((question?.content as ImageContent)?.imageUrl ?? "");
  const [imageCap, setImageCap]   = useState((question?.content as ImageContent)?.caption ?? "");
  const [imageLines, setImageLines] = useState((question?.content as ImageContent)?.lines ?? 0);
  const [headers, setHeaders]     = useState((question?.content as TableContent)?.headers ?? ["", ""]);
  const [tableRows, setTableRows] = useState((question?.content as TableContent)?.rows ?? [["", ""], ["", ""]]);
  const [rankItems, setRankItems] = useState((question?.content as RankingContent)?.items ?? ["", ""]);
  const [drawH, setDrawH]         = useState((question?.content as DrawingContent)?.heightMm ?? 60);

  /* Source critique */
  const srcContent = question?.content as SourceCritiqueContent | undefined;
  const [srcTitle, setSrcTitle]     = useState(srcContent?.sourceTitle ?? "");
  const [srcText, setSrcText]       = useState(srcContent?.sourceText ?? "");
  const [srcAttrib, setSrcAttrib]   = useState(srcContent?.sourceAttribution ?? "");
  const [srcImg, setSrcImg]         = useState(srcContent?.sourceImageUrl ?? "");
  const [srcCat, setSrcCat]         = useState(srcContent?.category ?? "");
  const [srcLines, setSrcLines]     = useState(srcContent?.lines ?? 4);

  /* v3 new types */
  const [shortLines, setShortLines]       = useState((question?.content as ShortAnswerContent)?.lines ?? 2);
  const [numUnit, setNumUnit]             = useState((question?.content as NumericContent)?.unit ?? "");
  const [essayLines, setEssayLines]       = useState((question?.content as { lines?: number })?.lines ?? 20);
  const [essayWordLimit, setEssayWordLimit] = useState((question?.content as { wordLimit?: number })?.wordLimit ?? 0);
  const [defTerm, setDefTerm]             = useState((question?.content as { term?: string })?.term ?? "");
  const [defLines, setDefLines]           = useState((question?.content as { lines?: number })?.lines ?? 3);
  const [twoColA, setTwoColA]             = useState((question?.content as TwoColumnContent)?.colA ?? "Kolumn A");
  const [twoColB, setTwoColB]             = useState((question?.content as TwoColumnContent)?.colB ?? "Kolumn B");
  const [twoRows, setTwoRows]             = useState((question?.content as TwoColumnContent)?.rows ?? 4);
  const [formula, setFormula]             = useState((question?.content as FormulaContent)?.formula ?? "");
  const [formulaLines, setFormulaLines]   = useState((question?.content as FormulaContent)?.lines ?? 5);

  /* Meta */
  const [points, setPoints]         = useState(question?.points ?? "");
  const [subject, setSubject]       = useState(question?.subject ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(question?.difficulty ?? "");
  const [saving, setSaving]         = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Helpers ── */
  const ensureCols = (n: number) => {
    setHeaders(h => { const a = [...h]; while (a.length < n) a.push(""); while (a.length > n) a.pop(); return a; });
    setTableRows(rs => rs.map(r => { const a = [...r]; while (a.length < n) a.push(""); while (a.length > n) a.pop(); return a; }));
  };

  const uploadImg = (file: File, onUrl: (u: string) => void) => {
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) onUrl(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  /* ── Save ── */
  const save = () => {
    setSaving(true);

    let content: Record<string, unknown>;
    switch (qType) {
      case "open":            content = { text, lines: Math.max(1, lines) };                           break;
      case "multiple_choice": content = { text, options: options.filter(o => o.trim()), multi };       break;
      case "true_false":
      case "cloze":           content = { text };                                                       break;
      case "matching":        content = { text, pairs: pairs.filter(p => p.left.trim() || p.right.trim()) }; break;
      case "image":           content = { text, imageUrl, caption: imageCap, lines: imageLines };      break;
      case "table":           content = { text, headers, rows: tableRows };                             break;
      case "ranking":         content = { text, items: rankItems };                                     break;
      case "drawing":         content = { text, heightMm: drawH };                                     break;
      case "source_critique": content = {
          text, sourceTitle: srcTitle, sourceText: srcText,
          sourceAttribution: srcAttrib,
          ...(srcImg ? { sourceImageUrl: srcImg } : {}),
          ...(srcCat ? { category: srcCat }       : {}),
          lines: srcLines,
        }; break;
      case "short_answer":    content = { text, lines: Math.max(1, shortLines) };                       break;
      case "numeric":         content = { text, unit: numUnit || undefined };                            break;
      case "essay":           content = { text, lines: Math.max(1, essayLines), wordLimit: essayWordLimit || undefined }; break;
      case "group":           content = { title: text, instructions: "" };                               break;
      case "definition":      content = { term: defTerm || text, lines: Math.max(1, defLines) };         break;
      case "diagram_label":   content = { text, imageUrl: imageUrl, labels: [], heightMm: drawH };       break;
      case "two_column":      content = { text, colA: twoColA, colB: twoColB, rows: Math.max(1, twoRows) }; break;
      case "formula":         content = { text, formula: formula || undefined, lines: Math.max(1, formulaLines) }; break;
      default: content = { text };
    }

    if (mode === "create") {
      const q = questionBank.create({
        type: qType,
        content: content as never,
        points: points || null,
        subject: subject || null,
        difficulty: (difficulty as import("@/lib/test-types").Difficulty) || null,
      });
      setSaving(false);
      onSaved(q.id);
    } else if (question) {
      questionBank.update(question.id, {
        content: content as never,
        points: points || null,
        subject: subject || null,
        difficulty: (difficulty as import("@/lib/test-types").Difficulty) || null,
      });
      setSaving(false);
      onSaved();
    }
  };

  /* ── Render ── */
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ maxHeight: "90vh", width: "100%", maxWidth: 620, overflow: "auto", borderRadius: 14, background: "var(--ps-paper)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px", fontFamily: "var(--ps-ui)" }}>
          {mode === "create" ? "Ny fråga" : "Redigera fråga"} · {QUESTION_TYPE_LABELS[qType]}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Question text */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>
              Frågetext{qType === "cloze" ? " — använd ___ för luckor" : ""}
            </span>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              className="ps-input" style={{ width: "100%", resize: "vertical" }} />
          </label>

          {/* Open */}
          {qType === "open" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</span>
              <input type="number" min={1} max={30} value={lines}
                onChange={e => setLines(Number(e.target.value) || 1)}
                className="ps-input" style={{ width: 100 }} />
            </label>
          )}

          {/* Multiple choice */}
          {qType === "multiple_choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Svarsalternativ</span>
              {options.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input value={opt} onChange={e => setOptions(a => a.map((o, j) => j === i ? e.target.value : o))}
                    placeholder={`Alternativ ${i + 1}`} className="ps-input" style={{ flex: 1 }} />
                  <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    onClick={() => setOptions(a => a.filter((_, j) => j !== i))} disabled={options.length <= 2}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setOptions(a => [...a, ""])} disabled={options.length >= 8}>
                <Plus size={12} /> Lägg till alternativ
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} />
                Flera korrekta svar tillåtna
              </label>
            </div>
          )}

          {/* Matching */}
          {qType === "matching" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Par att matcha</span>
              {pairs.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input value={p.left} placeholder="Vänster"
                    onChange={e => setPairs(a => a.map((q, j) => j === i ? { ...q, left: e.target.value } : q))}
                    className="ps-input" style={{ flex: 1 }} />
                  <input value={p.right} placeholder="Höger"
                    onChange={e => setPairs(a => a.map((q, j) => j === i ? { ...q, right: e.target.value } : q))}
                    className="ps-input" style={{ flex: 1 }} />
                  <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    onClick={() => setPairs(a => a.filter((_, j) => j !== i))} disabled={pairs.length <= 2}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setPairs(a => [...a, { left: "", right: "" }])}>
                <Plus size={12} /> Lägg till par
              </button>
            </div>
          )}

          {/* Image */}
          {qType === "image" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bild</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {imageUrl
                    ? <img src={imageUrl} alt="" style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", objectFit: "cover" }} />
                    : <div style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)" }}><Upload size={16} /></div>}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f, setImageUrl); e.target.value = ""; }} />
                  <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => fileRef.current?.click()}>
                    {imageUrl ? "Byt bild" : "Ladda upp"}
                  </button>
                  {imageUrl && <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setImageUrl("")}>Ta bort</button>}
                </div>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bildtext (valfri)</span>
                <input value={imageCap} onChange={e => setImageCap(e.target.value)} className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Skrivlinjer under bild (0 = inga)</span>
                <input type="number" min={0} max={30} value={imageLines}
                  onChange={e => setImageLines(Math.max(0, Number(e.target.value) || 0))}
                  className="ps-input" style={{ width: 100 }} />
              </label>
            </>
          )}

          {/* Source critique */}
          {qType === "source_critique" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Källtyp (valfri)</span>
                <input value={srcCat} onChange={e => setSrcCat(e.target.value)}
                  placeholder="t.ex. Tidningsartikel, Graf, Statistik" className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Källans titel</span>
                <input value={srcTitle} onChange={e => setSrcTitle(e.target.value)} className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Källtext</span>
                <textarea value={srcText} onChange={e => setSrcText(e.target.value)} rows={5}
                  className="ps-input" style={{ width: "100%", resize: "vertical" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Attribution / upphovsman</span>
                <input value={srcAttrib} onChange={e => setSrcAttrib(e.target.value)}
                  placeholder="t.ex. Aftonbladet, 12 mars 2024" className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bild till källan (URL, valfri)</span>
                <input value={srcImg} onChange={e => setSrcImg(e.target.value)}
                  placeholder="https://..." className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Skrivlinjer för elevens svar</span>
                <input type="number" min={1} max={30} value={srcLines}
                  onChange={e => setSrcLines(Number(e.target.value) || 4)}
                  className="ps-input" style={{ width: 100 }} />
              </label>
            </>
          )}

          {/* Table */}
          {qType === "table" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ps-ink-3)" }}>
                <span>Kolumner:</span>
                <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => ensureCols(headers.length - 1)} disabled={headers.length <= 1}>−</button>
                <span style={{ fontFeatureSettings: '"tnum"' }}>{headers.length}</span>
                <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => ensureCols(headers.length + 1)} disabled={headers.length >= 6}>+</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>{headers.map((h, i) => (
                      <th key={i} style={{ border: "1px solid var(--ps-rule)", padding: 4 }}>
                        <input value={h} onChange={e => setHeaders(a => a.map((x, j) => j === i ? e.target.value : x))}
                          placeholder={`Rubrik ${i + 1}`} className="ps-input" style={{ fontSize: 11 }} />
                      </th>
                    ))}</tr>
                  </thead>
                  <tbody>{tableRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ border: "1px solid var(--ps-rule)", padding: 4 }}>
                          <input value={cell}
                            onChange={e => setTableRows(rs => rs.map((r, j) => j === ri ? r.map((c, k) => k === ci ? e.target.value : c) : r))}
                            className="ps-input" style={{ fontSize: 11 }} />
                        </td>
                      ))}
                      <td style={{ padding: 4 }}>
                        <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                          onClick={() => setTableRows(rs => rs.filter((_, j) => j !== ri))} disabled={tableRows.length <= 1}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setTableRows(rs => [...rs, headers.map(() => "")])}>
                <Plus size={12} /> Lägg till rad
              </button>
            </div>
          )}

          {/* Ranking */}
          {qType === "ranking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Föremål att rangordna</span>
              {rankItems.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input value={it} onChange={e => setRankItems(a => a.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Föremål ${i + 1}`} className="ps-input" style={{ flex: 1 }} />
                  <button className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    onClick={() => setRankItems(a => a.filter((_, j) => j !== i))} disabled={rankItems.length <= 2}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button className="ps-btn ps-btn-outline ps-btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setRankItems(a => [...a, ""])}>
                <Plus size={12} /> Lägg till
              </button>
            </div>
          )}

          {/* Drawing */}
          {qType === "drawing" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Höjd på rityta (mm)</span>
              <input type="number" min={20} max={250} value={drawH}
                onChange={e => setDrawH(Math.max(20, Number(e.target.value) || 60))}
                className="ps-input" style={{ width: 100 }} />
            </label>
          )}

          {/* Short answer */}
          {qType === "short_answer" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</span>
              <input type="number" min={1} max={10} value={shortLines}
                onChange={e => setShortLines(Number(e.target.value) || 1)}
                className="ps-input" style={{ width: 100 }} />
            </label>
          )}

          {/* Numeric */}
          {qType === "numeric" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Enhet (valfri, t.ex. "km", "kg")</span>
              <input value={numUnit} onChange={e => setNumUnit(e.target.value)} placeholder="enhets-sträng" className="ps-input" style={{ width: 160 }} />
            </label>
          )}

          {/* Essay */}
          {qType === "essay" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</span>
                <input type="number" min={5} max={60} value={essayLines}
                  onChange={e => setEssayLines(Number(e.target.value) || 20)}
                  className="ps-input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Ordgräns (0 = ingen)</span>
                <input type="number" min={0} max={2000} value={essayWordLimit}
                  onChange={e => setEssayWordLimit(Number(e.target.value) || 0)}
                  className="ps-input" />
              </label>
            </div>
          )}

          {/* Definition */}
          {qType === "definition" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Begrepp att definiera</span>
                <input value={defTerm} onChange={e => setDefTerm(e.target.value)} className="ps-input" placeholder="t.ex. Revolution" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</span>
                <input type="number" min={1} max={10} value={defLines}
                  onChange={e => setDefLines(Number(e.target.value) || 3)}
                  className="ps-input" style={{ width: 100 }} />
              </label>
            </div>
          )}

          {/* Two column comparison */}
          {qType === "two_column" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Kolumn A-rubrik</span>
                  <input value={twoColA} onChange={e => setTwoColA(e.target.value)} className="ps-input" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Kolumn B-rubrik</span>
                  <input value={twoColB} onChange={e => setTwoColB(e.target.value)} className="ps-input" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Rader</span>
                  <input type="number" min={1} max={20} value={twoRows}
                    onChange={e => setTwoRows(Number(e.target.value) || 4)}
                    className="ps-input" />
                </label>
              </div>
            </div>
          )}

          {/* Formula */}
          {qType === "formula" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Formel (valfri)</span>
                <input value={formula} onChange={e => setFormula(e.target.value)} className="ps-input" placeholder="t.ex. v = s/t" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Antal skrivlinjer</span>
                <input type="number" min={1} max={30} value={formulaLines}
                  onChange={e => setFormulaLines(Number(e.target.value) || 5)}
                  className="ps-input" style={{ width: 100 }} />
              </label>
            </div>
          )}

          {/* Diagram label */}
          {qType === "diagram_label" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Bild</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {imageUrl
                    ? <img src={imageUrl} alt="" style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", objectFit: "cover" }} />
                    : <div style={{ height: 48, width: 48, borderRadius: 4, border: "1px solid var(--ps-rule)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)" }}><Upload size={16} /></div>}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f, setImageUrl); e.target.value = ""; }} />
                  <button className="ps-btn ps-btn-outline ps-btn-sm" onClick={() => fileRef.current?.click()}>
                    {imageUrl ? "Byt bild" : "Ladda upp"}
                  </button>
                </div>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Höjd på diagramyta (mm)</span>
                <input type="number" min={20} max={200} value={drawH}
                  onChange={e => setDrawH(Math.max(20, Number(e.target.value) || 80))}
                  className="ps-input" style={{ width: 100 }} />
              </label>
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Ämne</span>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="t.ex. Historia" className="ps-input" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Svårighetsgrad</span>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty | "")} className="ps-input">
                <option value="">—</option>
                <option value="easy">Lätt</option>
                <option value="medium">Medel</option>
                <option value="hard">Svår</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ps-ink-3)" }}>Poäng</span>
              <input value={points} onChange={e => setPoints(e.target.value)} placeholder="t.ex. 2" className="ps-input" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="ps-btn ps-btn-outline" onClick={onClose}>Avbryt</button>
          <button className="ps-btn ps-btn-accent" onClick={save} disabled={saving}>
            {saving ? "Sparar…" : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}

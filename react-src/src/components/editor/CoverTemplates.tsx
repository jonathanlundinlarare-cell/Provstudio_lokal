/**
 * CoverTemplates — six modern cover-page templates for Provstudio.
 * Ported from Forsattsblad-handoff/cover-templates.jsx with Editable wrappers.
 *
 * Every template is a fixed A4 (794×1123 px @ 96dpi) component. The text fields
 * are <Editable>; the user clicks any field on the rendered page and types.
 *
 * Each template takes (doc, accent, onChange) — onChange receives a patched doc.
 */
import React from "react";
import { Editable } from "./Editable";

/* ── Colors ──────────────────────────────────────────────────────────── */
const PAPER = "#FFFFFF";
const INK   = "#14110D";
const INK_2 = "#3A3530";
const INK_3 = "#6B6459";
const INK_4 = "#9A9286";
const RULE  = "#E4DED1";
const CREAM = "#F4F1EA";

/* ── Doc shape ───────────────────────────────────────────────────────── */
export interface CoverDoc {
  title: string;
  subtitle: string;
  course: string;
  school: string;
  teacher: string;
  date: string;
  grade: string;
  duration: string;
  points: number;
  questionCount: number;
  examNumber: string;
  /** Optional instruction line that some templates render. */
  instructions?: string;
  /** Optional uploaded image URL — only used by `imagery` template. */
  coverImageUrl?: string;
}

export type CoverTemplateId =
  | "editorial-index"
  | "color-block"
  | "swiss-grid"
  | "brief"
  | "official"
  | "imagery"
  | "none";

export interface CoverProps {
  doc: CoverDoc;
  accent?: string;
  onChange?: (patch: Partial<CoverDoc>) => void;
}

/* Helper: produce a patcher for a single field */
function fieldPatcher<K extends keyof CoverDoc>(onChange: CoverProps["onChange"], key: K) {
  return (v: string) => {
    if (!onChange) return;
    // Coerce numeric fields back to number
    if (key === "points" || key === "questionCount") {
      onChange({ [key]: parseInt(v, 10) || 0 } as Partial<CoverDoc>);
    } else {
      onChange({ [key]: v } as Partial<CoverDoc>);
    }
  };
}

/* ─────────── 01 · EDITORIAL INDEX ─────────── */
export const CoverEditorialIndex: React.FC<CoverProps> = ({ doc, accent = "#1E5F5C", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: PAPER, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    position: "relative", overflow: "hidden",
    padding: "64px 70px",
    display: "flex", flexDirection: "column",
  }}>
    {/* top rail */}
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
                  fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, color: INK_3,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  paddingBottom: 14, borderBottom: `1px solid ${INK}` }}>
      <Editable tag="span" value={doc.school} onChange={fieldPatcher(onChange, "school")} />
      <Editable tag="span" value={doc.course} onChange={fieldPatcher(onChange, "course")} style={{ color: accent }} />
      <span>Prov nr.&nbsp;
        <Editable tag="span" value={doc.examNumber} onChange={fieldPatcher(onChange, "examNumber")} />
        &nbsp;/ VT 26
      </span>
    </div>

    {/* Title block — bottom-left */}
    <div style={{ marginTop: "auto", maxWidth: 540 }}>
      <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11,
                    letterSpacing: "0.16em", color: accent,
                    textTransform: "uppercase", marginBottom: 18 }}>
        Skriftligt prov · Individuellt
      </div>
      <Editable
        tag="h1"
        value={doc.title}
        onChange={fieldPatcher(onChange, "title")}
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 116, lineHeight: 0.92, margin: 0,
          letterSpacing: "-0.025em", color: INK, fontWeight: 400,
        }}
      />
      <Editable
        tag="p"
        value={doc.subtitle}
        onChange={fieldPatcher(onChange, "subtitle")}
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
          fontSize: 22, color: INK_2, lineHeight: 1.32,
          margin: "18px 0 0", maxWidth: 480,
        }}
      />
    </div>

    {/* foot bar: meta */}
    <div style={{ marginTop: 56, paddingTop: 18, borderTop: `1px solid ${INK}`,
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24,
                  fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11,
                  color: INK_3, letterSpacing: "0.05em" }}>
      <MetaCell label="Datum"  value={doc.date}             onEdit={fieldPatcher(onChange, "date")} />
      <MetaCell label="Tid"    value={doc.duration}         onEdit={fieldPatcher(onChange, "duration")} />
      <MetaCell label="Frågor" value={`${doc.questionCount} st`} readOnly />
      <MetaCell label="Poäng"  value={`${doc.points} p`}    readOnly />
    </div>
  </div>
);

const MetaCell: React.FC<{ label: string; value: string; onEdit?: (v: string) => void; readOnly?: boolean }> = ({
  label, value, onEdit, readOnly,
}) => (
  <div>
    <div style={{ fontSize: 9, letterSpacing: "0.16em", color: INK_4, marginBottom: 6,
                  textTransform: "uppercase" }}>{label}</div>
    {readOnly
      ? <div style={{ fontSize: 13, color: INK, letterSpacing: "0.02em" }}>{value}</div>
      : <Editable tag="div" value={value} onChange={onEdit} style={{ fontSize: 13, color: INK, letterSpacing: "0.02em" }} />}
  </div>
);

/* ─────────── 02 · COLOR BLOCK ─────────── */
export const CoverColorBlock: React.FC<CoverProps> = ({ doc, accent = "#7A1F2B", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: PAPER, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ padding: "70px 70px 0", height: "38%",
                  display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10,
                    letterSpacing: "0.18em", color: INK_3, textTransform: "uppercase",
                    marginBottom: 28 }}>
        <Editable tag="span" value={doc.school} onChange={fieldPatcher(onChange, "school")} />
        <Editable tag="span" value={doc.course} onChange={fieldPatcher(onChange, "course")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 8,
          background: accent, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 44, lineHeight: 1,
        }}>P</div>
        <div>
          <div style={{ fontSize: 11, color: INK_4, letterSpacing: "0.12em",
                        textTransform: "uppercase", marginBottom: 4 }}>
            Prov · Kapitel&nbsp;
            <Editable tag="span" value={doc.examNumber} onChange={fieldPatcher(onChange, "examNumber")} />
          </div>
          <Editable
            tag="div"
            value={doc.subtitle}
            onChange={fieldPatcher(onChange, "subtitle")}
            style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22,
                     fontStyle: "italic", color: INK, letterSpacing: "-0.01em" }}
          />
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingBottom: 28,
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 18 }}>
        <StudentField l="Namn"  v="" />
        <StudentField l="Klass" v="" />
        <StudentField l="Datum" v={doc.date}                            onEdit={fieldPatcher(onChange, "date")} />
        <StudentField l="Poäng" v={`${doc.points} p · ${doc.duration}`} readOnly />
      </div>
    </div>

    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: "62%",
      background: accent, color: "white", padding: "82px 70px 76px",
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.08,
                    backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "20px 20px" }} />

      <div style={{ position: "relative" }}>
        <Editable
          tag="h1"
          value={doc.title}
          onChange={fieldPatcher(onChange, "title")}
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 132,
            lineHeight: 0.92, margin: 0, letterSpacing: "-0.03em",
            fontWeight: 400, color: "white",
          }}
        />
        <div style={{ marginTop: 26, height: 1, background: "rgba(255,255,255,0.4)", width: 120 }} />
        <Editable
          tag="p"
          value={doc.instructions || "Läs varje fråga noggrant. Visa hur du tänker — det räcker inte med rätt svar."}
          onChange={fieldPatcher(onChange, "instructions")}
          style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
                   fontSize: 22, lineHeight: 1.4, marginTop: 22, opacity: 0.92,
                   maxWidth: 480, color: "white" }}
        />
      </div>
    </div>
  </div>
);

const StudentField: React.FC<{ l: string; v: string; onEdit?: (v: string) => void; readOnly?: boolean }> = ({
  l, v, onEdit, readOnly,
}) => (
  <div>
    <div style={{ fontSize: 9.5, letterSpacing: "0.18em", color: INK_4,
                  textTransform: "uppercase", marginBottom: 8 }}>{l}</div>
    <div style={{
      fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 14,
      fontStyle: "italic", color: INK,
      minHeight: 22,
      borderBottom: v ? "none" : `1px solid ${INK_3}`,
    }}>
      {readOnly
        ? (v || " ")
        : <Editable tag="span" value={v} onChange={onEdit} />}
    </div>
  </div>
);

/* ─────────── 03 · SWISS GRID ─────────── */
export const CoverSwiss: React.FC<CoverProps> = ({ doc, accent = "#1E3A5F", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: CREAM, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    padding: "60px 64px",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  }}>
    {[[40, 40], [754, 40], [40, 1083], [754, 1083]].map(([x, y], i) => (
      <div key={i} style={{ position: "absolute", left: x - 6, top: y - 6,
                            width: 12, height: 12,
                            borderLeft: i % 2 === 0 ? `1px solid ${INK_3}` : "none",
                            borderRight: i % 2 === 1 ? `1px solid ${INK_3}` : "none",
                            borderTop: i < 2 ? `1px solid ${INK_3}` : "none",
                            borderBottom: i >= 2 ? `1px solid ${INK_3}` : "none" }} />
    ))}

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10, color: INK,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  paddingBottom: 14, borderBottom: `1px solid ${INK_3}` }}>
      <Editable tag="span" value={doc.school} onChange={fieldPatcher(onChange, "school")} />
      <span style={{ color: INK_3 }}>VT 2026</span>
    </div>

    <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "auto 1fr", gap: 36,
                  alignItems: "start" }}>
      <div>
        <div style={{ width: 220, position: "relative" }}>
          <div style={{ border: `1px solid ${INK}`, padding: "20px 18px 14px",
                        position: "relative" }}>
            <Editable
              tag="div"
              value={doc.examNumber}
              onChange={fieldPatcher(onChange, "examNumber")}
              style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
                       fontSize: 168, lineHeight: 0.78, color: INK,
                       letterSpacing: "-0.03em" }}
            />
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 26 }}>
        <Editable
          tag="div"
          value={doc.course}
          onChange={fieldPatcher(onChange, "course")}
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10.5,
                   letterSpacing: "0.2em", color: accent,
                   textTransform: "uppercase", marginBottom: 14 }}
        />
        <Editable
          tag="h1"
          value={doc.title}
          onChange={fieldPatcher(onChange, "title")}
          style={{ fontFamily: "'Geist', system-ui, sans-serif", fontSize: 64,
                   fontWeight: 500, lineHeight: 0.96, margin: 0,
                   letterSpacing: "-0.02em" }}
        />
        <Editable
          tag="p"
          value={doc.subtitle}
          onChange={fieldPatcher(onChange, "subtitle")}
          style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
                   fontSize: 20, color: INK_2, lineHeight: 1.35,
                   margin: "18px 0 0", maxWidth: 380 }}
        />
      </div>
    </div>

    <div style={{ marginTop: "auto", border: `1px solid ${INK}` }}>
      {[
        ["NAMN",   "",                          "KLASS",   doc.grade],
        ["DATUM",  doc.date,                    "TID",     doc.duration],
        ["FRÅGOR", `${doc.questionCount} st`,   "POÄNG",   `${doc.points} p`],
        ["LÄRARE", doc.teacher,                 "BETYG",   "E · C · A"],
      ].map((row, i, arr) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "100px 1fr 100px 1fr",
          borderBottom: i < arr.length - 1 ? `1px solid ${INK}` : "none",
          fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10,
        }}>
          <div style={{ padding: "10px 12px", background: INK, color: "white",
                        letterSpacing: "0.16em" }}>{row[0]}</div>
          <div style={{ padding: "10px 12px", letterSpacing: "0.04em", color: INK_2,
                        borderRight: `1px solid ${INK}` }}>{row[1] || " "}</div>
          <div style={{ padding: "10px 12px", background: INK, color: "white",
                        letterSpacing: "0.16em" }}>{row[2]}</div>
          <div style={{ padding: "10px 12px", letterSpacing: "0.04em", color: INK_2 }}>{row[3]}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ─────────── 04 · BRIEF ─────────── */
export const CoverBrief: React.FC<CoverProps> = ({ doc, accent = "#A87F1A", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: PAPER, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    padding: "60px 80px",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  }}>
    <div style={{ position: "absolute", inset: 40,
                  border: `1px solid ${RULE}`, pointerEvents: "none" }} />

    <div style={{ margin: "auto", textAlign: "center", maxWidth: 580 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 64 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: 99,
                                background: i === 1 ? accent : INK }} />
        ))}
      </div>

      <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11,
                    letterSpacing: "0.32em", color: accent,
                    textTransform: "uppercase", marginBottom: 36 }}>
        — Kapitel&nbsp;
        <Editable tag="span" value={doc.examNumber} onChange={fieldPatcher(onChange, "examNumber")} />
        &nbsp;—
      </div>

      <Editable
        tag="h1"
        value={doc.title}
        onChange={fieldPatcher(onChange, "title")}
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic",
                 fontSize: 108, lineHeight: 0.96, margin: 0,
                 letterSpacing: "-0.025em", fontWeight: 400 }}
      />

      <div style={{ width: 40, height: 1, background: INK,
                    margin: "44px auto" }} />

      <Editable
        tag="p"
        value={doc.subtitle}
        onChange={fieldPatcher(onChange, "subtitle")}
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 19,
                 color: INK_2, lineHeight: 1.55, fontStyle: "italic",
                 margin: 0, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}
      />

      <div style={{ marginTop: 80, fontFamily: "'Geist Mono', ui-monospace, monospace",
                    fontSize: 10, letterSpacing: "0.32em", color: INK_3,
                    textTransform: "uppercase",
                    display: "flex", justifyContent: "center", gap: 32 }}>
        <span>{doc.duration}</span>
        <span style={{ color: RULE }}>·</span>
        <span>{doc.questionCount} frågor</span>
        <span style={{ color: RULE }}>·</span>
        <span>{doc.points} p</span>
      </div>
    </div>

    <div style={{ position: "absolute", left: 80, right: 80, bottom: 88,
                  display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
      <SigField label="Namn" />
      <SigField label="Klass" />
    </div>
  </div>
);

const SigField: React.FC<{ label: string }> = ({ label }) => (
  <div>
    <div style={{ borderBottom: `1px solid ${INK_3}`, height: 22 }} />
    <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9,
                  letterSpacing: "0.2em", color: INK_4, marginTop: 6,
                  textTransform: "uppercase" }}>{label}</div>
  </div>
);

/* ─────────── 05 · OFFICIELLT ─────────── */
export const CoverOfficial: React.FC<CoverProps> = ({ doc, accent = "#1E3A5F", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: PAPER, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    padding: "80px 80px 60px",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  }}>
    {/* Stamp + title row */}
    <div style={{ display: "flex", alignItems: "flex-start", gap: 22, paddingBottom: 18,
                  borderBottom: "1.5px solid #111" }}>
      <div style={{
        width: 76, height: 76, border: `2px solid ${accent}`, borderRadius: 4,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: accent, fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9, lineHeight: 1.3,
        textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Newsreader', Georgia, serif",
                      letterSpacing: 0, marginBottom: 2 }}>P</div>
        <div>{(doc.course || "").split(" ")[0]}</div>
        <div>VT 26</div>
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ fontSize: 11, color: INK_3, letterSpacing: "0.14em",
                      textTransform: "uppercase", marginBottom: 6,
                      fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
          <Editable tag="span" value={doc.school} onChange={fieldPatcher(onChange, "school")} />
          &nbsp;·&nbsp;
          <Editable tag="span" value={doc.course} onChange={fieldPatcher(onChange, "course")} />
        </div>
        <Editable
          tag="h1"
          value={doc.title}
          onChange={fieldPatcher(onChange, "title")}
          style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 38, margin: 0, lineHeight: 1.05,
                   letterSpacing: "0.01em", textTransform: "uppercase", fontWeight: 700 }}
        />
        <Editable
          tag="div"
          value={doc.subtitle}
          onChange={fieldPatcher(onChange, "subtitle")}
          style={{ fontSize: 14, color: INK_2, fontStyle: "italic", marginTop: 4,
                   fontFamily: "'Newsreader', Georgia, serif" }}
        />
      </div>
    </div>

    {/* Meta table 2×2 */}
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, fontSize: 12 }}>
      <tbody>
        <tr>
          <td style={metaLabelTd}>NAMN</td>
          <td style={metaValTd}></td>
          <td style={metaLabelTd}>KLASS</td>
          <td style={metaValTd}></td>
        </tr>
        <tr>
          <td style={metaLabelTd}>DATUM</td>
          <td style={metaValTd}></td>
          <td style={metaLabelTd}>LÄRARE</td>
          <td style={metaValTd}></td>
        </tr>
      </tbody>
    </table>

    {/* Stats row */}
    <div style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`,
                  marginTop: 24, padding: "14px 0",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
      <StatCell value={doc.duration} label="Tid" />
      <StatCell value="Inga" label="Hjälpmedel" />
      <StatCell value={`${doc.points}`} label="Maxpoäng" />
    </div>

    {/* Instruction line */}
    <Editable
      tag="div"
      value={doc.instructions || "Skriv tydligt med blå eller svart penna. Räkna med att redovisa hur du tänkt även när det inte uttryckligen efterfrågas."}
      onChange={fieldPatcher(onChange, "instructions")}
      style={{ fontSize: 12, color: INK_2, fontStyle: "italic",
               fontFamily: "'Newsreader', Georgia, serif", marginTop: 12 }}
    />

    {/* Footer */}
    <div style={{ marginTop: "auto", paddingTop: 12,
                  display: "flex", justifyContent: "space-between",
                  fontSize: 11, color: INK_3, fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
      <span>{doc.course}</span>
      <span>Sida 1</span>
    </div>
  </div>
);

const StatCell: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div>
    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22,
                  fontWeight: /^\d/.test(value) ? 700 : 600, color: INK }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: INK_3, marginTop: 2 }}>{label}</div>
  </div>
);

const metaLabelTd: React.CSSProperties = {
  border: `1px solid ${RULE}`, padding: "10px 12px",
  fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 9.5,
  letterSpacing: "0.14em", color: INK_3, textTransform: "uppercase",
  width: 90, verticalAlign: "middle",
};
const metaValTd: React.CSSProperties = {
  border: `1px solid ${RULE}`, padding: "10px 12px", height: 28,
};

/* ─────────── 06 · BILDMOTIV ─────────── */
export const CoverImagery: React.FC<CoverProps> = ({ doc, accent = "#1E3A5F", onChange }) => (
  <div style={{
    width: 794, height: 1123,
    background: PAPER, color: INK,
    fontFamily: "'Geist', system-ui, sans-serif",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column",
  }}>
    <div style={{ padding: "80px 76px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10.5,
                    letterSpacing: "0.22em", color: INK_3, textTransform: "uppercase",
                    marginBottom: 26 }}>
        <Editable tag="span" value={doc.school} onChange={fieldPatcher(onChange, "school")} />
        &nbsp;·&nbsp;
        <Editable tag="span" value={doc.course} onChange={fieldPatcher(onChange, "course")} />
      </div>

      <Editable
        tag="h1"
        value={doc.title}
        onChange={fieldPatcher(onChange, "title")}
        style={{ fontFamily: "'Geist', system-ui, sans-serif", fontSize: 72, margin: 0,
                 lineHeight: 0.96, fontWeight: 800, letterSpacing: "-0.025em",
                 textTransform: "uppercase", wordBreak: "break-word" }}
      />

      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8,
                    marginTop: 14 }}>
        <Editable
          tag="div"
          value={doc.subtitle}
          onChange={fieldPatcher(onChange, "subtitle")}
          style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic",
                   fontSize: 22, color: INK_2 }}
        />
        <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10,
                       letterSpacing: "0.16em", color: INK_4,
                       padding: "2px 6px", border: `1px solid ${RULE}`, borderRadius: 3 }}>
          V.<Editable tag="span" value={doc.examNumber} onChange={fieldPatcher(onChange, "examNumber")} />
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 38,
                    fontSize: 13, color: INK_2 }}>
        <span>
          <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10.5,
                          letterSpacing: "0.16em", color: accent,
                          textTransform: "uppercase", marginRight: 8 }}>Namn</span>
          <span style={{ display: "inline-block", borderBottom: `1px solid ${INK_3}`,
                          minWidth: 220, height: 18 }}>&nbsp;</span>
        </span>
        <span>
          <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 10.5,
                          letterSpacing: "0.16em", color: accent,
                          textTransform: "uppercase", marginRight: 8 }}>Klass</span>
          <span style={{ display: "inline-block", borderBottom: `1px solid ${INK_3}`,
                          minWidth: 90, height: 18 }}>&nbsp;</span>
        </span>
      </div>
    </div>

    <div style={{ marginTop: "auto", height: 540, position: "relative",
                  WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 28%, black 92%, transparent 100%)",
                  maskImage: "linear-gradient(180deg, transparent 0%, black 28%, black 92%, transparent 100%)" }}>
      {doc.coverImageUrl ? (
        <img src={doc.coverImageUrl} alt="" style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
        }} />
      ) : (
        <PaintingPlaceholder accent={accent} />
      )}
    </div>
  </div>
);

const PaintingPlaceholder: React.FC<{ accent: string }> = ({ accent }) => (
  <svg viewBox="0 0 794 540" preserveAspectRatio="xMidYMid slice"
       style={{ width: "100%", height: "100%", display: "block" }}>
    <defs>
      <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D5C7A6" />
        <stop offset="1" stopColor="#B8A57E" />
      </linearGradient>
      <linearGradient id="ct-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7A6442" />
        <stop offset="1" stopColor="#4A3C28" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="794" height="320" fill="url(#ct-sky)" />
    <circle cx="560" cy="180" r="56" fill="#E8D5A6" opacity="0.7" />
    <path d="M0 280 L120 230 L240 270 L380 220 L520 250 L660 215 L794 240 L794 320 L0 320 Z"
          fill="#8C7E60" opacity="0.7" />
    <g fill="#5C4A30" opacity="0.9">
      <rect x="110" y="260" width="60" height="80" />
      <polygon points="110,260 140,235 170,260" />
      <rect x="180" y="250" width="40" height="90" />
      <rect x="240" y="240" width="80" height="100" />
      <polygon points="240,240 280,215 320,240" />
      <rect x="460" y="260" width="50" height="80" />
      <rect x="540" y="245" width="70" height="95" />
      <polygon points="540,245 575,220 610,245" />
      <rect x="640" y="265" width="40" height="75" />
    </g>
    <rect x="0" y="320" width="794" height="220" fill="url(#ct-ground)" />
    <g fill="#2C2418" opacity="0.85">
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (i * 28) + 20 + ((i % 3) * 4);
        const y = 360 + ((i % 4) * 15);
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <circle cx="0" cy="0" r="7" />
            <rect x="-9" y="6" width="18" height="42" rx="3" />
          </g>
        );
      })}
    </g>
    <rect x="0" y="0" width="794" height="540" fill={accent} opacity="0.08" />
  </svg>
);

/* ─────────── Template registry ─────────── */
export const COVER_TEMPLATES: Array<{
  id: CoverTemplateId;
  name: string;
  desc: string;
  Component: React.FC<CoverProps> | null;
  defaultAccent: string;
}> = [
  { id: "editorial-index", name: "Editorial",  desc: "Magasin · italic",      Component: CoverEditorialIndex, defaultAccent: "#1E5F5C" },
  { id: "color-block",     name: "Färgblock",  desc: "Mättad färgpanel",      Component: CoverColorBlock,    defaultAccent: "#7A1F2B" },
  { id: "swiss-grid",      name: "Swiss",      desc: "Arkitektoniskt rutnät", Component: CoverSwiss,         defaultAccent: "#1E3A5F" },
  { id: "brief",           name: "Brief",      desc: "Mycket luft",           Component: CoverBrief,         defaultAccent: "#A87F1A" },
  { id: "official",        name: "Officiellt", desc: "Stämpel + metatabell",  Component: CoverOfficial,      defaultAccent: "#1E3A5F" },
  { id: "imagery",         name: "Bildmotiv",  desc: "Bild med fade",         Component: CoverImagery,       defaultAccent: "#1E3A5F" },
  { id: "none",            name: "Ingen",      desc: "Hoppa över sidan",      Component: null,                defaultAccent: "#6B6459" },
];

export function getCoverComponent(id: CoverTemplateId | undefined): React.FC<CoverProps> | null {
  if (!id || id === "none") return null;
  const entry = COVER_TEMPLATES.find(t => t.id === id);
  return entry?.Component ?? null;
}

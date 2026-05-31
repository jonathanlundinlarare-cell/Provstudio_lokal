/**
 * AssessmentBlock + AnswerKeyBox
 * Renderingskomponenter för facit-läget i PrintableTest.
 * Extraherade från PrintableTest.tsx för att hålla nere filstorleken.
 */

import React from "react";
import type { Question, DefinitionContent, RankingContent } from "@/lib/test-types";

/* ─── Answer key box ─────────────────────────────────────────────────── */

export function AnswerKeyBox({ q, accent }: { q: Question; accent: string }) {
  const c = q.content as Record<string, unknown>;

  let answerNode: React.ReactNode = null;

  if (q.type === "multiple_choice") {
    // Correct answers shown inline in option boxes — no text box needed
    return null;
  } else if (q.type === "true_false") {
    const val = c.correct as number | null | undefined;
    if (val === null || val === undefined) return null;
    answerNode = <span style={{ fontWeight: 600 }}>{val === 0 ? "Sant" : "Falskt"}</span>;
  } else if (q.type === "matching") {
    // Matching answers are shown inline by QuestionBody when showAnswers=true
    return null;
  } else if (q.type === "definition") {
    const dc = q.content as DefinitionContent;
    if (dc.terms && dc.terms.length > 0) {
      const hasDefs = dc.terms.some(t => t.def);
      if (!hasDefs) return null;
      answerNode = (
        <div style={{ display: "flex", flexDirection: "column", gap: "1mm", marginTop: "1mm" }}>
          {dc.terms.filter(t => t.def).map((t, i) => (
            <div key={i} style={{ display: "flex", gap: "2mm" }}>
              <span style={{ fontWeight: 700, minWidth: "24mm", flexShrink: 0 }}
                dangerouslySetInnerHTML={{ __html: t.term }} />
              <span dangerouslySetInnerHTML={{ __html: t.def }} />
            </div>
          ))}
        </div>
      );
    } else {
      return null;
    }
  } else if (q.type === "short_answer" || q.type === "numeric") {
    const answer = (c.answer as string | undefined) ?? (c.model as string | undefined);
    if (!answer) return null;
    answerNode = <span style={{ fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: answer }} />;
  } else if (q.type === "cloze") {
    const text = (c.text as string) ?? "";
    const blanks = text.match(/_{3,}/g);
    const answers = (c.answers as string[] | undefined) ?? (c.model as string[] | undefined);
    if (!answers || answers.length === 0) {
      if (!blanks) return null;
      answerNode = <span style={{ color: "#777" }}>{blanks.length} luckor</span>;
    } else {
      answerNode = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1mm 5mm" }}>
          {answers.map((a, i) => (
            <span key={i}>
              <span style={{ fontWeight: 700, color: accent, fontSize: 9 }}>{i + 1}.</span>{" "}
              <span style={{ fontWeight: 500 }}>{a}</span>
            </span>
          ))}
        </div>
      );
    }
  } else if (q.type === "ranking") {
    const rc = q.content as RankingContent;
    const items = rc.items ?? [];
    if (items.length === 0) return null;
    answerNode = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1mm 5mm" }}>
        {items.map((item, i) => (
          <span key={i}>
            <span style={{ fontWeight: 700, color: accent, fontSize: 9 }}>{i + 1}.</span>{" "}
            <span style={{ fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: item }} />
          </span>
        ))}
      </div>
    );
  } else {
    return null;
  }

  if (!answerNode) return null;

  return (
    <div style={{
      marginTop: "3.5mm",
      padding: "2.5mm 5mm",
      background: accent + "10",
      border: `1.2px solid ${accent}40`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: "0 4px 4px 0",
      fontSize: 10,
      color: "#222",
      lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 700, color: accent, fontSize: 8.5, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "1.5mm" }}>
        Svar
      </div>
      {answerNode}
    </div>
  );
}

/* ─── Assessment block (facit mode) ─────────────────────────────────── */

export function AssessmentBlock({ q, accent, bodyFont: bfProp }: { q: Question; accent: string; bodyFont?: string }) {
  const resolvedBodyFont = bfProp ?? "system-ui, sans-serif";
  const mode = q.assessment_mode ?? "standard";

  // Standard mode: show rubric (E/C/A texts) if any exist
  if (mode === "standard") {
    const rub = q.rubric;
    if (!rub) return null;
    const grades: Array<{ label: string; text: string; color: string }> = [
      { label: "E", text: rub.E ?? "", color: "#2e7d32" },
      { label: "C", text: rub.C ?? "", color: "#1565c0" },
      { label: "A", text: rub.A ?? "", color: "#6a1b9a" },
    ].filter(g => g.text.trim());
    if (grades.length === 0) return null;
    return (
      <div style={{ marginTop: "3mm", display: "flex", flexDirection: "column", gap: "1.5mm" }}>
        {grades.map(g => (
          <div key={g.label} style={{
            padding: "1.5mm 3mm",
            background: g.color + "0d",
            borderLeft: `2px solid ${g.color}`,
            borderRadius: "0 3px 3px 0",
            fontSize: 9,
            color: "#333",
            lineHeight: 1.4,
          }}>
            <span style={{ fontWeight: 700, color: g.color, marginRight: 4 }}>{g.label}:</span>
            <span dangerouslySetInnerHTML={{ __html: g.text }} />
          </div>
        ))}
      </div>
    );
  }

  // Optional mode: show assessment_text + total or E/C/A points
  if (mode === "optional") {
    const text = q.assessment_text ?? "";
    const useGradePoints = q.assessment_use_grade_points ?? false;
    if (!text && !useGradePoints && !q.points) return null;
    return (
      <div style={{
        marginTop: "3mm",
        padding: "2mm 4mm",
        background: accent + "0d",
        borderLeft: `2px solid ${accent}`,
        borderRadius: "0 3px 3px 0",
        fontSize: 9,
        color: "#333",
        lineHeight: 1.5,
      }}>
        {useGradePoints && q.grade_points && (
          <div style={{ display: "flex", gap: "4mm", marginBottom: text ? "1.5mm" : 0 }}>
            {(["E", "C", "A"] as const).map(g => q.grade_points![g] != null && (
              <span key={g} style={{ fontWeight: 700 }}>
                <span style={{ color: accent }}>{g}:</span> {q.grade_points![g]} p
              </span>
            ))}
          </div>
        )}
        {!useGradePoints && q.points && (
          <div style={{ marginBottom: text ? "1.5mm" : 0 }}>
            <span style={{ fontWeight: 700, color: accent }}>Poäng: </span>{q.points} p
          </div>
        )}
        {text && <div dangerouslySetInnerHTML={{ __html: text }} />}
      </div>
    );
  }

  // NP-variant mode: multiple assessment questions + three comment sections
  if (mode === "np_variant") {
    const DEFAULT_CRITERIA = [
      { label: "Inga", points: 0 },
      { label: "En",   points: 1 },
      { label: "Två",  points: 2 },
      { label: "Tre",  points: 3 },
    ];

    // Support both new np_questions[] and legacy np_criteria[]
    const npQs = (q.np_questions && q.np_questions.length > 0)
      ? q.np_questions
      : q.np_criteria && q.np_criteria.length > 0
        ? [{ question: "", criteria: q.np_criteria }]
        : [{ question: "", criteria: DEFAULT_CRITERIA }];

    const comments: Array<{ label: string; text: string }> = [
      { label: "Kommentar med exempel på icke poänggivande svar", text: q.np_comment_non_scoring ?? "" },
      { label: "Några exempel på relevanta svar/anledningar",      text: q.np_comment_relevant    ?? "" },
      { label: "Några exempel på hur svaren kan förtydligas",      text: q.np_comment_elaborated  ?? "" },
    ].filter(c => c.text.trim());

    const borderClr = `${accent}44`;
    const dividerClr = `${accent}22`;

    const bodyFs = "var(--body-size, 11pt)";
    const bodyFont = resolvedBodyFont;

    return (
      <div style={{ marginTop: "4mm", display: "flex", flexDirection: "column", gap: "4mm", fontFamily: bodyFont }}>

        {/* Header */}
        <div style={{
          fontSize: "9.5pt",
          fontWeight: 700,
          color: accent,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          paddingBottom: "2mm",
          borderBottom: `0.5mm solid ${borderClr}`,
          fontFamily: bodyFont,
        }}>
          Bedömningsfrågor och exempelsvar
        </div>

        {/* One block per bedömningsfråga */}
        {npQs.map((bq, bqIdx) => {
          const crit = bq.criteria.length > 0 ? bq.criteria : DEFAULT_CRITERIA;
          return (
            <div key={bqIdx} style={{ border: `0.5mm solid ${borderClr}`, borderRadius: "2mm", overflow: "hidden", fontFamily: bodyFont }}>
              {/* Question header */}
              <div style={{
                padding: "2.5mm 4mm",
                background: accent + "14",
                borderBottom: `0.5mm solid ${borderClr}`,
                display: "flex",
                alignItems: "center",
                gap: "4mm",
              }}>
                <span style={{ fontSize: bodyFs, fontWeight: 700, color: accent, fontFamily: bodyFont }}>
                  Bedömningsfråga {bqIdx + 1}
                </span>
                {bq.question && (
                  <span style={{ fontSize: bodyFs, color: "#333", fontFamily: bodyFont }} dangerouslySetInnerHTML={{ __html: bq.question }} />
                )}
              </div>
              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 1fr",
                background: `${accent}08`,
                borderBottom: `0.4mm solid ${dividerClr}`,
              }}>
                {(["Nivå", "Poäng", "Anteckningar"] as const).map((h, hi) => (
                  <div key={h} style={{
                    padding: "1.5mm 4mm",
                    fontSize: "8pt",
                    fontWeight: 700,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: bodyFont,
                    borderRight: hi < 2 ? `0.3mm solid ${dividerClr}` : "none",
                  }}>{h}</div>
                ))}
              </div>
              {/* Criteria rows */}
              {crit.map((row, rIdx) => (
                <div key={rIdx} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70px 1fr",
                  borderBottom: rIdx < crit.length - 1 ? `0.3mm solid ${dividerClr}` : "none",
                }}>
                  <div style={{ padding: "2.5mm 4mm", fontSize: bodyFs, fontWeight: 600, color: "#1a1613", fontFamily: bodyFont, borderRight: `0.3mm solid ${dividerClr}` }}>
                    {row.label}
                  </div>
                  <div style={{ padding: "2.5mm 4mm", fontSize: bodyFs, fontWeight: 700, color: accent, fontFamily: bodyFont, borderRight: `0.3mm solid ${dividerClr}` }}>
                    {row.points} p
                  </div>
                  <div style={{ padding: "2.5mm 4mm", background: `${accent}04` }}>
                    &nbsp;
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Three comment sections */}
        {comments.map((c, idx) => (
          <div key={idx} style={{
            border: "0.4mm solid #E0D8C8",
            borderRadius: "2mm",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "2mm 4mm",
              background: "#F5F2EC",
              borderBottom: "0.3mm solid #E0D8C8",
              fontSize: "9.5pt",
              fontWeight: 700,
              color: "#555",
              fontFamily: bodyFont,
            }}>
              {c.label}:
            </div>
            <div style={{
              padding: "3mm 4mm",
              fontSize: bodyFs,
              color: "#333",
              lineHeight: 1.6,
              fontFamily: bodyFont,
            }}
              dangerouslySetInnerHTML={{ __html: c.text }}
            />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

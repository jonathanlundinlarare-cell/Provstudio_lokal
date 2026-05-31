/**
 * KursplanPanel — Kursplanskoppling (Lgr22 centralt innehåll)
 *
 * Visar hur ett dokuments frågor täcker det centrala innehållet för dokumentets
 * SO-ämne: täckningsgrad, kategori-för-kategori-status, vilka frågor som täcker
 * varje punkt, och vilka mål som saknas. Renderas som en flik i editorns
 * högerpanel.
 */

import React, { useMemo } from "react";
import { isQuestionRef, type Question, type QuestionOrderItem } from "@/lib/test-types";
import { getLgr22ForSubject, LGR22_SUBJECTS } from "@/lib/lgr22-so";

type Props = {
  subject: string;
  order: QuestionOrderItem[];
  bank: Question[];
  accent: string;
  onOpenBankPicker: () => void;
};

export function KursplanPanel({ subject, order, bank, accent, onOpenBankPicker }: Props) {
  const entries = getLgr22ForSubject(subject);

  const data = useMemo(() => {
    const bankMap = new Map(bank.map(q => [q.id, q]));

    // Numrera frågorna (endast frågereferenser räknas, i samma ordning som provet)
    const numbered: { q: Question; n: number }[] = [];
    let n = 0;
    for (const ref of order) {
      if (isQuestionRef(ref)) {
        n++;
        const q = bankMap.get(ref.question_id);
        if (q) numbered.push({ q, n });
      }
    }

    // Kod -> frågenummer som täcker den
    const codeToQs = new Map<string, number[]>();
    for (const { q, n: num } of numbered) {
      for (const code of q.lgr22 ?? []) {
        if (!codeToQs.has(code)) codeToQs.set(code, []);
        codeToQs.get(code)!.push(num);
      }
    }

    // Frågor helt utan kursplanskoppling
    const untagged = numbered.filter(({ q }) => !(q.lgr22 && q.lgr22.length > 0)).map(x => x.n);

    const covered = entries.filter(e => codeToQs.has(e.code)).length;
    const pct = entries.length ? Math.round((covered / entries.length) * 100) : 0;

    // Gruppera per kategori
    const categories: Array<{ name: string; entries: typeof entries }> = [];
    const catIndex = new Map<string, number>();
    for (const e of entries) {
      if (!catIndex.has(e.category)) {
        catIndex.set(e.category, categories.length);
        categories.push({ name: e.category, entries: [] });
      }
      categories[catIndex.get(e.category)!].entries.push(e);
    }

    const missing = entries.filter(e => !codeToQs.has(e.code));

    return { codeToQs, covered, pct, categories, missing, untagged, totalQuestions: numbered.length };
  }, [subject, order, bank, entries]);

  // Tomt läge: ämnet har ingen Lgr22-mappning
  if (entries.length === 0) {
    return (
      <div style={{ padding: "8px 2px" }}>
        <div style={{ fontSize: 12.5, color: "var(--ps-ink-3)", lineHeight: 1.6 }}>
          Kursplanskoppling finns för SO-ämnena: <strong>{LGR22_SUBJECTS.join(", ")}</strong>.
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ps-ink-4)", marginTop: 8, lineHeight: 1.6 }}>
          {subject
            ? <>Dokumentets ämne (<em>{subject}</em>) saknar inlagt centralt innehåll. Sätt ämnet till ett SO-ämne i fliken <strong>Dokument</strong> för att se täckning.</>
            : <>Välj ett SO-ämne i fliken <strong>Dokument</strong> för att se hur provet täcker kursplanen.</>}
        </div>
      </div>
    );
  }

  const barColor = data.pct >= 70 ? "#2D7A4F" : data.pct >= 40 ? accent : "#B7791F";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sammanfattning */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Täckning · {subject}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: barColor }}>{data.pct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--ps-bg-soft)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: `${data.pct}%`, height: "100%", background: barColor, borderRadius: 5, transition: "width .2s" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--ps-ink-4)", marginTop: 5 }}>
          {data.covered} av {entries.length} delar av det centrala innehållet täcks
          {data.totalQuestions > 0 && ` · ${data.totalQuestions} frågor`}
        </div>
      </div>

      {/* Saknade mål */}
      {data.missing.length > 0 && (
        <div style={{
          background: "#FFFBF0", border: "1px solid #F0D88A", borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8A6D1A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Ej täckta mål ({data.missing.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {data.missing.slice(0, 5).map(e => (
              <div key={e.code} style={{ fontSize: 11.5, color: "#6B4F00", lineHeight: 1.4, display: "flex", gap: 6 }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span><span style={{ color: "#9a7e2a" }}>{e.category} · </span>{e.label}</span>
              </div>
            ))}
            {data.missing.length > 5 && (
              <div style={{ fontSize: 11, color: "#9a7e2a", marginTop: 2 }}>+ {data.missing.length - 5} till…</div>
            )}
          </div>
          <button
            onClick={onOpenBankPicker}
            style={{
              marginTop: 9, width: "100%", height: 32, borderRadius: 6, cursor: "pointer",
              border: "none", background: accent, color: "white",
              fontFamily: "var(--ps-ui)", fontSize: 12, fontWeight: 600,
            }}
          >
            + Hämta frågor från banken
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "var(--ps-ink-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 99, background: accent, display: "inline-block" }} /> Täckt
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 99, border: "1.5px solid var(--ps-rule-2)", display: "inline-block" }} /> Ej täckt
        </span>
      </div>

      {/* Kategorier */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.categories.map(cat => {
          const catCovered = cat.entries.filter(e => data.codeToQs.has(e.code)).length;
          return (
            <div key={cat.name}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-ink-2)" }}>{cat.name}</span>
                <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", fontFamily: "monospace" }}>{catCovered}/{cat.entries.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {cat.entries.map(e => {
                  const qs = data.codeToQs.get(e.code);
                  const isCovered = !!qs;
                  return (
                    <div key={e.code} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: 99, flexShrink: 0, marginTop: 2,
                        background: isCovered ? accent : "transparent",
                        border: isCovered ? "none" : "1.5px solid var(--ps-rule-2)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isCovered && (
                          <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2 6l3 3 5-6" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </span>
                      <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: isCovered ? "var(--ps-ink-2)" : "var(--ps-ink-4)" }}>
                        {e.label}
                      </span>
                      {qs && (
                        <span style={{ display: "flex", gap: 3, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 70 }}>
                          {qs.map(num => (
                            <span key={num} title={`Fråga ${num}`} style={{
                              minWidth: 16, height: 16, padding: "0 3px", borderRadius: 4,
                              background: `${accent}1A`, color: accent,
                              fontSize: 9.5, fontWeight: 700, fontFamily: "var(--ps-ui)",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                            }}>{num}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frågor utan koppling */}
      {data.untagged.length > 0 && (
        <div style={{ borderTop: "1px solid var(--ps-rule)", paddingTop: 12 }}>
          <div style={{ fontSize: 11.5, color: "var(--ps-ink-3)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--ps-ink-2)" }}>{data.untagged.length}</strong>{" "}
            {data.untagged.length === 1 ? "fråga saknar" : "frågor saknar"} kursplanskoppling
            {" "}(fråga {data.untagged.join(", ")}).
          </div>
          <div style={{ fontSize: 11, color: "var(--ps-ink-4)", marginTop: 3 }}>
            Öppna frågan och koppla Lgr22-koder i frågeeditorn för att räkna med den.
          </div>
        </div>
      )}
    </div>
  );
}

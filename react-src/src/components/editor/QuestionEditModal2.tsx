/**
 * QuestionEditModal2 — Universal question editor modal (v2)
 * Opened from preview/answer mode by clicking a question.
 */

import React, { useState, useEffect } from "react";
import { Trash2, X, Minus, Upload, ImageOff } from "lucide-react";
import type { Question, QuestionType, MatchingPair, WordSearchEntry } from "@/lib/test-types";
import { generateWordSearch } from "@/lib/wordsearch-gen";
import { RichTextEditor } from "./RichTextEditor";
import { taxonomy, questionBank } from "@/lib/local-db";
import { SO_TAXONOMY } from "@/lib/so-taxonomy";
import { getLgr22ForSubject } from "@/lib/lgr22-so";
import { renderKatex } from "@/lib/katex-utils";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Props {
  q: Question;
  onEdit: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onClose: () => void;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const QUESTION_TYPE_NAMES: Record<string, string> = {
  info: "Informationsblock",
  open: "Öppen fråga",
  short_answer: "Enkelt svar",
  essay: "Uppsats",
  multiple_choice: "Flerval",
  true_false: "Sant / falskt",
  cloze: "Lucktext",
  matching: "Matchning",
  ranking: "Rangordning",
  numeric: "Numerisk",
  definition: "Begreppsförklaring",
  source_critique: "Källkritik",
  group: "Flerdelad",
  formula: "Formel",
  image: "Bildfråga",
  table: "Tabell",
  diagram_label: "Diagramnamn",
  two_column: "Jämför kolumner",
  drawing: "Rityta",
  wordsearch: "Wordsearch",
};

const AUTO_TYPES = new Set([
  "multiple_choice",
  "short_answer",
  "true_false",
  "cloze",
  "matching",
  "ranking",
  "numeric",
  "definition",
]);

const HIGHLIGHTS = ["", "#F5E6A3", "#FFD0BA", "#FFB4C8", "#C8E0F5", "#C9EBC4", "#E8C8F5"];

/* ── Helper components ──────────────────────────────────────────────────── */

const TBTN = ({
  children,
  active,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  title?: string;
}) => (
  <button
    title={title}
    style={{
      width: 30,
      height: 30,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: active ? "var(--ps-bg-soft)" : "transparent",
      color: "var(--ps-ink-2)",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      fontFamily: "var(--ps-ui)",
      fontSize: 13,
    }}
  >
    {children}
  </button>
);

const TSEP = () => (
  <div
    style={{
      width: 1,
      alignSelf: "stretch",
      background: "var(--ps-rule)",
      margin: "0 2px",
    }}
  />
);

const Collapser = ({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: "1px solid var(--ps-rule)",
        borderRadius: 10,
        background: "white",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--ps-ui)",
          fontSize: 13.5,
          fontWeight: 500,
          color: "var(--ps-ink)",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--ps-ink-3)",
            transform: open ? "none" : "rotate(-90deg)",
            display: "inline-block",
            transition: "transform .15s",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const ModalField = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span
      style={{
        fontSize: 11.5,
        color: "var(--ps-ink-3)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
    {children}
    {hint && (
      <span style={{ fontSize: 11, color: "var(--ps-ink-3)", fontStyle: "italic" }}>
        {hint}
      </span>
    )}
  </div>
);

const RowBox = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "10px 12px",
      border: "1px solid var(--ps-rule-2)",
      borderRadius: 8,
      background: "var(--ps-paper)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    {children}
  </div>
);

const AddRowBtn = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 32,
      padding: "0 12px",
      borderRadius: 6,
      border: "1px solid var(--ps-rule-2)",
      background: "transparent",
      cursor: "pointer",
      fontFamily: "var(--ps-ui)",
      fontSize: 12.5,
      color: "var(--ps-ink-2)",
    }}
  >
    + {children}
  </button>
);

const Pill = ({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 22,
      padding: "0 8px",
      borderRadius: 999,
      background: "var(--ps-bg-soft)",
      color: color ?? "var(--ps-ink-3)",
      fontSize: 11,
      fontWeight: 500,
    }}
  >
    {children}
  </span>
);

const Toggle2 = ({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: on ? "var(--ps-accent)" : "var(--ps-rule)",
        position: "relative",
        cursor: "pointer",
        transition: "background .15s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: 7,
          background: "white",
          transition: "left .15s",
        }}
      />
    </div>
    <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>{label}</span>
  </label>
);

const psInput: React.CSSProperties = {
  border: "1px solid var(--ps-rule-2)",
  borderRadius: 6,
  padding: "6px 10px",
  fontFamily: "var(--ps-ui)",
  fontSize: 13,
  color: "var(--ps-ink)",
  background: "var(--ps-paper)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

/* ── TypeSpecificFields ─────────────────────────────────────────────────── */

function TypeSpecificFields({
  q,
  patchContent,
  patchQ,
}: {
  q: Question;
  patchContent: (fields: Record<string, unknown>) => void;
  patchQ: (fields: Partial<Question>) => void;
}) {
  const c = q.content as Record<string, unknown>;
  const qType = q.type as string;

  switch (qType) {
    case "info":
      return (
        <div
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#1E40AF",
          }}
        >
          Det här är ett informationsblock. Text ovan visas för eleven — inget svar krävs.
        </div>
      );

    case "open":
      return (
        <Collapser title="Svarsutrymme">
          <ModalField label="Antal skrivlinjer">
            <input
              type="number"
              value={(c.lines as number) ?? 5}
              min={1}
              max={30}
              onChange={(e) => patchContent({ lines: parseInt(e.target.value) || 5 })}
              style={{ ...psInput, width: 80 }}
            />
          </ModalField>
        </Collapser>
      );

    case "short_answer": {
      const answers = (c.acceptedAnswers as string[]) ?? [""];
      return (
        <Collapser title="Accepterade svar">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {answers.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  value={a}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    patchContent({ acceptedAnswers: next });
                  }}
                  placeholder={`Svar ${i + 1}`}
                  style={{ ...psInput, flex: 1 }}
                />
                <button
                  onClick={() => patchContent({ acceptedAnswers: answers.filter((_, j) => j !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <AddRowBtn onClick={() => patchContent({ acceptedAnswers: [...answers, ""] })}>
              Lägg till svar
            </AddRowBtn>
          </div>
          <Toggle2
            label="Ignorera versaler"
            on={(c.caseInsensitive as boolean) ?? true}
            onChange={(v) => patchContent({ caseInsensitive: v })}
          />
          <Toggle2
            label="Ignorera inledande/avslutande mellanslag"
            on={(c.trim as boolean) ?? true}
            onChange={(v) => patchContent({ trim: v })}
          />
        </Collapser>
      );
    }

    case "essay":
      return (
        <>
          <Collapser title="Svarsutrymme">
            <ModalField label="Antal skrivlinjer">
              <input
                type="number"
                value={(c.lines as number) ?? 8}
                min={1}
                max={40}
                onChange={(e) => patchContent({ lines: parseInt(e.target.value) || 8 })}
                style={{ ...psInput, width: 80 }}
              />
            </ModalField>
          </Collapser>
          <Collapser title="Bedömningsmatris" defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {((c.rubric as string[]) ?? []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={r}
                    onChange={(e) => {
                      const next = [...((c.rubric as string[]) ?? [])];
                      next[i] = e.target.value;
                      patchContent({ rubric: next });
                    }}
                    placeholder={`Kriterium ${i + 1}`}
                    style={{ ...psInput, flex: 1 }}
                  />
                  <button
                    onClick={() =>
                      patchContent({ rubric: ((c.rubric as string[]) ?? []).filter((_, j) => j !== i) })
                    }
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <AddRowBtn
                onClick={() => patchContent({ rubric: [...((c.rubric as string[]) ?? []), ""] })}
              >
                Lägg till kriterium
              </AddRowBtn>
            </div>
          </Collapser>
        </>
      );

    case "multiple_choice": {
      const options = (c.options as string[]) ?? [];
      const allowMultiple = (c.multi as boolean) ?? false;
      const correctIndex = (c.correctIndex as number | number[] | null) ?? null;
      const isCorrect = (i: number) => {
        if (allowMultiple) return Array.isArray(correctIndex) && correctIndex.includes(i);
        return correctIndex === i;
      };
      const toggleCorrect = (i: number) => {
        if (allowMultiple) {
          const arr = Array.isArray(correctIndex) ? [...correctIndex] : [];
          const idx = arr.indexOf(i);
          if (idx >= 0) arr.splice(idx, 1); else arr.push(i);
          patchContent({ correctIndex: arr });
        } else {
          patchContent({ correctIndex: correctIndex === i ? null : i });
        }
      };
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return (
        <Collapser title="Svarsalternativ">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => toggleCorrect(i)}
                  title="Markera som rätt svar"
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: allowMultiple ? 4 : 11,
                    border: `2px solid ${isCorrect(i) ? "var(--ps-accent)" : "var(--ps-rule-2)"}`,
                    background: isCorrect(i) ? "var(--ps-accent)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {isCorrect(i) ? "✓" : ""}
                </button>
                <span
                  style={{
                    width: 20,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ps-ink-3)",
                    flexShrink: 0,
                  }}
                >
                  {letters[i]}
                </span>
                <div style={{ flex: 1 }}>
                  <RichTextEditor
                    value={opt}
                    onChange={(html) => {
                      const next = [...options];
                      next[i] = html;
                      patchContent({ options: next });
                    }}
                    placeholder={`Alternativ ${letters[i]}`}
                    minHeight={36}
                    compact
                  />
                </div>
                <button
                  onClick={() => patchContent({ options: options.filter((_, j) => j !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <AddRowBtn onClick={() => patchContent({ options: [...options, ""] })}>
                Lägg till alternativ
              </AddRowBtn>
            </div>
          </div>
          <Toggle2
            label="Tillåt flera rätta svar"
            on={allowMultiple}
            onChange={(v) => patchContent({ multi: v })}
          />
          <Toggle2
            label="Blanda alternativ"
            on={(c.shuffle as boolean) ?? false}
            onChange={(v) => patchContent({ shuffle: v })}
          />
        </Collapser>
      );
    }

    case "true_false": {
      const correct = c.correct as number | null | undefined;
      return (
        <Collapser title="Rätt svar">
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Sant", value: 0 as const },
              { label: "Falskt", value: 1 as const },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => patchContent({ correct: value })}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: `2px solid ${correct === value ? "#16A34A" : "var(--ps-rule-2)"}`,
                  background: correct === value ? "#F0FDF4" : "transparent",
                  color: correct === value ? "#16A34A" : "var(--ps-ink-2)",
                  fontFamily: "var(--ps-ui)",
                  fontSize: 14,
                  fontWeight: correct === value ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Collapser>
      );
    }

    case "cloze": {
      const text = (c.text as string) ?? "";
      const blankCount = (text.match(/___/g) || []).length;
      const blanks = (c.blanks as string[]) ?? Array(blankCount).fill("");
      const syncedBlanks =
        blanks.length === blankCount
          ? blanks
          : Array(blankCount)
              .fill("")
              .map((_, i) => blanks[i] ?? "");
      return (
        <Collapser title="Svar per lucka">
          {blankCount === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--ps-ink-4)" }}>
              Skriv ___ (tre understreck) i texten ovan för att skapa luckor.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {syncedBlanks.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "var(--ps-bg-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ps-ink-3)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={b}
                    onChange={(e) => {
                      const next = [...syncedBlanks];
                      next[i] = e.target.value;
                      patchContent({ blanks: next });
                    }}
                    placeholder={`Svar för lucka ${i + 1}`}
                    style={{ ...psInput, flex: 1 }}
                  />
                </div>
              ))}
            </div>
          )}
        </Collapser>
      );
    }

    case "matching": {
      const pairs = (c.pairs as MatchingPair[]) ?? [];
      return (
        <Collapser title="Par att matcha">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pairs.map((pair, i) => (
              <div
                key={i}
                style={{ display: "grid", gridTemplateColumns: "24px 1fr 20px 1fr 32px", gap: 6, alignItems: "center" }}
              >
                <span
                  style={{
                    height: 22,
                    width: 22,
                    borderRadius: 11,
                    background: "var(--ps-bg-soft)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ps-ink-3)",
                  }}
                >
                  {i + 1}
                </span>
                <RichTextEditor
                  value={pair.left}
                  onChange={(html) => {
                    const next = [...pairs];
                    next[i] = { ...pair, left: html };
                    patchContent({ pairs: next });
                  }}
                  placeholder="Vänster"
                  minHeight={36}
                  compact
                />
                <span style={{ textAlign: "center", color: "var(--ps-ink-3)", fontSize: 14 }}>→</span>
                <RichTextEditor
                  value={pair.right}
                  onChange={(html) => {
                    const next = [...pairs];
                    next[i] = { ...pair, right: html };
                    patchContent({ pairs: next });
                  }}
                  placeholder="Höger"
                  minHeight={36}
                  compact
                />
                <button
                  onClick={() => patchContent({ pairs: pairs.filter((_, j) => j !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <AddRowBtn onClick={() => patchContent({ pairs: [...pairs, { left: "", right: "" }] })}>
              Lägg till par
            </AddRowBtn>
          </div>
        </Collapser>
      );
    }

    case "ranking": {
      const items = (c.items as string[]) ?? [];
      return (
        <Collapser title="Rätt ordning">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: "var(--ps-bg-soft)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ps-ink-3)",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <RichTextEditor
                    value={item}
                    onChange={(html) => {
                      const next = [...items];
                      next[i] = html;
                      patchContent({ items: next });
                    }}
                    placeholder={`Post ${i + 1}`}
                    minHeight={36}
                    compact
                  />
                </div>
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const next = [...items];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    patchContent({ items: next });
                  }}
                  disabled={i === 0}
                  style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "var(--ps-ink-4)" : "var(--ps-ink-2)", padding: 4, opacity: i === 0 ? 0.3 : 1 }}
                >
                  ▲
                </button>
                <button
                  onClick={() => {
                    if (i === items.length - 1) return;
                    const next = [...items];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    patchContent({ items: next });
                  }}
                  disabled={i === items.length - 1}
                  style={{ background: "none", border: "none", cursor: i === items.length - 1 ? "default" : "pointer", color: i === items.length - 1 ? "var(--ps-ink-4)" : "var(--ps-ink-2)", padding: 4, opacity: i === items.length - 1 ? 0.3 : 1 }}
                >
                  ▼
                </button>
                <button
                  onClick={() => patchContent({ items: items.filter((_, j) => j !== i) })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <AddRowBtn onClick={() => patchContent({ items: [...items, ""] })}>
              Lägg till post
            </AddRowBtn>
          </div>
        </Collapser>
      );
    }

    case "numeric":
      return (
        <Collapser title="Numeriskt svar">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <ModalField label="Svar">
              <input
                value={(c.answer as string) ?? ""}
                onChange={(e) => patchContent({ answer: e.target.value })}
                placeholder="t.ex. 42"
                style={psInput}
              />
            </ModalField>
            <ModalField label="Enhet">
              <input
                value={(c.unit as string) ?? ""}
                onChange={(e) => patchContent({ unit: e.target.value })}
                placeholder="t.ex. m/s"
                style={psInput}
              />
            </ModalField>
            <ModalField label="Tolerans ±">
              <input
                value={(c.tolerance as string) ?? ""}
                onChange={(e) => patchContent({ tolerance: e.target.value })}
                placeholder="t.ex. 0.5"
                style={psInput}
              />
            </ModalField>
          </div>
          <Toggle2
            label="Tillåt visning av arbete"
            on={(c.allowWork as boolean) ?? false}
            onChange={(v) => patchContent({ allowWork: v })}
          />
        </Collapser>
      );

    case "definition": {
      type TermDef = { term: string; def: string };
      const rawTerms = c.terms as unknown;
      const terms: TermDef[] = Array.isArray(rawTerms)
        ? (rawTerms as Array<string | TermDef>).map((t) =>
            typeof t === "string" ? { term: t, def: "" } : { term: t.term ?? "", def: t.def ?? "" }
          )
        : [{ term: (c.term as string) ?? "", def: "" }];
      return (
        <Collapser title="Begrepp och facit">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {terms.map((t, i) => (
              <RowBox key={i}>
                <ModalField label="Begrepp">
                  <RichTextEditor
                    value={t.term}
                    onChange={(html) => {
                      const next = [...terms];
                      next[i] = { ...t, term: html };
                      patchContent({ terms: next });
                    }}
                    placeholder="Skriv begreppet…"
                    minHeight={36}
                    compact
                  />
                </ModalField>
                <ModalField label="Facit / definition">
                  <RichTextEditor
                    value={t.def}
                    onChange={(html) => {
                      const next = [...terms];
                      next[i] = { ...t, def: html };
                      patchContent({ terms: next });
                    }}
                    placeholder="Skriv definitionen…"
                    minHeight={56}
                    compact
                  />
                </ModalField>
              </RowBox>
            ))}
            <AddRowBtn
              onClick={() => patchContent({ terms: [...terms, { term: "", def: "" }] })}
            >
              Lägg till begrepp
            </AddRowBtn>
          </div>
        </Collapser>
      );
    }

    case "source_critique": {
      const hasImage = (c.hasImage as boolean) ?? false;
      return (
        <>
          <Collapser title="Källa">
            <ModalField label="Källans titel">
              <input
                value={(c.sourceTitle as string) ?? ""}
                onChange={(e) => patchContent({ sourceTitle: e.target.value })}
                style={psInput}
              />
            </ModalField>
            <ModalField label="Källtext">
              <textarea
                value={(c.sourceText as string) ?? ""}
                onChange={(e) => patchContent({ sourceText: e.target.value })}
                rows={4}
                style={{ ...psInput, resize: "vertical" }}
              />
            </ModalField>
            <ModalField label="Attribution / upphovsman">
              <input
                value={(c.sourceAttribution as string) ?? ""}
                onChange={(e) => patchContent({ sourceAttribution: e.target.value })}
                style={psInput}
              />
            </ModalField>
            <ModalField label="Kategori">
              <input
                value={(c.category as string) ?? ""}
                onChange={(e) => patchContent({ category: e.target.value })}
                placeholder="t.ex. Tidningsartikel, Graf"
                style={psInput}
              />
            </ModalField>
            <Toggle2
              label="Inkludera bild"
              on={hasImage}
              onChange={(v) => patchContent({ hasImage: v })}
            />
            {hasImage && (
              <ModalField label="Bildtext">
                <input
                  value={(c.imageCaption as string) ?? ""}
                  onChange={(e) => patchContent({ imageCaption: e.target.value })}
                  style={psInput}
                />
              </ModalField>
            )}
          </Collapser>
          <Collapser title="Svarsutrymme" defaultOpen={false}>
            <ModalField label="Antal skrivlinjer">
              <input
                type="number"
                value={(c.lines as number) ?? 5}
                min={1}
                max={30}
                onChange={(e) => patchContent({ lines: parseInt(e.target.value) || 5 })}
                style={{ ...psInput, width: 80 }}
              />
            </ModalField>
          </Collapser>
        </>
      );
    }

    case "group": {
      type GroupSub = { text: string; lines?: number; points?: string };
      const subs: GroupSub[] = Array.isArray(c.subs) ? (c.subs as GroupSub[]) : [];
      const title = (c.title as string) ?? "";
      const instructions = (c.instructions as string) ?? "";

      function setSubs(next: GroupSub[]) { patchContent({ subs: next }); }
      function addSub() { setSubs([...subs, { text: "", lines: 3 }]); }
      function removeSub(i: number) { setSubs(subs.filter((_, j) => j !== i)); }
      function patchSub(i: number, patch: Partial<GroupSub>) {
        setSubs(subs.map((s, j) => j === i ? { ...s, ...patch } : s));
      }

      return (
        <>
          <Collapser title="Grupptitel och instruktion">
            <ModalField label="Titel / grupprubrik">
              <input
                value={title}
                onChange={e => patchContent({ title: e.target.value })}
                placeholder="t.ex. Läs texten och svara på frågorna"
                style={psInput}
              />
            </ModalField>
            <ModalField label="Instruktion (valfri)">
              <textarea
                value={instructions}
                onChange={e => patchContent({ instructions: e.target.value })}
                rows={2}
                style={{ ...psInput, resize: "vertical" }}
              />
            </ModalField>
          </Collapser>
          <Collapser title={`Delfrågor (${subs.length})`} defaultOpen>
            {subs.map((sub, i) => (
              <div key={i} style={{
                border: "1px solid var(--ps-rule)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 8,
                background: "var(--ps-paper)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-ink-3)", minWidth: 20 }}>{String.fromCharCode(96 + i + 1)})</span>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => removeSub(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-red, #dc2626)", padding: 2 }}
                    title="Ta bort delfråga"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <ModalField label="Frågetext">
                  <RichTextEditor
                    value={sub.text}
                    onChange={html => patchSub(i, { text: html })}
                    placeholder={`Delfråga ${i + 1}`}
                    minHeight={52}
                    compact
                  />
                </ModalField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <ModalField label="Skrivlinjer">
                    <input
                      type="number"
                      value={sub.lines ?? 3}
                      min={0}
                      max={20}
                      onChange={e => patchSub(i, { lines: parseInt(e.target.value) || 0 })}
                      style={{ ...psInput, width: "100%" }}
                    />
                  </ModalField>
                  <ModalField label="Poäng">
                    <input
                      value={sub.points ?? ""}
                      onChange={e => patchSub(i, { points: e.target.value })}
                      placeholder="t.ex. 2"
                      style={{ ...psInput, width: "100%" }}
                    />
                  </ModalField>
                </div>
              </div>
            ))}
            <button
              onClick={addSub}
              style={{
                width: "100%", padding: "7px 12px", borderRadius: 6,
                border: "1.5px dashed var(--ps-rule-2)",
                background: "transparent", cursor: "pointer",
                fontFamily: "var(--ps-ui)", fontSize: 12,
                color: "var(--ps-ink-3)", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 5,
              }}
            >
              + Lägg till delfråga
            </button>
          </Collapser>
        </>
      );
    }

    case "formula": {
      type VarEntry = { name: string; description: string };
      const formulaVars = (c.variables as VarEntry[]) ?? [];
      const formulaSrc  = (c.formula as string) ?? "";
      return (
        <>
          <Collapser title="Formel">
            {/* KaTeX-förhandsgranskning */}
            <div style={{
              minHeight: 52, padding: "10px 14px", marginBottom: 8,
              background: "#fafaf7", borderRadius: 6, border: "1px solid var(--ps-rule-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "auto",
            }}>
              {formulaSrc ? (
                <div dangerouslySetInnerHTML={{ __html: renderKatex(formulaSrc) }} />
              ) : (
                <span style={{ color: "var(--ps-ink-4)", fontSize: 12, fontStyle: "italic" }}>
                  Förhandsgranskning visas här
                </span>
              )}
            </div>

            {/* Snabbknappar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {([
                { label: "x²",  ins: "^{2}" },
                { label: "xⁿ",  ins: "^{n}" },
                { label: "√",   ins: "\\sqrt{}" },
                { label: "a/b", ins: "\\frac{a}{b}" },
                { label: "·",   ins: "\\cdot " },
                { label: "±",   ins: "\\pm " },
                { label: "≤",   ins: "\\leq " },
                { label: "≥",   ins: "\\geq " },
                { label: "π",   ins: "\\pi " },
                { label: "α",   ins: "\\alpha " },
                { label: "β",   ins: "\\beta " },
                { label: "Δ",   ins: "\\Delta " },
              ] as const).map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); patchContent({ formula: formulaSrc + btn.ins }); }}
                  style={{
                    padding: "2px 7px", fontSize: 12,
                    border: "1px solid var(--ps-rule-2)", borderRadius: 4,
                    background: "var(--ps-bg-soft)", cursor: "pointer",
                    fontFamily: "var(--ps-mono)",
                  }}
                >{btn.label}</button>
              ))}
            </div>

            <ModalField label="LaTeX-uttryck">
              <input
                value={formulaSrc}
                onChange={(e) => patchContent({ formula: e.target.value })}
                placeholder="t.ex. E = mc^{2} eller \frac{F}{m} = a"
                style={{ ...psInput, fontFamily: "var(--ps-mono)" }}
              />
            </ModalField>

            {/* Variabellista */}
            <ModalField label="Variabler">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {formulaVars.map((v, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "76px 1fr 26px", gap: 4 }}>
                    <input
                      value={v.name}
                      onChange={e => {
                        const vars = formulaVars.map((x, j) => j === i ? { ...x, name: e.target.value } : x);
                        patchContent({ variables: vars });
                      }}
                      style={{ ...psInput, fontFamily: "var(--ps-mono)" }}
                      placeholder="t.ex. F"
                    />
                    <input
                      value={v.description}
                      onChange={e => {
                        const vars = formulaVars.map((x, j) => j === i ? { ...x, description: e.target.value } : x);
                        patchContent({ variables: vars });
                      }}
                      style={psInput}
                      placeholder="kraft (N)"
                    />
                    <button
                      type="button"
                      onClick={() => patchContent({ variables: formulaVars.filter((_, j) => j !== i) })}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ps-ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => patchContent({ variables: [...formulaVars, { name: "", description: "" }] })}
                  style={{ fontSize: 11.5, color: "var(--ps-ink-3)", background: "none", border: "1px dashed var(--ps-rule-2)", borderRadius: 5, padding: "4px 8px", cursor: "pointer", textAlign: "left" }}
                >
                  + Lägg till variabel
                </button>
              </div>
            </ModalField>

            <ModalField label="Antal skrivlinjer">
              <input
                type="number"
                value={(c.lines as number) ?? 5}
                min={1} max={30}
                onChange={(e) => patchContent({ lines: parseInt(e.target.value) || 5 })}
                style={{ ...psInput, width: 80 }}
              />
            </ModalField>
          </Collapser>
          <Collapser title="Facit" defaultOpen={false}>
            <ModalField label="Facitsvar">
              <textarea
                value={(c.answer as string) ?? ""}
                onChange={(e) => patchContent({ answer: e.target.value })}
                rows={3}
                style={{ ...psInput, resize: "vertical" }}
              />
            </ModalField>
          </Collapser>
        </>
      );
    }

    case "image":
      return (
        <Collapser title="Bild">
          {/* Preview */}
          {(c.imageUrl as string) ? (
            <div style={{ marginBottom: 8, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ps-rule-2)", background: "var(--ps-bg-soft)", position: "relative" }}>
              <img
                src={c.imageUrl as string}
                alt=""
                style={{ display: "block", maxWidth: "100%", maxHeight: 160, objectFit: "contain", margin: "0 auto" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <button
                type="button"
                onClick={() => patchContent({ imageUrl: "" })}
                title="Ta bort bild"
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 4, cursor: "pointer", color: "#fff", padding: "2px 5px", display: "flex", alignItems: "center" }}
              >
                <ImageOff size={12} />
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 8, height: 80, borderRadius: 6, border: "2px dashed var(--ps-rule-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)", fontSize: 11, gap: 5 }}>
              <ImageOff size={14} /> Ingen bild vald
            </div>
          )}

          {/* Upload from disk */}
          {window.localAPI?.pickImage && (
            <button
              type="button"
              onClick={async () => {
                const res = await window.localAPI!.pickImage!();
                if (res) patchContent({ imageUrl: res.dataUrl });
              }}
              style={{ width: "100%", marginBottom: 8, padding: "6px 0", border: "1px dashed var(--ps-rule-2)", borderRadius: 5, background: "none", cursor: "pointer", color: "var(--ps-ink-2)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Upload size={13} /> Välj bild från disk
            </button>
          )}

          <ModalField label="Eller ange URL">
            <input
              value={(c.imageUrl as string)?.startsWith("data:") ? "" : ((c.imageUrl as string) ?? "")}
              onChange={(e) => patchContent({ imageUrl: e.target.value })}
              placeholder="https://..."
              style={psInput}
            />
          </ModalField>
          <ModalField label="Bildtext">
            <input
              value={(c.caption as string) ?? ""}
              onChange={(e) => patchContent({ caption: e.target.value })}
              style={psInput}
            />
          </ModalField>
          <ModalField label="Antal skrivlinjer">
            <input
              type="number"
              value={(c.lines as number) ?? 4}
              min={0}
              max={30}
              onChange={(e) => patchContent({ lines: parseInt(e.target.value) || 0 })}
              style={{ ...psInput, width: 80 }}
            />
          </ModalField>
        </Collapser>
      );

    case "table": {
      const cols = (c.headers as string[]) ?? ["", ""];
      const rows = (c.rows as string[][]) ?? [["", ""]];
      return (
        <Collapser title="Tabellstruktur">
          <ModalField label="Kolumnrubriker">
            <div style={{ display: "flex", gap: 6 }}>
              {cols.map((col, i) => (
                <input
                  key={i}
                  value={col}
                  onChange={(e) => {
                    const next = [...cols];
                    next[i] = e.target.value;
                    patchContent({ headers: next });
                  }}
                  placeholder={`Kolumn ${i + 1}`}
                  style={{ ...psInput, flex: 1 }}
                />
              ))}
              <AddRowBtn onClick={() => patchContent({ headers: [...cols, ""], rows: rows.map((r) => [...r, ""]) })}>
                Kol
              </AddRowBtn>
            </div>
          </ModalField>
          <ModalField label="Rader">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 4 }}>
                  {row.map((cell, ci) => (
                    <input
                      key={ci}
                      value={cell}
                      onChange={(e) => {
                        const next = rows.map((r) => [...r]);
                        next[ri][ci] = e.target.value;
                        patchContent({ rows: next });
                      }}
                      placeholder={cols[ci] || `Kolumn ${ci + 1}`}
                      style={{ ...psInput, flex: 1 }}
                    />
                  ))}
                  <button
                    onClick={() => patchContent({ rows: rows.filter((_, j) => j !== ri) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </ModalField>
          <AddRowBtn
            onClick={() =>
              patchContent({ rows: [...rows, Array(cols.length).fill("")] })
            }
          >
            Lägg till rad
          </AddRowBtn>
        </Collapser>
      );
    }

    case "diagram_label": {
      const labels = (c.labels as string[]) ?? [];
      return (
        <>
          <Collapser title="Diagrambild">
            {/* Preview */}
            {(c.imageUrl as string) ? (
              <div style={{ marginBottom: 8, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ps-rule-2)", background: "var(--ps-bg-soft)", position: "relative" }}>
                <img
                  src={c.imageUrl as string}
                  alt=""
                  style={{ display: "block", maxWidth: "100%", maxHeight: 140, objectFit: "contain", margin: "0 auto" }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <button
                  type="button"
                  onClick={() => patchContent({ imageUrl: "" })}
                  title="Ta bort bild"
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 4, cursor: "pointer", color: "#fff", padding: "2px 5px", display: "flex", alignItems: "center" }}
                >
                  <ImageOff size={12} />
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 8, height: 60, borderRadius: 6, border: "2px dashed var(--ps-rule-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-ink-4)", fontSize: 11, gap: 5 }}>
                <ImageOff size={14} /> Ingen bild vald
              </div>
            )}
            {window.localAPI?.pickImage && (
              <button
                type="button"
                onClick={async () => {
                  const res = await window.localAPI!.pickImage!();
                  if (res) patchContent({ imageUrl: res.dataUrl });
                }}
                style={{ width: "100%", marginBottom: 8, padding: "6px 0", border: "1px dashed var(--ps-rule-2)", borderRadius: 5, background: "none", cursor: "pointer", color: "var(--ps-ink-2)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                <Upload size={13} /> Välj bild från disk
              </button>
            )}
            <ModalField label="Eller ange URL">
              <input
                value={(c.imageUrl as string)?.startsWith("data:") ? "" : ((c.imageUrl as string) ?? "")}
                onChange={(e) => patchContent({ imageUrl: e.target.value })}
                placeholder="https://..."
                style={psInput}
              />
            </ModalField>
          </Collapser>
          <Collapser title="Etiketter att namnge">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {labels.map((label, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "var(--ps-bg-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ps-ink-3)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={label}
                    onChange={(e) => {
                      const next = [...labels];
                      next[i] = e.target.value;
                      patchContent({ labels: next });
                    }}
                    placeholder={`Etikett ${i + 1}`}
                    style={{ ...psInput, flex: 1 }}
                  />
                  <button
                    onClick={() => patchContent({ labels: labels.filter((_, j) => j !== i) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <AddRowBtn onClick={() => patchContent({ labels: [...labels, ""] })}>
                Lägg till etikett
              </AddRowBtn>
            </div>
          </Collapser>
        </>
      );
    }

    case "two_column":
      return (
        <Collapser title="Kolumner att jämföra">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ModalField label="Kolumn A">
              <input
                value={(c.colA as string) ?? ""}
                onChange={(e) => patchContent({ colA: e.target.value })}
                placeholder="t.ex. Fördelar"
                style={psInput}
              />
            </ModalField>
            <ModalField label="Kolumn B">
              <input
                value={(c.colB as string) ?? ""}
                onChange={(e) => patchContent({ colB: e.target.value })}
                placeholder="t.ex. Nackdelar"
                style={psInput}
              />
            </ModalField>
          </div>
          <ModalField label="Antal rader">
            <input
              type="number"
              value={(c.compareRows as number) ?? 4}
              min={1}
              max={20}
              onChange={(e) => patchContent({ compareRows: parseInt(e.target.value) || 4 })}
              style={{ ...psInput, width: 80 }}
            />
          </ModalField>
        </Collapser>
      );

    case "drawing":
      return (
        <Collapser title="Rityta">
          <ModalField label="Höjd (mm)">
            <input
              type="number"
              value={(c.drawHeight as number) ?? 60}
              min={20}
              max={200}
              onChange={(e) => patchContent({ drawHeight: parseInt(e.target.value) || 60 })}
              style={{ ...psInput, width: 80 }}
            />
          </ModalField>
          <ModalField label="Bakgrund">
            <select
              value={(c.drawBackground as string) ?? "blank"}
              onChange={(e) => patchContent({ drawBackground: e.target.value })}
              style={psInput}
            >
              <option value="blank">Tom</option>
              <option value="grid">Rutnät</option>
              <option value="lines">Linjer</option>
              <option value="dots">Prickar</option>
            </select>
          </ModalField>
        </Collapser>
      );

    case "wordsearch": {
      const entries: WordSearchEntry[] = Array.isArray(c.entries)
        ? (c.entries as WordSearchEntry[])
        : [];
      const gridSize: number = (c.gridSize as number) ?? 16;
      const hasGrid = Array.isArray(c.grid) && (c.grid as string[][]).length > 0;

      function setEntries(next: WordSearchEntry[]) {
        patchContent({ entries: next });
      }

      function handleGenerate() {
        const valid = entries.filter(e => e.word.trim().length > 0);
        if (valid.length === 0) return;
        const { grid, solution, skipped } = generateWordSearch(valid, gridSize);
        patchContent({ grid, solution, entries: valid });
        if (skipped.length > 0) {
          alert(
            `${skipped.length} ord fick inte plats och saknas i pusslet:\n${skipped.join(", ")}\n\nProva ett större rutnät.`
          );
        }
      }

      return (
        <>
          <Collapser title={`Ord och ledtrådar (${entries.length})`} defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map((e, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6, alignItems: "center" }}>
                  <input
                    value={e.word}
                    onChange={(ev) => {
                      const next = [...entries];
                      next[i] = { ...e, word: ev.target.value.toUpperCase() };
                      setEntries(next);
                    }}
                    placeholder="ORD"
                    style={{ ...psInput, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}
                  />
                  <input
                    value={e.clue}
                    onChange={(ev) => {
                      const next = [...entries];
                      next[i] = { ...e, clue: ev.target.value };
                      setEntries(next);
                    }}
                    placeholder="Ledtråd / förklaring…"
                    style={psInput}
                  />
                  <button
                    onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ps-ink-4)", padding: 4 }}
                    title="Ta bort ord"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <AddRowBtn onClick={() => setEntries([...entries, { word: "", clue: "" }])}>
                Lägg till ord
              </AddRowBtn>
            </div>
          </Collapser>

          <Collapser title="Rutnät" defaultOpen>
            <ModalField label="Storlek">
              <select
                value={gridSize}
                onChange={(e) => patchContent({ gridSize: parseInt(e.target.value), grid: undefined, solution: undefined })}
                style={{ ...psInput, width: 120 }}
              >
                {[12, 14, 16, 18, 20].map(s => (
                  <option key={s} value={s}>{s}×{s}</option>
                ))}
              </select>
            </ModalField>
            <button
              onClick={handleGenerate}
              disabled={entries.filter(e => e.word.trim()).length === 0}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--ps-accent, #1E5F5C)",
                color: "white",
                fontFamily: "var(--ps-ui)",
                fontSize: 13,
                fontWeight: 600,
                cursor: entries.filter(e => e.word.trim()).length === 0 ? "not-allowed" : "pointer",
                opacity: entries.filter(e => e.word.trim()).length === 0 ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🔀 Generera rutnät
            </button>
            {hasGrid && (
              <div style={{ fontSize: 11, color: "var(--ps-ink-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--ps-green, #16a34a)" }}>✓</span>
                Rutnät genererat ({entries.filter(e => e.word.trim()).length} ord placerade)
              </div>
            )}
          </Collapser>

          <Collapser title="Instruktion" defaultOpen={false}>
            <ModalField label="Instruktionstext">
              <textarea
                value={(c.instructions as string) ?? ""}
                onChange={(e) => patchContent({ instructions: e.target.value })}
                rows={2}
                placeholder="t.ex. Leta upp orden i rutnätet och ringa in dem."
                style={{ ...psInput, resize: "vertical" }}
              />
            </ModalField>
          </Collapser>
        </>
      );
    }

    default:
      return null;
  }
}

/* ── MetadataFields ─────────────────────────────────────────────────────── */

function MetadataFields({ q, patchQ }: { q: Question; patchQ: (f: Partial<Question>) => void }) {
  const tax = taxonomy.get();
  const allBankQs = questionBank.list();

  // Build subject list: SO subjects + custom taxonomy + subjects already used in bank
  const soSubjects = Object.keys(SO_TAXONOMY);
  const taxSubjects = Object.keys(tax).filter(s => !soSubjects.includes(s));
  const bankSubjects = allBankQs.map(bq => bq.subject).filter(Boolean) as string[];
  const subjects = [...new Set([...soSubjects, ...taxSubjects, ...bankSubjects])].sort();

  const currentSubject = q.subject ?? "";

  // Build category list: SO cats + custom taxonomy cats + bank cats — all filtered by current subject
  const soCats = currentSubject ? (SO_TAXONOMY[currentSubject] ?? []) : [];
  const taxCats = currentSubject ? (tax[currentSubject] ?? []) : [];
  const bankCats = currentSubject
    ? allBankQs.filter(bq => bq.subject === currentSubject).map(bq => bq.cat).filter(Boolean) as string[]
    : [];
  const cats = [...new Set([...soCats, ...taxCats, ...bankCats])].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ModalField label="Ämne">
          <>
            <input
              list="qem2-subjects"
              value={currentSubject}
              onChange={e => patchQ({ subject: e.target.value || null })}
              placeholder="Välj eller skriv ämne…"
              style={psInput}
            />
            <datalist id="qem2-subjects">
              {subjects.map(s => <option key={s} value={s} />)}
            </datalist>
          </>
        </ModalField>
        <ModalField label="Kategori">
          <>
            <input
              list="qem2-cats"
              value={q.cat ?? ""}
              onChange={e => patchQ({ cat: e.target.value || null })}
              placeholder="Välj eller skriv kategori…"
              style={psInput}
            />
            <datalist id="qem2-cats">
              {cats.map(c => <option key={c} value={c} />)}
            </datalist>
          </>
        </ModalField>
      </div>
      <ModalField label="Status">
        <select
          value={q.status ?? "draft"}
          onChange={e => patchQ({ status: e.target.value as Question["status"] })}
          style={{ ...psInput, maxWidth: "50%" }}
        >
          <option value="draft">Utkast</option>
          <option value="review">Granska</option>
          <option value="approved">Godkänd</option>
          <option value="archived">Arkiverad</option>
        </select>
      </ModalField>

      {/* Lgr22-koder — visas om ämnet har SO-mappning */}
      {getLgr22ForSubject(currentSubject).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ps-ink-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>
            Lgr22 — {currentSubject} ({(q.lgr22 ?? []).length} valda)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
            {getLgr22ForSubject(currentSubject).map(e => {
              const checked = (q.lgr22 ?? []).includes(e.code);
              return (
                <label key={e.code} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, cursor: "pointer", padding: "2px 0" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = q.lgr22 ?? [];
                      const next = checked ? current.filter(c => c !== e.code) : [...current, e.code];
                      patchQ({ lgr22: next.length ? next : null });
                    }}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--ps-accent)" }}
                  />
                  <span>
                    <span style={{ color: "var(--ps-ink-4)", fontSize: 10.5 }}>{e.category} · </span>
                    <span style={{ color: "var(--ps-ink-2)" }}>{e.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── BedömningTab ───────────────────────────────────────────────────────── */

const GRADE_LABELS: { key: "E" | "C" | "A"; label: string; desc: string; color: string }[] = [
  { key: "E", label: "E", desc: "Godtagbart",                      color: "#16A34A" },
  { key: "C", label: "C", desc: "Välutvecklat",                    color: "#2563EB" },
  { key: "A", label: "A", desc: "Välutvecklat och nyanserat",      color: "#7C3AED" },
];

type AssessmentMode = 'standard' | 'optional' | 'np_variant';

const MODE_LABELS: { key: AssessmentMode; label: string; title: string }[] = [
  { key: "standard",   label: "Standard",    title: "Poäng + E/C/A-kriterier (nuvarande)" },
  { key: "optional",   label: "Valfritt",    title: "Fritext + valfri poängsättning"       },
  { key: "np_variant", label: "NP-variant",  title: "Maxpoäng med tröskelgränser"          },
];

function BedömningTab({ q, patchQ }: { q: Question; patchQ: (f: Partial<Question>) => void }) {
  const isGroup = q.type === "group";
  const auto    = AUTO_TYPES.has(q.type);
  const mode: AssessmentMode = q.assessment_mode ?? "standard";

  // RichTextEditor instances use key={q.id + field} to remount when question switches

  /* ── Segmented mode selector ── */
  const modeSelector = (
    <div style={{ display: "flex", gap: 4, background: "var(--ps-bg-soft)", borderRadius: 8, padding: 3, marginBottom: 4 }}>
      {MODE_LABELS.map(({ key, label, title }) => (
        <button
          key={key}
          title={title}
          onClick={() => patchQ({ assessment_mode: key })}
          style={{
            flex: 1,
            height: 30,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: mode === key ? 600 : 400,
            fontFamily: "var(--ps-ui)",
            background: mode === key ? "var(--ps-paper)" : "transparent",
            color: mode === key ? "var(--ps-accent, #1E5F5C)" : "var(--ps-ink-3)",
            boxShadow: mode === key ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  /* ── Standard mode (unchanged) ── */
  if (mode === "standard") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {modeSelector}
        {/* Total points */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>Totalpoäng</span>
          {auto && <Pill color="#16A34A">Auto</Pill>}
          {isGroup && <Pill>Summa från delfrågor</Pill>}
          <input
            type="number"
            value={q.points ?? "0"}
            min={0}
            disabled={isGroup}
            onChange={(e) => patchQ({ points: e.target.value })}
            style={{ ...psInput, width: 70, marginLeft: "auto", opacity: isGroup ? 0.5 : 1 }}
          />
          <span style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>p</span>
        </div>
        {/* E/C/A cards */}
        {GRADE_LABELS.map(({ key, label, desc, color }) => {
          const gpVal = q.grade_points?.[key] ?? 0;
          return (
            <div key={key} style={{ border: `1.5px solid ${color}30`, borderRadius: 10, background: `${color}06`, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: `1px solid ${color}20`, background: `${color}10` }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: color, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#333", flex: 1 }}>{desc}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ps-ink-3)" }}>Poäng:</span>
                  <input type="number" value={gpVal} min={0}
                    onChange={e => patchQ({ grade_points: { ...q.grade_points, [key]: parseFloat(e.target.value) || 0 } })}
                    style={{ ...psInput, width: 60, textAlign: "center" }}
                  />
                </div>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <RichTextEditor
                  key={`${q.id}-rubric-${key}`}
                  value={q.rubric?.[key] ?? ""}
                  onChange={html => patchQ({ rubric: { ...q.rubric, [key]: html } })}
                  placeholder={`Vad krävs för betyget ${label}…`}
                  minHeight={80}
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Optional mode ── */
  if (mode === "optional") {
    const useGP = q.assessment_use_grade_points ?? false;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {modeSelector}

        {/* Poäng toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--ps-bg-soft)", borderRadius: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)", flex: 1 }}>Poängmodell</span>
          <button
            onClick={() => patchQ({ assessment_use_grade_points: false })}
            style={{ height: 28, padding: "0 12px", borderRadius: 6, border: `1.5px solid ${!useGP ? "var(--ps-accent)" : "var(--ps-rule-2)"}`, background: !useGP ? "var(--ps-accent)10" : "transparent", color: !useGP ? "var(--ps-accent)" : "var(--ps-ink-3)", fontSize: 12, fontWeight: !useGP ? 600 : 400, cursor: "pointer", fontFamily: "var(--ps-ui)" }}
          >
            Totalpoäng
          </button>
          <button
            onClick={() => patchQ({ assessment_use_grade_points: true })}
            style={{ height: 28, padding: "0 12px", borderRadius: 6, border: `1.5px solid ${useGP ? "var(--ps-accent)" : "var(--ps-rule-2)"}`, background: useGP ? "var(--ps-accent)10" : "transparent", color: useGP ? "var(--ps-accent)" : "var(--ps-ink-3)", fontSize: 12, fontWeight: useGP ? 600 : 400, cursor: "pointer", fontFamily: "var(--ps-ui)" }}
          >
            E/C/A-poäng
          </button>
        </div>

        {/* Points inputs */}
        {!useGP ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>Poäng</span>
            {auto && <Pill color="#16A34A">Auto</Pill>}
            {isGroup && <Pill>Summa från delfrågor</Pill>}
            <input type="number" value={q.points ?? "0"} min={0} disabled={isGroup}
              onChange={(e) => patchQ({ points: e.target.value })}
              style={{ ...psInput, width: 70, marginLeft: "auto", opacity: isGroup ? 0.5 : 1 }}
            />
            <span style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>p</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            {GRADE_LABELS.map(({ key, label, color }) => (
              <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center", padding: "8px 6px", background: `${color}08`, borderRadius: 8, border: `1.5px solid ${color}30` }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: color, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{label}</span>
                <input type="number" value={q.grade_points?.[key] ?? 0} min={0}
                  onChange={e => patchQ({ grade_points: { ...q.grade_points, [key]: parseFloat(e.target.value) || 0 } })}
                  style={{ ...psInput, width: "100%", textAlign: "center" }}
                />
                <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)" }}>p</span>
              </div>
            ))}
          </div>
        )}

        {/* Free-text assessment */}
        <div>
          <span style={{ fontSize: 12, color: "var(--ps-ink-3)", display: "block", marginBottom: 5 }}>Bedömningsanvisningar (fritext)</span>
          <RichTextEditor
            key={`${q.id}-assess-text`}
            value={q.assessment_text ?? ""}
            onChange={html => patchQ({ assessment_text: html })}
            placeholder="Skriv dina bedömningsanvisningar fritt…"
            minHeight={120}
            compact
          />
        </div>
      </div>
    );
  }

  /* ── NP-variant mode ── */

  // Migrate legacy np_criteria → np_questions on first render
  const DEFAULT_NP_QUESTIONS: Array<{ question: string; criteria: Array<{ label: string; points: number }> }> = [
    {
      question: "Bedömningsfråga 1",
      criteria: [
        { label: "Inga", points: 0 },
        { label: "En",   points: 1 },
        { label: "Två",  points: 2 },
        { label: "Tre",  points: 3 },
      ],
    },
  ];

  const npQuestions = q.np_questions && q.np_questions.length > 0
    ? q.np_questions
    : q.np_criteria && q.np_criteria.length > 0
      ? [{ question: "Bedömningsfråga 1", criteria: q.np_criteria }]
      : DEFAULT_NP_QUESTIONS;

  const patchNpQ = (updated: typeof npQuestions) => {
    // Total points = sum of each bedömningsfråga's max criteria points
    const totalPts = updated.reduce((sum, bq) =>
      sum + bq.criteria.reduce((mc, r) => Math.max(mc, r.points), 0), 0);
    patchQ({ np_questions: updated, points: String(totalPts) });
  };

  // Auto-repair stale q.points when the NP-variant tab renders (handles questions
  // saved before the sum-vs-max fix was deployed)
  useEffect(() => {
    if (q.assessment_mode !== 'np_variant') return;
    const correctTotal = npQuestions.reduce((sum, bq) =>
      sum + bq.criteria.reduce((mc, r) => Math.max(mc, r.points), 0), 0);
    if (String(correctTotal) !== String(q.points ?? 0)) {
      patchQ({ points: String(correctTotal) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id, q.assessment_mode]);

  // Helper: render one criteria table editor
  const renderCriteriaEditor = (bqIdx: number, criteria: Array<{ label: string; points: number }>) => {
    const maxPts = criteria.reduce((m, r) => Math.max(m, r.points), 0);
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 76px 28px", gap: 4, paddingBottom: 4, borderBottom: "1px solid var(--ps-rule-2)", marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Beteckning</span>
          <span style={{ fontSize: 10.5, color: "var(--ps-ink-4)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Poäng</span>
          <span />
        </div>
        {criteria.map((row, rIdx) => (
          <div key={rIdx} style={{ display: "grid", gridTemplateColumns: "1fr 76px 28px", gap: 4, marginBottom: 4, alignItems: "center" }}>
            <input type="text" value={row.label} placeholder={`Beteckning ${rIdx + 1}`}
              onChange={e => {
                const updCrit = criteria.map((r, i) => i === rIdx ? { ...r, label: e.target.value } : r);
                const updQs = npQuestions.map((bq, bi) => bi === bqIdx ? { ...bq, criteria: updCrit } : bq);
                patchNpQ(updQs);
              }}
              style={{ ...psInput, fontSize: 12.5 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <input type="number" value={row.points} min={0}
                onChange={e => {
                  const updCrit = criteria.map((r, i) => i === rIdx ? { ...r, points: parseFloat(e.target.value) || 0 } : r);
                  const updQs = npQuestions.map((bq, bi) => bi === bqIdx ? { ...bq, criteria: updCrit } : bq);
                  patchNpQ(updQs);
                }}
                style={{ ...psInput, width: "100%", textAlign: "center" }}
              />
              <span style={{ fontSize: 11, color: "var(--ps-ink-4)", flexShrink: 0 }}>p</span>
            </div>
            <button title="Ta bort rad"
              onClick={() => {
                const updCrit = criteria.filter((_, i) => i !== rIdx);
                const updQs = npQuestions.map((bq, bi) => bi === bqIdx ? { ...bq, criteria: updCrit } : bq);
                patchNpQ(updQs);
              }}
              style={{ width: 26, height: 26, border: "none", borderRadius: 5, background: "transparent", color: "var(--ps-ink-4)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}
            >×</button>
          </div>
        ))}
        <button
          onClick={() => {
            const updCrit = [...criteria, { label: "", points: maxPts + 1 }];
            const updQs = npQuestions.map((bq, bi) => bi === bqIdx ? { ...bq, criteria: updCrit } : bq);
            patchNpQ(updQs);
          }}
          style={{ height: 26, padding: "0 10px", border: "1.5px dashed var(--ps-rule-2)", borderRadius: 5, background: "transparent", color: "var(--ps-ink-3)", fontSize: 11.5, cursor: "pointer", fontFamily: "var(--ps-ui)", width: "100%" }}
        >+ Lägg till rad</button>
      </div>
    );
  };

  const NP_COMMENT_FIELDS = [
    { key: "np_comment_non_scoring" as const,  label: "Kommentar: ej poänggivande svar",       placeholder: "Exempel på svar som inte ger poäng…"                     },
    { key: "np_comment_relevant"   as const,  label: "Exempel på relevanta svar/anledningar", placeholder: "Exempel på relevanta anledningar eller svar…"              },
    { key: "np_comment_elaborated" as const,  label: "Exempel på förtydligande/fördjupning",  placeholder: "Exempel på hur svaren kan förtydligas eller fördjupas…"   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {modeSelector}

      {/* ── Bedömningsfrågor ── */}
      {npQuestions.map((bq, bqIdx) => (
        <div key={bqIdx} style={{ border: "1.5px solid var(--ps-rule-2)", borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "var(--ps-bg-soft)", borderBottom: "1px solid var(--ps-rule-2)" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-accent, #1E5F5C)", flexShrink: 0 }}>
              Bedömningsfråga {bqIdx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <RichTextEditor
                key={`${q.id}-npq-${bqIdx}`}
                value={bq.question}
                onChange={html => {
                  const updQs = npQuestions.map((b, i) => i === bqIdx ? { ...b, question: html } : b);
                  patchNpQ(updQs);
                }}
                placeholder="Skriv bedömningsfrågan…"
                minHeight={36}
                compact
              />
            </div>
            {npQuestions.length > 1 && (
              <button title="Ta bort denna bedömningsfråga"
                onClick={() => patchNpQ(npQuestions.filter((_, i) => i !== bqIdx))}
                style={{ width: 26, height: 26, border: "none", borderRadius: 5, background: "transparent", color: "#e53e3e", cursor: "pointer", fontSize: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >×</button>
            )}
          </div>
          {/* Criteria editor */}
          <div style={{ padding: "10px 12px" }}>
            {renderCriteriaEditor(bqIdx, bq.criteria)}
          </div>
        </div>
      ))}

      {/* Add bedömningsfråga */}
      <button
        onClick={() => patchNpQ([...npQuestions, {
          question: `Bedömningsfråga ${npQuestions.length + 1}`,
          criteria: [{ label: "Inga", points: 0 }, { label: "En", points: 1 }, { label: "Två", points: 2 }, { label: "Tre", points: 3 }],
        }])}
        style={{ height: 32, padding: "0 14px", border: "1.5px dashed var(--ps-accent, #1E5F5C)", borderRadius: 8, background: "transparent", color: "var(--ps-accent, #1E5F5C)", fontSize: 12.5, cursor: "pointer", fontFamily: "var(--ps-ui)", fontWeight: 600 }}
      >
        + Lägg till bedömningsfråga
      </button>

      {/* ── Tre kommentarrutor ── */}
      {NP_COMMENT_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-ink-2)", display: "block", marginBottom: 5 }}>{label}</span>
          <RichTextEditor
            key={`${q.id}-${key}`}
            value={q[key] ?? ""}
            onChange={html => patchQ({ [key]: html })}
            placeholder={placeholder}
            minHeight={100}
            compact
          />
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function QuestionEditModal2({ q, onEdit, onDelete, onClose }: Props) {
  const text = (q.content as { text?: string })?.text ?? "";
  const [tab, setTab] = useState<"content" | "rubric" | "meta">("content");

  const handleTabSwitch = (newTab: "content" | "rubric" | "meta") => {
    setTab(newTab);
  };

  const handleClose = () => {
    onClose();
  };


  const patchContent = (fields: Record<string, unknown>) => {
    onEdit({ content: { ...(q.content as Record<string, unknown>), ...fields } } as Partial<Question>);
  };

  const patchQ = (fields: Partial<Question>) => onEdit(fields);

  const typeName = QUESTION_TYPE_NAMES[q.type] ?? q.type;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    height: 36,
    border: "none",
    borderBottom: active ? "2px solid var(--ps-accent, #1E5F5C)" : "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "var(--ps-ui)",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? "var(--ps-accent, #1E5F5C)" : "var(--ps-ink-2)",
    transition: "all .15s",
  });

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
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "white",
          borderRadius: 12,
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.3)",
          border: "1px solid var(--ps-rule)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--ps-rule)",
            flexShrink: 0,
          }}
        >
          <Minus size={14} style={{ color: "var(--ps-ink-3)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ps-ink-2)", flex: 1 }}>
            {typeName}
          </span>
          <button
            onClick={() => { onDelete(); handleClose(); }}
            title="Ta bort fråga"
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--ps-ink-3)",
            }}
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={handleClose}
            title="Stäng"
            style={{
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--ps-ink-3)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--ps-rule)",
          flexShrink: 0,
          padding: "0 16px",
        }}>
          <button style={tabStyle(tab === "content")} onClick={() => handleTabSwitch("content")}>
            Frågeinnehåll
          </button>
          <button style={tabStyle(tab === "rubric")} onClick={() => handleTabSwitch("rubric")}>
            Bedömning
          </button>
          <button style={tabStyle(tab === "meta")} onClick={() => handleTabSwitch("meta")}>
            Metadata
          </button>
        </div>

        {/* Tab: Frågeinnehåll */}
        {tab === "content" && (
          <>
            {/* Rich text editor */}
            <RichTextEditor
              value={text}
              onChange={(html) => patchContent({ text: html })}
              placeholder="Skriv din uppgift här …"
              minHeight={140}
              showClozeBtn={q.type === "cloze"}
            />

            {/* Type-specific fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px 4px" }}>
              <TypeSpecificFields q={q} patchContent={patchContent} patchQ={patchQ} />
            </div>
          </>
        )}

        {/* Tab: Bedömning */}
        {tab === "rubric" && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <BedömningTab q={q} patchQ={patchQ} />
          </div>
        )}

        {/* Tab: Metadata */}
        {tab === "meta" && (
          <div style={{ padding: "16px 16px 20px" }}>
            <MetadataFields q={q} patchQ={patchQ} />
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionEditModal2;

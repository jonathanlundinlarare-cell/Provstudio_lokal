/**
 * QuestionEditModal2 — Universal question editor modal (v2)
 * Opened from preview/answer mode by clicking a question.
 */

import React, { useState, useRef } from "react";
import { Trash2, X, Minus } from "lucide-react";
import type { Question, QuestionType, MatchingPair } from "@/lib/test-types";
import { RichTextEditor } from "./RichTextEditor";
import { taxonomy, questionBank } from "@/lib/local-db";
import { SO_TAXONOMY } from "@/lib/so-taxonomy";

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
  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
  </label>
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
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    patchContent({ options: next });
                  }}
                  placeholder={`Alternativ ${letters[i]}`}
                  style={{ ...psInput, flex: 1 }}
                />
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
                <input
                  value={pair.left}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[i] = { ...pair, left: e.target.value };
                    patchContent({ pairs: next });
                  }}
                  placeholder="Vänster"
                  style={psInput}
                />
                <span style={{ textAlign: "center", color: "var(--ps-ink-3)", fontSize: 14 }}>→</span>
                <input
                  value={pair.right}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[i] = { ...pair, right: e.target.value };
                    patchContent({ pairs: next });
                  }}
                  placeholder="Höger"
                  style={psInput}
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
                <input
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = e.target.value;
                    patchContent({ items: next });
                  }}
                  placeholder={`Post ${i + 1}`}
                  style={{ ...psInput, flex: 1 }}
                />
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
                  <input
                    value={t.term}
                    onChange={(e) => {
                      const next = [...terms];
                      next[i] = { ...t, term: e.target.value };
                      patchContent({ terms: next });
                    }}
                    style={psInput}
                  />
                </ModalField>
                <ModalField label="Facit / definition">
                  <textarea
                    value={t.def}
                    onChange={(e) => {
                      const next = [...terms];
                      next[i] = { ...t, def: e.target.value };
                      patchContent({ terms: next });
                    }}
                    rows={2}
                    style={{ ...psInput, resize: "vertical" }}
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
                  <input
                    value={sub.text}
                    onChange={e => patchSub(i, { text: e.target.value })}
                    placeholder={`Delfråga ${i + 1}`}
                    style={psInput}
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

    case "formula":
      return (
        <>
          <Collapser title="Formel">
            <ModalField label="Formeluttryck">
              <input
                value={(c.formula as string) ?? ""}
                onChange={(e) => patchContent({ formula: e.target.value })}
                placeholder="t.ex. F = ma"
                style={psInput}
              />
            </ModalField>
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

    case "image":
      return (
        <Collapser title="Bild">
          <ModalField label="Bild-URL">
            <input
              value={(c.imageUrl as string) ?? ""}
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
            <ModalField label="Bild-URL">
              <input
                value={(c.imageUrl as string) ?? ""}
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
    </div>
  );
}

/* ── BedömningTab ───────────────────────────────────────────────────────── */

const GRADE_LABELS: { key: "E" | "C" | "A"; label: string; desc: string; color: string }[] = [
  { key: "E", label: "E", desc: "Godtagbart",                      color: "#16A34A" },
  { key: "C", label: "C", desc: "Välutvecklat",                    color: "#2563EB" },
  { key: "A", label: "A", desc: "Välutvecklat och nyanserat",      color: "#7C3AED" },
];

function BedömningTab({ q, patchQ }: { q: Question; patchQ: (f: Partial<Question>) => void }) {
  const isGroup = q.type === "group";
  const auto = AUTO_TYPES.has(q.type);

  // Local state for rubric text to avoid cursor-jump on every keystroke.
  // Syncs to bank on onBlur.
  const [rubricE, setRubricE] = useState(q.rubric?.E ?? "");
  const [rubricC, setRubricC] = useState(q.rubric?.C ?? "");
  const [rubricA, setRubricA] = useState(q.rubric?.A ?? "");

  // Keep local state in sync when q changes from outside (e.g. initial open)
  const prevQId = useRef(q.id);
  if (prevQId.current !== q.id) {
    prevQId.current = q.id;
    // Reset when a different question is shown (useRef trick to avoid extra render)
  }

  const saveRubric = () => {
    patchQ({
      rubric: { E: rubricE, C: rubricC, A: rubricA },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        const rubricVal = key === "E" ? rubricE : key === "C" ? rubricC : rubricA;
        const setRubric = key === "E" ? setRubricE : key === "C" ? setRubricC : setRubricA;
        const gpVal = q.grade_points?.[key] ?? 0;

        return (
          <div
            key={key}
            style={{
              border: `1.5px solid ${color}30`,
              borderRadius: 10,
              background: `${color}06`,
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderBottom: `1px solid ${color}20`,
              background: `${color}10`,
            }}>
              <span style={{
                width: 24, height: 24,
                borderRadius: "50%",
                background: color,
                color: "white",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#333", flex: 1 }}>{desc}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11.5, color: "var(--ps-ink-3)" }}>Poäng:</span>
                <input
                  type="number"
                  value={gpVal}
                  min={0}
                  onChange={e => patchQ({ grade_points: { ...q.grade_points, [key]: parseFloat(e.target.value) || 0 } })}
                  style={{ ...psInput, width: 60, textAlign: "center" }}
                />
              </div>
            </div>
            {/* Rubric textarea — saves on blur */}
            <div style={{ padding: "10px 14px" }}>
              <textarea
                value={rubricVal}
                onChange={e => setRubric(e.target.value)}
                onBlur={saveRubric}
                placeholder={`Vad krävs för betyget ${label}…`}
                rows={3}
                style={{ ...psInput, resize: "vertical", fontSize: 12.5 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function QuestionEditModal2({ q, onEdit, onDelete, onClose }: Props) {
  const text = (q.content as { text?: string })?.text ?? "";
  const [tab, setTab] = useState<"content" | "rubric">("content");

  const handleTabSwitch = (newTab: "content" | "rubric") => {
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
            />

            {/* Type-specific fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px 4px" }}>
              <TypeSpecificFields q={q} patchContent={patchContent} patchQ={patchQ} />
            </div>

            {/* Metadata (ämne, kategori, svårighet, status, författare) */}
            <div style={{ padding: "8px 16px 20px", borderTop: "1px solid var(--ps-rule)", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "var(--ps-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Metadata
              </div>
              <MetadataFields q={q} patchQ={patchQ} />
            </div>
          </>
        )}

        {/* Tab: Bedömning */}
        {tab === "rubric" && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <BedömningTab q={q} patchQ={patchQ} />
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionEditModal2;

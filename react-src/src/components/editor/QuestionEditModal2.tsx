/**
 * QuestionEditModal2 — Universal question editor modal (v2)
 * Opened from preview/answer mode by clicking a question.
 */

import React, { useState } from "react";
import { Trash2, X, Minus } from "lucide-react";
import type { Question, QuestionType } from "@/lib/test-types";

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
      const allowMultiple = (c.allowMultiple as boolean) ?? false;
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
              <button
                disabled
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 6,
                  border: "1px solid var(--ps-rule-2)",
                  background: "transparent",
                  cursor: "not-allowed",
                  fontFamily: "var(--ps-ui)",
                  fontSize: 12.5,
                  color: "var(--ps-ink-4)",
                  opacity: 0.5,
                }}
              >
                ✦ AI-förslag
              </button>
            </div>
          </div>
          <Toggle2
            label="Tillåt flera rätta svar"
            on={allowMultiple}
            onChange={(v) => patchContent({ allowMultiple: v })}
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
      const correct = c.correct as boolean | undefined;
      return (
        <Collapser title="Rätt svar">
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Sant", value: true },
              { label: "Falskt", value: false },
            ].map(({ label, value }) => (
              <button
                key={String(value)}
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
      const pairs = (c.pairs as [string, string][]) ?? [];
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
                  value={pair[0]}
                  onChange={(e) => {
                    const next = [...pairs] as [string, string][];
                    next[i] = [e.target.value, pair[1]];
                    patchContent({ pairs: next });
                  }}
                  placeholder="Vänster"
                  style={psInput}
                />
                <span style={{ textAlign: "center", color: "var(--ps-ink-3)", fontSize: 14 }}>→</span>
                <input
                  value={pair[1]}
                  onChange={(e) => {
                    const next = [...pairs] as [string, string][];
                    next[i] = [pair[0], e.target.value];
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
            <AddRowBtn onClick={() => patchContent({ pairs: [...pairs, ["", ""] as [string, string]] })}>
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
      type Sub = { text: string; lines: number; points: number };
      const subs = (c.subs as Sub[]) ?? [];
      const totalSubPts = subs.reduce((s, sub) => s + (sub.points ?? 0), 0);
      return (
        <Collapser title="Delfrågor">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {subs.map((sub, i) => (
              <RowBox key={i}>
                <ModalField label={`Delfråga ${i + 1}`}>
                  <input
                    value={sub.text}
                    onChange={(e) => {
                      const next = [...subs];
                      next[i] = { ...sub, text: e.target.value };
                      patchContent({ subs: next });
                    }}
                    style={psInput}
                  />
                </ModalField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <ModalField label="Linjer">
                    <input
                      type="number"
                      value={sub.lines ?? 3}
                      min={1}
                      onChange={(e) => {
                        const next = [...subs];
                        next[i] = { ...sub, lines: parseInt(e.target.value) || 3 };
                        patchContent({ subs: next });
                      }}
                      style={{ ...psInput, width: 60 }}
                    />
                  </ModalField>
                  <ModalField label="Poäng">
                    <input
                      type="number"
                      value={sub.points ?? 1}
                      min={0}
                      onChange={(e) => {
                        const next = [...subs];
                        next[i] = { ...sub, points: parseFloat(e.target.value) || 0 };
                        const newTotal = next.reduce((s, x) => s + (x.points ?? 0), 0);
                        patchContent({ subs: next });
                        patchQ({ points: String(newTotal) });
                      }}
                      style={{ ...psInput, width: 60 }}
                    />
                  </ModalField>
                </div>
              </RowBox>
            ))}
            <AddRowBtn
              onClick={() => {
                const next = [...subs, { text: "", lines: 3, points: 1 }];
                patchContent({ subs: next });
                patchQ({ points: String(next.reduce((s, x) => s + (x.points ?? 0), 0)) });
              }}
            >
              Lägg till delfråga
            </AddRowBtn>
          </div>
          <div style={{ fontSize: 12, color: "var(--ps-ink-3)" }}>
            Summa: <strong>{totalSubPts} p</strong>
          </div>
        </Collapser>
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
      const cols = (c.columns as string[]) ?? ["", ""];
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
                    patchContent({ columns: next });
                  }}
                  placeholder={`Kolumn ${i + 1}`}
                  style={{ ...psInput, flex: 1 }}
                />
              ))}
              <AddRowBtn onClick={() => patchContent({ columns: [...cols, ""], rows: rows.map((r) => [...r, ""]) })}>
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

/* ── RattningsreglerFields ──────────────────────────────────────────────── */

function RattningsreglerFields({
  q,
  patchContent,
  patchQ,
}: {
  q: Question;
  patchContent: (fields: Record<string, unknown>) => void;
  patchQ: (fields: Partial<Question>) => void;
}) {
  const qType = q.type as string;
  if (qType === "info") return null;
  const c = q.content as Record<string, unknown>;
  const auto = AUTO_TYPES.has(q.type);
  const isGroup = q.type === "group";

  const hasPartialCredit = ["multiple_choice", "cloze", "matching", "ranking", "definition"].includes(q.type);

  return (
    <Collapser title="Rättningsregler" defaultOpen={false}>
      {/* Points row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--ps-ink-2)" }}>Tilldela poäng</span>
        {auto && <Pill color="#16A34A">Auto</Pill>}
        {isGroup && <Pill>Summa från delfrågor</Pill>}
      </div>

      {/* Points input */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          value={q.points ?? "0"}
          min={0}
          disabled={isGroup}
          onChange={(e) => patchQ({ points: e.target.value })}
          style={{ ...psInput, width: 70, opacity: isGroup ? 0.5 : 1 }}
        />
        <span style={{ fontSize: 12.5, color: "var(--ps-ink-3)" }}>poäng</span>
        <span style={{ color: "var(--ps-ink-4)", fontSize: 12 }}>→</span>
        <input
          value={(c.scoringRule as string) ?? ""}
          onChange={(e) => patchContent({ scoringRule: e.target.value })}
          placeholder="t.ex. 1p per rätt svar"
          style={{ ...psInput, flex: 1 }}
        />
      </div>

      {hasPartialCredit && (
        <Toggle2
          label="Tillåt delvisa poäng"
          on={(c.partialCredit as boolean) ?? false}
          onChange={(v) => patchContent({ partialCredit: v })}
        />
      )}

      {!auto && (
        <ModalField label="Bedömningsanvisning">
          <textarea
            value={(c.gradingNotes as string) ?? ""}
            onChange={(e) => patchContent({ gradingNotes: e.target.value })}
            placeholder="Beskriv hur svaret ska bedömas…"
            rows={3}
            style={{ ...psInput, resize: "vertical" }}
          />
        </ModalField>
      )}
    </Collapser>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function QuestionEditModal2({ q, onEdit, onDelete, onClose }: Props) {
  const [highlight, setHighlight] = useState("");

  const text = (q.content as { text?: string })?.text ?? "";

  const patchContent = (fields: Record<string, unknown>) => {
    onEdit({ content: { ...(q.content as Record<string, unknown>), ...fields } } as Partial<Question>);
  };

  const patchQ = (fields: Partial<Question>) => onEdit(fields);

  const typeName = QUESTION_TYPE_NAMES[q.type] ?? q.type;

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
            onClick={() => { onDelete(); onClose(); }}
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
            onClick={onClose}
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

        {/* Toolbar row 1 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "4px 12px",
            borderBottom: "1px solid var(--ps-rule)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <TBTN title="Fet"><strong>B</strong></TBTN>
          <TBTN title="Kursiv"><em>I</em></TBTN>
          <TBTN title="Understruken"><span style={{ textDecoration: "underline" }}>U</span></TBTN>
          <TBTN title="Nedsänkt">X<sub style={{ fontSize: 8 }}>2</sub></TBTN>
          <TBTN title="Upphöjt">X<sup style={{ fontSize: 8 }}>2</sup></TBTN>
          <TBTN title="Genomstruken"><span style={{ textDecoration: "line-through" }}>S</span></TBTN>
          <TSEP />
          {/* Highlight button */}
          <button
            title="Markörfärg"
            style={{
              width: 30,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              position: "relative",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ps-ink-2)" }}>A</span>
            <div
              style={{
                width: 14,
                height: 4,
                borderRadius: 2,
                background: highlight || "#F5E6A3",
                border: "1px solid var(--ps-rule-2)",
              }}
            />
          </button>
          {/* Text color */}
          <button
            title="Textfärg"
            style={{
              width: 30,
              height: 30,
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-ink-2)", lineHeight: 1 }}>A</span>
            <div style={{ width: 14, height: 3, borderRadius: 1, background: "#E74C3C", marginTop: 1 }} />
          </button>
          <TBTN title="Formel">√x</TBTN>
          <TBTN title="Bild">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <circle cx="4.5" cy="4.5" r="1.2" fill="currentColor"/>
              <path d="M1 10l3.5-3.5 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TBTN>
          <TBTN title="Tabell">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1"/>
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </TBTN>
          <TBTN title="Matematik">$</TBTN>
          <TBTN title="Kod">&lt;/&gt;</TBTN>
          <TSEP />
          <TBTN title="Justering">≡</TBTN>
          <TBTN title="Numrerad lista">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="5" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <text x="1" y="4" style={{ fontSize: 4, fontFamily: "sans-serif" }} fill="currentColor">1</text>
              <text x="1" y="8" style={{ fontSize: 4, fontFamily: "sans-serif" }} fill="currentColor">2</text>
              <text x="1" y="12" style={{ fontSize: 4, fontFamily: "sans-serif" }} fill="currentColor">3</text>
            </svg>
          </TBTN>
          <TBTN title="Punktlista">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="3" r="1" fill="currentColor"/>
              <circle cx="2.5" cy="7" r="1" fill="currentColor"/>
              <circle cx="2.5" cy="11" r="1" fill="currentColor"/>
              <line x1="5" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </TBTN>
        </div>

        {/* Toolbar row 2 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "4px 12px",
            borderBottom: "1px solid var(--ps-rule)",
            flexShrink: 0,
          }}
        >
          <TBTN title="Stycke">¶</TBTN>
          <TBTN title="Radhöjd">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5"/>
              <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5"/>
            </svg>
          </TBTN>
          <TBTN title="Ångra">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 5h5a4 4 0 0 1 0 8H4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M2 5L5 2M2 5L5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </TBTN>
          <TBTN title="Gör om">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 5H7a4 4 0 0 0 0 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M12 5L9 2M12 5L9 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </TBTN>
          <TBTN title="Helskärm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TBTN>
        </div>

        {/* Highlight palette */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 16px",
            borderBottom: "1px solid var(--ps-rule)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--ps-ink-4)", marginRight: 4 }}>Markering:</span>
          {HIGHLIGHTS.map((h) => (
            <button
              key={h || "none"}
              onClick={() => setHighlight(h)}
              title={h || "Ingen"}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: h || "white",
                border: highlight === h ? "2px solid var(--ps-ink)" : "1px solid var(--ps-rule-2)",
                cursor: "pointer",
                outline: h === "" ? "1px dashed var(--ps-rule-2)" : "none",
              }}
            />
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => patchContent({ text: e.target.value })}
          placeholder="Skriv din uppgift här …"
          style={{
            width: "100%",
            minHeight: 140,
            padding: "14px 16px",
            border: "none",
            outline: "none",
            resize: "vertical",
            fontFamily: "var(--ps-ui)",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--ps-ink)",
            boxSizing: "border-box",
          }}
        />

        {/* Type-specific fields + Rättningsregler */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "12px 16px 20px",
          }}
        >
          <TypeSpecificFields q={q} patchContent={patchContent} patchQ={patchQ} />
          <RattningsreglerFields q={q} patchContent={patchContent} patchQ={patchQ} />
        </div>
      </div>
    </div>
  );
}

export default QuestionEditModal2;

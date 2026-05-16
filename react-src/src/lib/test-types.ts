// =============================================================================
// Provstudio — Datatyper
// v2: Utökad med dokumenttyper, content-block, versioner, freeform-layout.
// Alla befintliga typer behålls oförändrade för bakåtkompatibilitet.
// =============================================================================

// ---------------------------------------------------------------------------
// Frågetyper
// ---------------------------------------------------------------------------

export type QuestionType =
  | "open"
  | "multiple_choice"
  | "true_false"
  | "cloze"
  | "matching"
  | "image"
  | "table"
  | "ranking"
  | "drawing"
  | "source_critique"   // v2: källkritiksfråga med inbyggd källbox
  // v3: utökade typer
  | "short_answer"      // Kortsvarstext (1 rad)
  | "numeric"           // Numeriskt svar med enhet
  | "essay"             // Långt resonerande svar med ordgräns
  | "group"             // Grupprubrik som samlar deluppgifter
  | "definition"        // Definiering av begrepp
  | "diagram_label"     // Bilddiagram med etikettrutor
  | "two_column"        // Jämförelsetabell (2 kolumner)
  | "formula";          // Formeluppgift med variabler

export type OpenContent = {
  text: string;
  lines: number;
};

export type MultipleChoiceContent = {
  text: string;
  options: string[];
  multi: boolean;
  /**
   * Index of the correct option(s). Used for auto-grading.
   * For multi=false: a single number. For multi=true: an array of numbers.
   */
  correctIndex?: number | number[] | null;
};

export type TrueFalseContent = {
  text: string;
  /**
   * Correct answer: 0 = Sant, 1 = Falskt.
   * Matches student.tsx where setAnswer(0) = "Sant".
   */
  correct?: number | null;
};

export type ClozeContent = {
  /** Text where blanks are marked as ___ (three or more underscores). */
  text: string;
};

export type MatchingPair = { left: string; right: string };
export type MatchingContent = {
  text: string;
  pairs: MatchingPair[];
};

export type ImageContent = {
  text: string;
  imageUrl: string;
  caption?: string;
  /** Lines for written answer below the image. 0 = no lines. */
  lines: number;
};

export type TableContent = {
  text: string;
  /** Header row (column titles). */
  headers: string[];
  /** Body rows. Empty strings render as blank cells for students to fill in. */
  rows: string[][];
};

export type RankingContent = {
  text: string;
  /** Items to be ranked by the student (will print as a numbered checkbox list). */
  items: string[];
};

export type DrawingContent = {
  text: string;
  /** Height in mm of the empty drawing area. */
  heightMm: number;
};

/** v2: Källkritiksfråga med inbyggd källbox */
export type SourceCritiqueContent = {
  /** Frågetext ovanför källan */
  text: string;
  /** Källans rubrik */
  sourceTitle: string;
  /** Källtextens brödtext */
  sourceText: string;
  /** Attribution / upphovsman / publiceringsdatum */
  sourceAttribution: string;
  /** Valfri bild som kompletterar källan */
  sourceImageUrl?: string;
  /** Källtyp, t.ex. "Tidningsartikel", "Graf", "Statistik" */
  category?: string;
  /** Skrivlinjer för elevens svar */
  lines: number;
};

/** v3: Kortsvarstext — en eller ett fåtal rader */
export type ShortAnswerContent = {
  text: string;
  lines: number;
  maxWords?: number;
};

/** v3: Numeriskt svar med valfri enhet */
export type NumericContent = {
  text: string;
  unit?: string;
  decimalPlaces?: number;
};

/** v3: Resonerande långsvar med ordgräns */
export type EssayContent = {
  text: string;
  lines: number;
  wordLimit?: number;
};

/** v3: Grupprubrik — samlar deluppgifter under en gemensam instruktion */
export type GroupContent = {
  title: string;
  instructions?: string;
};

/** v3: Begreppsdefinition */
export type DefinitionContent = {
  term: string;
  lines: number;
};

/** v3: Bilddiagram med märkningspunkter */
export type DiagramLabelContent = {
  text: string;
  imageUrl: string;
  labels: string[];
  /** Höjd på ritområdet i mm */
  heightMm: number;
};

/** v3: Jämförelsetabell med två kolumner */
export type TwoColumnContent = {
  text: string;
  colA: string;
  colB: string;
  rows: number;
};

/** v3: Formeluppgift med variabeltabell */
export type FormulaContent = {
  text: string;
  formula?: string;
  variables?: { name: string; description: string }[];
  lines: number;
};

export type QuestionContent =
  | OpenContent
  | MultipleChoiceContent
  | TrueFalseContent
  | ClozeContent
  | MatchingContent
  | ImageContent
  | TableContent
  | RankingContent
  | DrawingContent
  | SourceCritiqueContent
  | ShortAnswerContent
  | NumericContent
  | EssayContent
  | GroupContent
  | DefinitionContent
  | DiagramLabelContent
  | TwoColumnContent
  | FormulaContent;

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Lätt",
  medium: "Medel",
  hard: "Svår",
};

// ---------------------------------------------------------------------------
// Freeform-layout (v2)
// ---------------------------------------------------------------------------

/**
 * Absolut position + storlek för ett block i freeform-läge.
 * Koordinater och storlek anges i mm från övre vänstra hörnet på A4-sidan.
 * null = linjärt läge (default, bakåtkompatibelt).
 */
export type BlockLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// ---------------------------------------------------------------------------
// Fråga
// ---------------------------------------------------------------------------

export type QuestionStatus = "approved" | "review" | "draft" | "archived";

export type Question = {
  id: string;
  user_id: string;
  type: QuestionType;
  subject: string | null;
  /** Underkategori / ämnesområde */
  cat?: string | null;
  tags: string[] | null;
  content: QuestionContent;
  points: string | null;
  difficulty?: Difficulty | null;
  /** v2: Freeform-position. null = linjärt läge. */
  layout?: BlockLayout | null;
  /** Bedömningsstatus */
  status?: QuestionStatus;
  /** Bedömningsanvisningar per betygssteg */
  rubric?: { E?: string; C?: string; A?: string };
  /** Poäng per betygssteg */
  grade_points?: { E?: number; C?: number; A?: number };
  /** Antal prov frågan används i */
  used_in?: number;
  /** Skapare/författare */
  author?: string;
  /** Senast uppdaterad (läsbar sträng) */
  updated?: string;
};

// ---------------------------------------------------------------------------
// Content-block (v2) — icke-fråge-block för häften och läxor
// ---------------------------------------------------------------------------

export type ContentBlockType =
  | "intro"         // Inledande brödtext med dropplock
  | "instruction"   // Instruktionsruta med vänster accent-bar
  | "source"        // Källtext-box (titel, text, attribution)
  | "vocab"         // Ordförklaring / glosor
  | "quote"         // Citat med vänster border
  | "callout"       // Informationsruta (färgad bakgrund)
  | "image"         // Bild med bildtext
  | "checklist"     // Checklistepunkter
  | "marginNote"    // Lärarnotering i marginalen (dold i elevversion)
  | "pageBreak"     // Tvingad sidbrytning
  | "divider"       // Horisontell separator
  | "heading";      // Kapitelrubrik + underrubrik

export type ContentBlock = {
  id: string;
  block_type: ContentBlockType;
  /** Type-specifik data som JSONB — se nedan för per-typ-fält */
  content: ContentBlockContent;
  /** v2: Freeform-position. null = linjärt läge. */
  layout?: BlockLayout | null;
};

// Per-typ content-shapes (dokumenterade för editor/renderer)
export type IntroBlockContent      = { text: string; dropCap?: boolean };
export type InstructionBlockContent = { text: string };
export type SourceBlockContent     = { title: string; text: string; attribution?: string; imageUrl?: string };
export type VocabBlockContent      = { word: string; definition: string; related?: string[] };
export type QuoteBlockContent      = { text: string; attribution?: string };
export type CalloutBlockContent    = { text: string; color?: string };
export type ImageBlockContent      = { imageUrl: string; caption?: string; altText?: string };
export type ChecklistBlockContent  = { items: string[] };
export type MarginNoteBlockContent = { text: string };
export type PageBreakBlockContent  = Record<string, never>;
export type DividerBlockContent    = Record<string, never>;
export type HeadingBlockContent    = { title: string; subtitle?: string; chapterLabel?: string };

export type ContentBlockContent =
  | IntroBlockContent
  | InstructionBlockContent
  | SourceBlockContent
  | VocabBlockContent
  | QuoteBlockContent
  | CalloutBlockContent
  | ImageBlockContent
  | ChecklistBlockContent
  | MarginNoteBlockContent
  | PageBreakBlockContent
  | DividerBlockContent
  | HeadingBlockContent
  | Record<string, unknown>; // fallback för okända block

export const CONTENT_BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  intro:       "Introduktion",
  instruction: "Instruktion",
  source:      "Källa",
  vocab:       "Ordlista",
  quote:       "Citat",
  callout:     "Informationsruta",
  image:       "Bild",
  checklist:   "Checklista",
  marginNote:  "Lärarnotering",
  pageBreak:   "Sidbrytning",
  divider:     "Avdelare",
  heading:     "Rubrik",
};

// ---------------------------------------------------------------------------
// Dokument-typ + question_order (v2)
// ---------------------------------------------------------------------------

/** v2: Typ av dokument — prov, arbetshäfte eller läxa. */
export type DocumentType = "test" | "workbook" | "homework";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  test:     "Prov",
  workbook: "Häfte",
  homework: "Läxa",
};

/**
 * Bakåtkompatibel union för question_order-arrayen.
 * Befintliga rader med { question_id } funkar utan ändringar.
 * v2 lägger till { block_id } för content-block.
 */
export type QuestionOrderItem =
  | TestQuestionRef                           // befintlig frågereferens
  | ContentBlockRef;                          // v2: content-block

/** Referens till en content-block i question_order */
export type ContentBlockRef = {
  block_id: string;
  block_type: ContentBlockType;
  content: ContentBlockContent;
  layout?: BlockLayout | null;
};

/** Type-guard: är detta en fråge-ref? */
export function isQuestionRef(item: QuestionOrderItem): item is TestQuestionRef {
  return "question_id" in item;
}

/** Type-guard: är detta en content-block-ref? */
export function isContentBlockRef(item: QuestionOrderItem): item is ContentBlockRef {
  return "block_id" in item;
}

// ---------------------------------------------------------------------------
// Versioner (v2)
// ---------------------------------------------------------------------------

export type VersionChangeType =
  | "replaced"    // Ersätter blockets innehåll helt
  | "support"     // Lägger till stöd-material (scaffolding) bredvid blocket
  | "simplified"  // Förenklad version av blockets text
  | "added"       // Nytt block som bara finns i denna version
  | "hidden";     // Blocket döljs i denna version

export type VersionChange = {
  block_id: string;
  change_type: VersionChangeType;
  /** Nytt content om change_type är "replaced" | "support" | "simplified" | "added" */
  content?: ContentBlockContent | Record<string, unknown>;
};

export type VersionConditionType = "need" | "group";

export type VersionRule = {
  condition: { type: VersionConditionType; value: string };
  /** Lägre siffra = högre prioritet (first-match-wins) */
  priority: number;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  name: string;
  color: string;
  is_default: boolean;
  rules: VersionRule[];
  changes: VersionChange[];
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Elevbehov (v2)
// ---------------------------------------------------------------------------

export type WellKnownStudentNeed = "dyslexi" | "adhd" | "sv2" | "utmaning";
/** Elevbehov — fördefinierade värden + fri text */
export type StudentNeed = WellKnownStudentNeed | string;

export const STUDENT_NEED_LABELS: Record<WellKnownStudentNeed, string> = {
  dyslexi:  "Dyslexi",
  adhd:     "ADHD",
  sv2:      "Sv2",
  utmaning: "Utmaning",
};

export type StudentNeeds = {
  id: string;
  student_id: string;
  needs: StudentNeed[];
  notes?: string | null;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// Design & teman
// ---------------------------------------------------------------------------

export type TitleAccent = {
  text: string;
  color: string;
};

export type FontFamily = "serif" | "humanist" | "geometrisk" | "system" | "sans" | "rounded" | "mono";

export type DesignSettings = {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  primaryColor: string;
  defaultLines: number;
  showCover: boolean;
  version?: string;
  titleAccents?: TitleAccent[];
  /** Typsnitt för hela provet. */
  fontFamily?: FontFamily;
  /** Tjocklek på skrivlinjer i px. */
  lineThickness?: number;
  /** Avstånd mellan skrivlinjer i mm. */
  lineSpacing?: number;
  /** Sidfot-text (t.ex. lärarens namn eller skolnamn). */
  footerText?: string;
  /** Logotyp på försättsbladet (URL). */
  logoUrl?: string;
  /** Försättsbild under titeln (URL). */
  coverImageUrl?: string;
  /** Storlek på frågetext (pt). */
  fontSizeBody?: number;
  /** Storlek på siffran i frågeblockets banner (pt). */
  fontSizeBlockNumber?: number;
  /** Vertikal padding på banner (mm) — gör bannern högre/smalare. */
  blockNumberPaddingY?: number;
  /** Storlek på försättsbladets titel (pt). */
  fontSizeTitle?: number;
  /** Storlek på försättsbladets undertitel (pt). */
  fontSizeSubtitle?: number;
  /** Storlek på poängtext (pt). */
  fontSizePoints?: number;
  /** Storlek på underfrågors bokstav (a, b, c) (pt). */
  fontSizeSubLetter?: number;
  /** Visuell layout-stil: classic | editorial | minimal | exam */
  layout?: "classic" | "editorial" | "minimal" | "exam";
  /** Stil på skrivlinjer: solid | dashed | dotted */
  lineStyle?: "solid" | "dashed" | "dotted";
  /** Numreringsstil: number | letter | roman | paren */
  numbering?: "number" | "letter" | "roman" | "paren";
  /** Färg på numrering: ink | accent */
  numColor?: "ink" | "accent";
  /** Visa poäng vid varje fråga */
  showPoints?: boolean;
  /** Stil på poängvisning: italic | pill | box | blank */
  pointsStyle?: "italic" | "pill" | "box" | "blank";
  /** Markör för flervalsfrågor: square | circle | letter */
  mcMarker?: "square" | "circle" | "letter";
  /** Visa sidnummer */
  showPageNumbers?: boolean;
  /** Kursnamn (visas på försättsblad) */
  course?: string;
  /** Skolnamn (visas på försättsblad) */
  school?: string;
  /** Provtid (t.ex. "60 minuter") */
  duration?: string;
  /** Hjälpmedel (t.ex. "Inga") */
  aids?: string;
  /** Undertitel på provet */
  subtitle?: string;

  // ── v3: Utökade designinställningar ──────────────────────────────────

  /** Typsnitt för rubriker (font-family-sträng eller id från FONT_OPTIONS) */
  headingFont?: string;
  /** Typsnitt för brödtext (font-family-sträng eller id från FONT_OPTIONS) */
  bodyFont?: string;
  /** Rubrikfontens vikt */
  titleWeight?: "400" | "500" | "600" | "700" | "800";
  /** Rubrik i kursiv */
  titleItalic?: boolean;
  /** Rubrik text-transform */
  titleTransform?: "none" | "uppercase" | "capitalize";
  /** Rubrik letter-spacing */
  titleTracking?: string;
  /** Rubrikfärg: ink = svart, accent = accentfärg */
  titleColor?: "ink" | "accent";
  /** Sektionsrubrik kursiv */
  sectionItalic?: boolean;
  /** Markeringsfärg för highlight-block */
  highlightColor?: string;
  /** Numreringsstil: plain | fraga | display | chip */
  numStyle?: "plain" | "fraga" | "display" | "chip";
  /** Visa per-fråga metadata (Bloom, svårighet, tid, bonus) */
  showMeta?: boolean;
  /** Kort-stil runt frågorna: flat | framed | banded | gutter | indented | stamped */
  cardStyle?: "flat" | "framed" | "banded" | "gutter" | "indented" | "stamped";
  /** Pappersyta: white | cream | warm | linen | dot | grid | ruled | graph */
  paperStyle?: "white" | "cream" | "warm" | "linen" | "dot" | "grid" | "ruled" | "graph";
  /** Sidram: none | thin | thick | double | shadow */
  pageFrame?: "none" | "thin" | "thick" | "double" | "shadow";
  /** Vattenstämpeltext */
  watermark?: string;
  /** Dropplock på öppen fråga: none | first | all */
  dropCap?: "none" | "first" | "all";
  /** Ornament i provhuvud */
  headerOrnament?: "none" | "rule" | "dots" | "diamond" | "wave";
  /** Avdelare mellan sektioner */
  sectionDivider?: "none" | "thin" | "thick" | "ornament" | "space";
  /** Densitet (avstånd): comfortable | compact | spacious */
  density?: "comfortable" | "compact" | "spacious";
  /** Sidfotsstil: plain | fancy | centered | minimal */
  footerStyle?: "plain" | "fancy" | "centered" | "minimal";
  /** Försättsbildsinställningar */
  coverImage?: {
    enabled: boolean;
    /** Typ av inbyggd illustration */
    kind: "painting" | "landscape" | "city" | "industrial" | "manuscript" | "abstract";
    /** Bildhöjd i mm */
    height: number;
    /** Y-toningspunkt (% av höjden) */
    fadeY: number;
    /** Sidtoning i mm (0 = ingen) */
    fadeX: number;
    /** Opacitet 0–1 */
    opacity: number;
    /** Anpassad bild-URL (overridar kind om satt) */
    src?: string;
  };
};

export const DEFAULT_DESIGN: DesignSettings = {
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,
  primaryColor: "#1e3a5f",
  defaultLines: 4,
  showCover: true,
  version: "",
  titleAccents: [],
  fontFamily: "humanist",
  lineThickness: 1,
  lineSpacing: 12,
  footerText: "",
  logoUrl: "",
  coverImageUrl: "",
  fontSizeBody: 11,
  fontSizeBlockNumber: 24,
  blockNumberPaddingY: 4,
  fontSizeTitle: 56,
  fontSizeSubtitle: 12,
  fontSizePoints: 10,
  fontSizeSubLetter: 11,
  layout: "classic",
  lineStyle: "solid",
  numbering: "number",
  numColor: "ink",
  showPoints: true,
  pointsStyle: "italic",
  mcMarker: "square",
  showPageNumbers: true,
  course: "",
  school: "",
  duration: "",
  aids: "",
  subtitle: "",
  // v3 defaults
  headingFont: "Newsreader, serif",
  bodyFont: "Inter, sans-serif",
  titleWeight: "700",
  titleItalic: false,
  titleTransform: "none",
  titleTracking: "-0.02em",
  titleColor: "ink",
  sectionItalic: false,
  highlightColor: "none",
  numStyle: "plain",
  showMeta: false,
  cardStyle: "flat",
  paperStyle: "white",
  pageFrame: "none",
  watermark: "",
  dropCap: "none",
  headerOrnament: "none",
  sectionDivider: "none",
  density: "comfortable",
  footerStyle: "plain",
  coverImage: {
    enabled: false,
    kind: "painting",
    height: 60,
    fadeY: 40,
    fadeX: 0,
    opacity: 0.6,
    src: "",
  },
};

export type ColorTheme = {
  name: string;
  primary: string;
  accents?: TitleAccent[];
};

export const COLOR_THEMES: ColorTheme[] = [
  { name: "Klassisk blå", primary: "#1e3a5f" },
  { name: "Skog", primary: "#2d5a3d" },
  { name: "Bordeaux", primary: "#7a1f2b" },
  { name: "Grafit", primary: "#2c2c2c" },
  { name: "Senap", primary: "#a87f1a" },
  { name: "Plommon", primary: "#5c2a5c" },
];

// ---------------------------------------------------------------------------
// TestRecord (utökat i v2 med doc_type)
// ---------------------------------------------------------------------------

export type TestRecord = {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  design_settings: DesignSettings;
  /** v1: TestQuestionRef[]. v2: QuestionOrderItem[] (bakåtkompatibel union). */
  question_order: QuestionOrderItem[];
  /** v2: Dokumenttyp. DEFAULT 'test' — befintliga rader oförändrade. */
  doc_type?: DocumentType;
};

// ---------------------------------------------------------------------------
// TestQuestionRef (oförändrad från v1)
// ---------------------------------------------------------------------------

export type TestQuestionRef = {
  question_id: string;
  /** When true, this question groups under the previous one as a sub-question (a, b, c …). */
  group?: boolean;
  overrides?: Partial<{ points: string; lines: number }>;
  /** When set on a non-group question, starts a new named section in the editor outline. */
  section_label?: string;
  /** v2: Freeform per-document position. null = linjärt läge. */
  layout?: BlockLayout | null;
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  open:             "Öppen",
  multiple_choice:  "Flerval",
  true_false:       "Sant/falskt",
  cloze:            "Lucktext",
  matching:         "Matchning",
  image:            "Bildfråga",
  table:            "Tabell",
  ranking:          "Rangordning",
  drawing:          "Rityta",
  source_critique:  "Källkritik",
  // v3
  short_answer:     "Kortsvar",
  numeric:          "Numerisk",
  essay:            "Resonerande",
  group:            "Grupp",
  definition:       "Definition",
  diagram_label:    "Diagram",
  two_column:       "Jämförelse",
  formula:          "Formel",
};

// ---------------------------------------------------------------------------
// Hjälpfunktioner (oförändrade + source_critique-stöd)
// ---------------------------------------------------------------------------

/**
 * Returnerar antal skrivlinjer för en fråga om frågetypen stödjer det,
 * annars null. Används för att visa "original"-värde i override-popovern.
 */
export function getQuestionLines(q: Question): number | null {
  if (q.type === "open")             return (q.content as OpenContent).lines ?? 0;
  if (q.type === "image")            return (q.content as ImageContent).lines ?? 0;
  if (q.type === "source_critique")  return (q.content as SourceCritiqueContent).lines ?? 0;
  if (q.type === "short_answer")     return (q.content as ShortAnswerContent).lines ?? 0;
  if (q.type === "essay")            return (q.content as EssayContent).lines ?? 0;
  if (q.type === "definition")       return (q.content as DefinitionContent).lines ?? 0;
  if (q.type === "formula")          return (q.content as FormulaContent).lines ?? 0;
  return null;
}

/**
 * Returnerar true om frågetypen stödjer override av skrivlinjer.
 */
export function questionSupportsLines(q: Question): boolean {
  return q.type === "open" || q.type === "image" || q.type === "source_critique"
    || q.type === "short_answer" || q.type === "essay" || q.type === "definition" || q.type === "formula";
}

/**
 * Slår ihop en fråga från banken med eventuella per-prov-overrides
 * (poäng och skrivlinjer). Originalfrågan i banken muteras inte.
 */
export function applyOverrides(q: Question, ref: TestQuestionRef): Question {
  const ov = ref.overrides;
  if (!ov) return q;
  const merged: Question = { ...q };
  if (ov.points !== undefined) merged.points = ov.points;
  if (ov.lines !== undefined) {
    if (q.type === "open") {
      merged.content = { ...(q.content as OpenContent), lines: ov.lines };
    } else if (q.type === "image") {
      merged.content = { ...(q.content as ImageContent), lines: ov.lines };
    } else if (q.type === "source_critique") {
      merged.content = { ...(q.content as SourceCritiqueContent), lines: ov.lines };
    } else if (q.type === "short_answer") {
      merged.content = { ...(q.content as ShortAnswerContent), lines: ov.lines };
    } else if (q.type === "essay") {
      merged.content = { ...(q.content as EssayContent), lines: ov.lines };
    } else if (q.type === "definition") {
      merged.content = { ...(q.content as DefinitionContent), lines: ov.lines };
    } else if (q.type === "formula") {
      merged.content = { ...(q.content as FormulaContent), lines: ov.lines };
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Auto-rättning (v2) — beräknar poäng för objektiva frågetyper
// ---------------------------------------------------------------------------

/**
 * Beräknar poäng för objektiva frågetyper.
 * Returnerar null för öppna frågor som kräver manuell rättning.
 *
 * @param q         Frågan med correct-svar i content
 * @param answer    Elevens svar (samma format som session_students.answers[q.id])
 * @param maxPoints Maxpoäng att tilldela vid rätt svar
 */
export function computeAutoScore(
  q: Question,
  answer: unknown,
  maxPoints?: number,
): number | null {
  const pts = maxPoints ?? (parseFloat(q.points ?? "0") || 1);

  if (q.type === "multiple_choice") {
    const content = q.content as MultipleChoiceContent;
    if (content.correctIndex === undefined || content.correctIndex === null) return null;
    if (content.multi) {
      const correct = Array.isArray(content.correctIndex) ? content.correctIndex : [content.correctIndex];
      const given   = Array.isArray(answer) ? (answer as number[]) : [];
      const isRight =
        correct.length === given.length &&
        correct.every((c) => given.includes(c));
      return isRight ? pts : 0;
    } else {
      return answer === content.correctIndex ? pts : 0;
    }
  }

  if (q.type === "true_false") {
    const content = q.content as TrueFalseContent;
    if (content.correct === undefined || content.correct === null) return null;
    return answer === content.correct ? pts : 0;
  }

  if (q.type === "cloze") {
    // Lucktext: answer är Record<blankIndex, string>
    const text = (q.content as ClozeContent).text;
    const blanks = text.match(/_{3,}/g) ?? [];
    if (blanks.length === 0) return null;
    // Without an answer key we can't auto-grade — return null
    return null;
  }

  // open, matching, ranking, image, table, drawing, source_critique → manuell rättning
  return null;
}

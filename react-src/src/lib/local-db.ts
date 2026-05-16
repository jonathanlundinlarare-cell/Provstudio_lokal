import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionOrderItem, DesignSettings, DocumentType, DocumentVersion } from './test-types';
import { DEFAULT_DESIGN } from './test-types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocalDocument = {
  id: string;
  title: string;
  subject: string;
  doc_type: DocumentType;
  design_settings: DesignSettings;
  question_order: QuestionOrderItem[];
  versions?: DocumentVersion[];
  created_at: string;
  updated_at: string;
};

type LocalStore = {
  schemaVersion: number;
  questions: Question[];
  documents: LocalDocument[];
  customTaxonomy?: Record<string, string[]>;
};

// ── In-memory store ───────────────────────────────────────────────────────────

let store: LocalStore = {
  schemaVersion: 1,
  questions: [],
  documents: [],
};

// ── Persistence ───────────────────────────────────────────────────────────────

declare global {
  interface Window {
    localAPI?: {
      loadData: () => Promise<Record<string, unknown>>;
      saveData: (data: unknown) => Promise<void>;
      saveImage: (id: string, b64: string) => Promise<void>;
      readImage: (id: string) => Promise<string | null>;
      openPrint: (docId: string) => Promise<void>;
      exportFile: (data: unknown) => Promise<{ success: boolean }>;
      importFile: () => Promise<unknown>;
      fetchUpdate: (url: string) => Promise<string>;
      saveIndexHtml: (html: string) => Promise<void>;
      getVersion: () => Promise<string>;
    };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (window.localAPI) {
      window.localAPI.saveData(store);
    } else {
      localStorage.setItem('provstudio-store', JSON.stringify(store));
    }
  }, 500);
}

export async function initStore(): Promise<void> {
  let raw: Record<string, unknown> = {};
  if (window.localAPI) {
    raw = (await window.localAPI.loadData()) as Record<string, unknown>;
  } else {
    const saved = localStorage.getItem('provstudio-store');
    if (saved) raw = JSON.parse(saved);
  }

  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    (raw as Record<string, unknown>).schemaVersion === 1
  ) {
    const r = raw as Record<string, unknown>;

    // Filter out malformed questions (must have id + type)
    const rawQuestions = Array.isArray(r.questions) ? r.questions : [];
    const validQuestions = rawQuestions.filter(
      (q): q is Question =>
        q !== null &&
        typeof q === "object" &&
        typeof (q as Record<string, unknown>).id === "string" &&
        typeof (q as Record<string, unknown>).type === "string"
    );
    if (validQuestions.length !== rawQuestions.length) {
      console.warn(
        `[local-db] Dropped ${rawQuestions.length - validQuestions.length} malformed question(s)`
      );
    }

    // Filter out malformed documents (must have id + title)
    const rawDocuments = Array.isArray(r.documents) ? r.documents : [];
    const validDocuments = rawDocuments.filter(
      (d): d is LocalDocument =>
        d !== null &&
        typeof d === "object" &&
        typeof (d as Record<string, unknown>).id === "string" &&
        typeof (d as Record<string, unknown>).title === "string"
    );
    if (validDocuments.length !== rawDocuments.length) {
      console.warn(
        `[local-db] Dropped ${rawDocuments.length - validDocuments.length} malformed document(s)`
      );
    }

    store = {
      schemaVersion: 1,
      questions: validQuestions,
      documents: validDocuments,
      customTaxonomy: r.customTaxonomy as Record<string, string[]> ?? undefined,
    } as LocalStore;
  } else {
    // schema mismatch or missing — start fresh but log it
    console.warn("[local-db] Unrecognised schema, starting fresh", raw);
  }
}

// ── Documents ─────────────────────────────────────────────────────────────────

export const documents = {
  list(): LocalDocument[] {
    return [...store.documents].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  get(id: string): LocalDocument | undefined {
    return store.documents.find((d) => d.id === id);
  },

  create(partial?: Partial<LocalDocument>): LocalDocument {
    const now = new Date().toISOString();
    const doc: LocalDocument = {
      id: uuidv4(),
      title: 'Namnlöst dokument',
      subject: '',
      doc_type: 'test',
      design_settings: { ...DEFAULT_DESIGN },
      question_order: [],
      created_at: now,
      updated_at: now,
      ...partial,
    };
    store.documents.push(doc);
    scheduleSave();
    return doc;
  },

  update(id: string, patch: Partial<LocalDocument>): LocalDocument | null {
    const idx = store.documents.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    store.documents[idx] = {
      ...store.documents[idx],
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    scheduleSave();
    return store.documents[idx];
  },

  delete(id: string): void {
    store.documents = store.documents.filter((d) => d.id !== id);
    scheduleSave();
  },

  duplicate(id: string): LocalDocument | null {
    const original = store.documents.find((d) => d.id === id);
    if (!original) return null;
    const now = new Date().toISOString();
    const copy: LocalDocument = {
      ...JSON.parse(JSON.stringify(original)),
      id: uuidv4(),
      title: `${original.title} (kopia)`,
      created_at: now,
      updated_at: now,
    };
    store.documents.push(copy);
    scheduleSave();
    return copy;
  },
};

// ── Question bank ─────────────────────────────────────────────────────────────

export const questionBank = {
  list(): Question[] {
    return [...store.questions];
  },

  get(id: string): Question | undefined {
    return store.questions.find((q) => q.id === id);
  },

  create(partial?: Partial<Question>): Question {
    const q: Question = {
      id: uuidv4(),
      user_id: 'local',
      type: 'open',
      subject: null,
      tags: null,
      content: { text: '', lines: 4 },
      points: null,
      difficulty: null,
      ...partial,
    } as Question;
    store.questions.push(q);
    scheduleSave();
    return q;
  },

  update(id: string, patch: Partial<Question>): Question | null {
    const idx = store.questions.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    store.questions[idx] = { ...store.questions[idx], ...patch, id };
    scheduleSave();
    return store.questions[idx];
  },

  delete(id: string): void {
    store.questions = store.questions.filter((q) => q.id !== id);
    scheduleSave();
  },
};

// ── Custom taxonomy ───────────────────────────────────────────────────────────

export const taxonomy = {
  get(): Record<string, string[]> {
    return store.customTaxonomy ?? {};
  },

  addSubject(name: string): void {
    if (!store.customTaxonomy) store.customTaxonomy = {};
    if (!store.customTaxonomy[name]) store.customTaxonomy[name] = [];
    scheduleSave();
  },

  addCategory(subject: string, cat: string): void {
    if (!store.customTaxonomy) store.customTaxonomy = {};
    if (!store.customTaxonomy[subject]) store.customTaxonomy[subject] = [];
    if (!store.customTaxonomy[subject].includes(cat)) {
      store.customTaxonomy[subject].push(cat);
      scheduleSave();
    }
  },

  removeSubject(name: string): void {
    if (store.customTaxonomy) {
      delete store.customTaxonomy[name];
      scheduleSave();
    }
  },

  removeCategory(subject: string, cat: string): void {
    if (store.customTaxonomy?.[subject]) {
      store.customTaxonomy[subject] = store.customTaxonomy[subject].filter(c => c !== cat);
      scheduleSave();
    }
  },
};

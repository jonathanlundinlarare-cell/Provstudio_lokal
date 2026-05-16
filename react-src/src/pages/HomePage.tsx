import { useState } from 'react';
import { documents } from '../lib/local-db';
import type { LocalDocument } from '../lib/local-db';
import type { DocumentType, DesignSettings } from '../lib/test-types';
import { DEFAULT_DESIGN, DOCUMENT_TYPE_LABELS } from '../lib/test-types';
import { BookOpen, FileText, Home, Search, Trash2, Copy, Pencil, Plus, Layers } from 'lucide-react';

// ── Templates ────────────────────────────────────────────────────────────────

type Template = {
  id: string;
  title: string;
  subtitle: string;
  docType: DocumentType;
  icon: React.ReactNode;
  color: string;
  design: Partial<DesignSettings>;
};

const TEMPLATES: Template[] = [
  {
    id: "kortprov",
    title: "Kortprov",
    subtitle: "Snabbt 15–30 min · kompakt layout",
    docType: "test",
    icon: <FileText size={15} />,
    color: "#1E3A5F",
    design: { density: "compact", numStyle: "plain", duration: "30 minuter" },
  },
  {
    id: "nationellt",
    title: "Nationellt prov-layout",
    subtitle: "Spaciöst · tydliga sektioner · 2 kolumner",
    docType: "test",
    icon: <FileText size={15} />,
    color: "#1E5F5C",
    design: { density: "spacious", numStyle: "fraga", cardStyle: "framed", headerOrnament: "rule" },
  },
  {
    id: "lasforstaelse",
    title: "Läsförståelse",
    subtitle: "Källtext + frågor · serifftypsnitt",
    docType: "test",
    icon: <BookOpen size={15} />,
    color: "#A87F1A",
    design: { headingFont: "newsreader", bodyFont: "newsreader", density: "comfortable", numStyle: "plain" },
  },
  {
    id: "matematik",
    title: "Matematikprov",
    subtitle: "Formel- och räkneuppgifter · extra skrivlinjer",
    docType: "test",
    icon: <FileText size={15} />,
    color: "#7A1F2B",
    design: { density: "comfortable", numStyle: "display", footerStyle: "minimal" },
  },
  {
    id: "hafteSO",
    title: "SO-häfte",
    subtitle: "Historia / Geografi / Samhällskunskap",
    docType: "workbook",
    icon: <BookOpen size={15} />,
    color: "#5C2A5C",
    design: { headingFont: "newsreader", primaryColor: "#5C2A5C", density: "comfortable" },
  },
  {
    id: "laxa",
    title: "Läxa",
    subtitle: "Hemuppgift · kompakt · klara sektioner",
    docType: "homework",
    icon: <Home size={15} />,
    color: "#2D5A3D",
    design: { density: "compact", numStyle: "chip", footerStyle: "minimal" },
  },
];

type Props = {
  onOpen: (docId: string) => void;
  onNew: (type: DocumentType) => void;
  onBank: () => void;
};

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  test:     <FileText size={14} />,
  workbook: <BookOpen size={14} />,
  homework: <Home size={14} />,
};

const TYPE_CHIP_CLASS: Record<DocumentType, string> = {
  test:     'ps-chip ps-chip-blue',
  workbook: 'ps-chip ps-chip-green',
  homework: 'ps-chip ps-chip-amber',
};

export default function HomePage({ onOpen, onNew, onBank }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [, forceUpdate] = useState(0);

  function refresh() { forceUpdate((n) => n + 1); }

  function handleDelete(doc: LocalDocument) {
    if (confirm(`Ta bort "${doc.title}"?`)) {
      documents.delete(doc.id);
      refresh();
    }
  }

  function handleDuplicate(doc: LocalDocument) {
    documents.duplicate(doc.id);
    refresh();
  }

  function handleFromTemplate(tpl: Template) {
    const doc = documents.create({
      doc_type: tpl.docType,
      title: tpl.title,
      design_settings: { ...DEFAULT_DESIGN, ...tpl.design } as DesignSettings,
    });
    onOpen(doc.id);
  }

  const all = documents.list();
  const filtered = all.filter((d) => {
    const matchType = filterType === 'all' || d.doc_type === filterType;
    const matchSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.subject.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--ps-bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="ps-display text-2xl font-semibold text-[var(--ps-ink)]">
            Mina dokument
          </h1>
          <button
            className="ps-btn ps-btn-ghost ps-btn-sm"
            onClick={onBank}
          >
            <BookOpen size={15} />
            Frågebank
          </button>
        </div>

        {/* New doc buttons */}
        <div className="flex gap-2 mb-6">
          <button className="ps-btn ps-btn-primary" onClick={() => onNew('test')}>
            <Plus size={15} />
            Nytt prov
          </button>
          <button className="ps-btn ps-btn-outline" onClick={() => onNew('homework')}>
            <Plus size={15} />
            Ny läxa
          </button>
          <button className="ps-btn ps-btn-outline" onClick={() => onNew('workbook')}>
            <Plus size={15} />
            Nytt häfte
          </button>
        </div>

        {/* Templates */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={13} className="text-[var(--ps-ink-3)]" />
            <span className="text-xs font-medium text-[var(--ps-ink-3)] uppercase tracking-wide">Mallar</span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleFromTemplate(tpl)}
                className="ps-card text-left flex flex-col gap-1 px-3 py-3 hover:border-[var(--ps-rule-2)] transition-colors"
                style={{ border: `1.5px solid ${tpl.color}22`, borderRadius: 10 }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: tpl.color }}>{tpl.icon}</span>
                  <span className="font-medium text-sm text-[var(--ps-ink)]">{tpl.title}</span>
                </div>
                <span className="text-xs text-[var(--ps-ink-3)] leading-tight">{tpl.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ps-ink-4)]" />
            <input
              className="ps-input pl-8"
              placeholder="Sök dokument..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'test', 'workbook', 'homework'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`ps-btn ps-btn-sm ${filterType === t ? 'ps-btn-accent' : 'ps-btn-ghost'}`}
              >
                {t === 'all' ? 'Alla' : DOCUMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center ps-card"
          >
            <FileText size={40} className="mb-3 text-[var(--ps-rule-2)]" />
            <p className="text-[var(--ps-ink-3)] text-sm">
              {all.length === 0
                ? 'Inga dokument än. Skapa ett nytt prov ovan.'
                : 'Inga dokument matchar sökningen.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="ps-card flex items-center gap-4 px-4 py-3 group hover:border-[var(--ps-rule-2)] transition-colors cursor-pointer"
                onClick={() => onOpen(doc.id)}
              >
                <span className={TYPE_CHIP_CLASS[doc.doc_type]}>
                  {TYPE_ICONS[doc.doc_type]}
                  {DOCUMENT_TYPE_LABELS[doc.doc_type]}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--ps-ink)] text-sm truncate">
                    {doc.title || 'Namnlöst dokument'}
                  </p>
                  {doc.subject && (
                    <p className="text-xs text-[var(--ps-ink-4)] truncate">{doc.subject}</p>
                  )}
                </div>

                <time className="text-xs text-[var(--ps-ink-4)] shrink-0">
                  {new Date(doc.updated_at).toLocaleDateString('sv-SE')}
                </time>

                <div
                  className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    title="Redigera"
                    className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    onClick={() => onOpen(doc.id)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    title="Kopiera"
                    className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm"
                    onClick={() => handleDuplicate(doc)}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    title="Ta bort"
                    className="ps-btn ps-btn-ghost ps-btn-icon ps-btn-sm text-[var(--ps-red)]"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

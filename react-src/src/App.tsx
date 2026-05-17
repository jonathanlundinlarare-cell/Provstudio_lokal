import { useEffect, useRef, useState } from 'react';
import { initStore, documents } from './lib/local-db';
import HomePage from './pages/HomePage';
import BankPage from './pages/BankPage';
import EditorPage from './pages/EditorPage';
import WorkbookPage from './pages/WorkbookPage';
import WordsearchPage from './pages/WordsearchPage';
import { SO_SUBJECTS } from './lib/so-taxonomy';
import type { DocumentType } from './lib/test-types';

const BASE = 'https://raw.githubusercontent.com/jonathanlundinlarare-cell/Provstudio_lokal/main/releases';
const MANIFEST_URL = () => `${BASE}/latest.json?t=${Date.now()}`;
const HTML_URL     = () => `${BASE}/index.html?t=${Date.now()}`;

type Page =
  | { name: 'home' }
  | { name: 'bank' }
  | { name: 'editor'; documentId: string }
  | { name: 'workbook'; documentId: string }
  | { name: 'wordsearch'; documentId: string };

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'upToDate' }
  | { phase: 'available'; remoteVersion: string; html: string }
  | { phase: 'error'; message: string };

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [ready, setReady] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' });
  const [installing, setInstalling] = useState(false);
  const [isPrintMode] = useState(() => !!new URLSearchParams(window.location.search).get('print'));
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newDocDialog, setNewDocDialog] = useState<DocumentType | null>(null);
  const [newDocTitle, setNewDocTitle]   = useState('');
  const [newDocSubject, setNewDocSubject] = useState('');
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const autoChecked = useRef(false);

  // Focus title input when dialog opens
  useEffect(() => {
    if (newDocDialog && titleInputRef.current) {
      const t = setTimeout(() => titleInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [newDocDialog]);

  useEffect(() => {
    initStore().then(async () => {
      setReady(true);
      // Hantera ?print=docId — öppnat av Electron för utskrift/PDF-export
      const params = new URLSearchParams(window.location.search);
      const printDocId = params.get('print');
      if (printDocId) {
        const printDoc = documents.get(printDocId);
        if (printDoc) {
          if (printDoc.doc_type === 'wordsearch') {
            setPage({ name: 'wordsearch', documentId: printDocId });
          } else {
            setPage({ name: 'editor', documentId: printDocId });
          }
        }
      }
      if (window.localAPI) {
        const v = await window.localAPI.getVersion();
        setCurrentVersion(v);
        // Auto-check once, 4 s after startup so the UI has settled
        setTimeout(() => {
          if (!autoChecked.current) {
            autoChecked.current = true;
            silentCheck();
          }
        }, 4000);
        // Periodic silent check every 30 minutes
        setInterval(() => silentCheck(), 30 * 60 * 1000);
      }
    });
  }, []);

  async function silentCheck() {
    if (!window.localAPI) return;
    try {
      const manifestText = await window.localAPI.fetchUpdate(MANIFEST_URL());
      const manifest = JSON.parse(manifestText) as { version: string };
      const current = await window.localAPI.getVersion();
      if (manifest.version !== current) {
        const html = await window.localAPI.fetchUpdate(HTML_URL());
        setUpdate({ phase: 'available', remoteVersion: manifest.version, html });
        // Show the banner — dialog only opens on user action
      }
    } catch {
      // Silent fail — auto-check should never annoy the user with errors
    }
  }

  async function checkUpdate() {
    if (!window.localAPI) return;
    setUpdate({ phase: 'checking' });
    try {
      const manifestText = await window.localAPI.fetchUpdate(MANIFEST_URL());
      const manifest = JSON.parse(manifestText) as { version: string };
      const current = await window.localAPI.getVersion();
      if (manifest.version === current) {
        setUpdate({ phase: 'upToDate' });
        setTimeout(() => setUpdate({ phase: 'idle' }), 4000);
        return;
      }
      const html = await window.localAPI.fetchUpdate(HTML_URL());
      setUpdate({ phase: 'available', remoteVersion: manifest.version, html });
      setShowUpdateDialog(true);
    } catch {
      setUpdate({ phase: 'error', message: 'Kunde inte nå GitHub. Kontrollera din internetanslutning.' });
      setTimeout(() => setUpdate({ phase: 'idle' }), 6000);
    }
  }

  async function installUpdate() {
    if (update.phase !== 'available' || !window.localAPI) return;
    const html = update.html;
    const version = update.remoteVersion;
    setInstalling(true);
    try {
      await window.localAPI.saveIndexHtml(html, version);
      // Electron relaunches automatically — if it doesn't, reset state after 10 s
      setTimeout(() => setInstalling(false), 10_000);
    } catch {
      setInstalling(false);
      setUpdate({ phase: 'error', message: 'Kunde inte installera uppdateringen.' });
      setTimeout(() => setUpdate({ phase: 'idle' }), 6000);
    }
  }

  function openEditor(docId: string) {
    const doc = documents.get(docId);
    if (doc?.doc_type === 'workbook') {
      setPage({ name: 'workbook', documentId: docId });
    } else if (doc?.doc_type === 'wordsearch') {
      setPage({ name: 'wordsearch', documentId: docId });
    } else {
      setPage({ name: 'editor', documentId: docId });
    }
  }

  function newDocument(type: DocumentType) {
    setNewDocTitle('');
    setNewDocSubject('');
    setNewDocDialog(type);
  }

  function confirmNewDocument() {
    if (!newDocDialog) return;
    const doc = documents.create({
      doc_type: newDocDialog,
      title: newDocTitle.trim() || 'Namnlöst dokument',
      subject: newDocSubject.trim(),
    });
    setNewDocDialog(null);
    openEditor(doc.id);
  }

  if (!ready) {
    return (
      <div className="ps-body flex items-center justify-center h-screen">
        <span className="text-[var(--ps-ink-3)] text-sm">Laddar...</span>
      </div>
    );
  }

  const hasUpdate = update.phase === 'available';

  return (
    <div className="ps-body h-screen overflow-hidden flex flex-col">

      {/* ── Nytt dokument-dialog ── */}
      {newDocDialog && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setNewDocDialog(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "min(440px, 100%)", background: "var(--ps-paper, #fff)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}
          >
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ps-ink)", fontFamily: "var(--ps-ui)" }}>
              {newDocDialog === 'test' ? 'Nytt prov' : newDocDialog === 'workbook' ? 'Nytt häfte' : 'Ny läxa'}
            </h2>

            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, color: "#6B6459", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "system-ui, sans-serif" }}>Titel</span>
              <input
                ref={titleInputRef}
                type="text"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewDocument(); } }}
                placeholder="T.ex. Kapiteltest 3 — Industrialismen"
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 7,
                  border: "1px solid #d6d0c8",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 13,
                  color: "#14110D",
                  background: "#fff",
                  outline: "none",
                  pointerEvents: "auto",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, color: "#6B6459", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "system-ui, sans-serif" }}>Ämne</span>
              <input
                type="text"
                list="new-doc-subjects"
                value={newDocSubject}
                onChange={e => setNewDocSubject(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewDocument(); } }}
                placeholder="Välj eller skriv ämne…"
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 7,
                  border: "1px solid #d6d0c8",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 13,
                  color: "#14110D",
                  background: "#fff",
                  outline: "none",
                  pointerEvents: "auto",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
              />
              <datalist id="new-doc-subjects">
                {SO_SUBJECTS.map(s => <option key={s} value={s} />)}
              </datalist>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={() => setNewDocDialog(null)}
                style={{ height: 34, padding: "0 14px", borderRadius: 7, border: "1px solid var(--ps-rule-2)", background: "transparent", fontFamily: "var(--ps-ui)", fontSize: 13, color: "var(--ps-ink-3)", cursor: "pointer" }}
              >
                Avbryt
              </button>
              <button
                onClick={confirmNewDocument}
                style={{ height: 34, padding: "0 18px", borderRadius: 7, border: "none", background: "var(--ps-accent, #1E5F5C)", color: "#fff", fontFamily: "var(--ps-ui)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Skapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update confirm dialog ── */}
      {showUpdateDialog && hasUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="ps-card p-6 w-[420px] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 22 }}>🚀</span>
              <h2 className="font-semibold text-[var(--ps-ink)] text-base">
                Ny version tillgänglig — v{(update as { phase: 'available'; remoteVersion: string }).remoteVersion}
              </h2>
            </div>
            <p className="text-sm text-[var(--ps-ink-3)] leading-relaxed">
              En ny version av Provstudio har hämtats. Appen startar om automatiskt när uppdateringen är installerad.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="ps-btn ps-btn-outline ps-btn-sm"
                onClick={() => setShowUpdateDialog(false)}
              >
                Senare
              </button>
              <button
                className="ps-btn ps-btn-accent ps-btn-sm"
                onClick={installUpdate}
                disabled={installing}
              >
                {installing ? 'Installerar…' : 'Installera nu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-2 px-4 shrink-0"
        style={{
          height: 40,
          borderBottom: '1px solid var(--ps-rule)',
          background: 'var(--ps-paper)',
        }}
      >
        <span className="ps-display font-semibold text-[var(--ps-ink)]" style={{ fontSize: 15 }}>
          Provstudio
        </span>
        {currentVersion && (
          <span style={{
            fontSize: 10.5,
            color: 'var(--ps-ink-4)',
            background: 'var(--ps-bg-soft)',
            border: '1px solid var(--ps-rule-2)',
            borderRadius: 4,
            padding: '1px 6px',
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            v{currentVersion}
          </span>
        )}

        <div className="flex-1" />

        {/* Update status / banner */}
        {update.phase === 'checking' && (
          <span style={{ fontSize: 11, color: 'var(--ps-ink-3)' }}>Söker uppdatering…</span>
        )}
        {update.phase === 'upToDate' && (
          <span style={{ fontSize: 11, color: 'var(--ps-ink-3)' }}>✓ Senaste versionen</span>
        )}
        {update.phase === 'error' && (
          <span style={{ fontSize: 11, color: '#b45309' }}>{(update as { phase: 'error'; message: string }).message}</span>
        )}
        {hasUpdate && !showUpdateDialog && (
          <button
            onClick={() => setShowUpdateDialog(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 500,
              background: 'var(--ps-accent)', color: '#fff',
              border: 'none', borderRadius: 5,
              padding: '3px 10px', cursor: 'pointer',
            }}
          >
            <span>⬆</span>
            Uppdatering tillgänglig — v{(update as { phase: 'available'; remoteVersion: string }).remoteVersion}
          </button>
        )}

        <button
          className="ps-btn ps-btn-ghost ps-btn-sm"
          style={{ fontSize: 11 }}
          onClick={checkUpdate}
          disabled={update.phase === 'checking' || installing}
        >
          Sök uppdatering
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        {page.name === 'home' && (
          <HomePage
            onOpen={openEditor}
            onNew={newDocument}
            onBank={() => setPage({ name: 'bank' })}
          />
        )}
        {page.name === 'bank' && (
          <BankPage onBack={() => setPage({ name: 'home' })} />
        )}
        {page.name === 'editor' && (
          <EditorPage
            documentId={page.documentId}
            onBack={() => setPage({ name: 'home' })}
          />
        )}
        {page.name === 'workbook' && (
          <WorkbookPage
            documentId={page.documentId}
            onBack={() => setPage({ name: 'home' })}
          />
        )}
        {page.name === 'wordsearch' && (
          <WordsearchPage
            documentId={page.documentId}
            onBack={() => setPage({ name: 'home' })}
            printMode={isPrintMode}
          />
        )}
      </div>
    </div>
  );
}

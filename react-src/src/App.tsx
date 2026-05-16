import { useEffect, useState } from 'react';
import { initStore, documents } from './lib/local-db';
import HomePage from './pages/HomePage';
import BankPage from './pages/BankPage';
import EditorPage from './pages/EditorPage';

const MANIFEST_URL =
  'https://raw.githubusercontent.com/jonathanlundinlarare-cell/Provstudio_lokal/main/releases/latest.json';
const HTML_URL =
  'https://raw.githubusercontent.com/jonathanlundinlarare-cell/Provstudio_lokal/main/releases/index.html';

type Page =
  | { name: 'home' }
  | { name: 'bank' }
  | { name: 'editor'; documentId: string };

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });
  const [ready, setReady] = useState(false);
  const [updateDialog, setUpdateDialog] = useState<{
    show: boolean;
    version?: string;
    html?: string;
  }>({ show: false });
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    initStore().then(() => setReady(true));
  }, []);

  async function checkUpdate() {
    if (!window.localAPI) {
      setUpdateStatus('Uppdatering stöds bara i Electron-appen.');
      return;
    }
    try {
      setUpdateStatus('Söker...');
      const manifestText = await window.localAPI.fetchUpdate(MANIFEST_URL);
      const manifest = JSON.parse(manifestText) as { version: string };
      const current = await window.localAPI.getVersion();
      if (manifest.version === current) {
        setUpdateStatus(`Du har redan senaste versionen (${current}).`);
        return;
      }
      const html = await window.localAPI.fetchUpdate(HTML_URL);
      setUpdateStatus('');
      setUpdateDialog({ show: true, version: manifest.version, html });
    } catch {
      setUpdateStatus('Kunde inte kontrollera uppdatering.');
    }
  }

  async function installUpdate() {
    if (!window.localAPI || !updateDialog.html) return;
    await window.localAPI.saveIndexHtml(updateDialog.html);
    // app relaunches automatically
  }

  function openEditor(docId: string) {
    setPage({ name: 'editor', documentId: docId });
  }

  function newDocument(type: 'test' | 'workbook' | 'homework') {
    const doc = documents.create({ doc_type: type, title: 'Namnlöst dokument' });
    openEditor(doc.id);
  }

  if (!ready) {
    return (
      <div className="ps-body flex items-center justify-center h-screen">
        <span className="text-[var(--ps-ink-3)] text-sm">Laddar...</span>
      </div>
    );
  }

  return (
    <div className="ps-body h-screen overflow-hidden flex flex-col">
      {/* Update dialog */}
      {updateDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="ps-card p-6 w-96 flex flex-col gap-4">
            <h2 className="font-semibold text-[var(--ps-ink)]">
              Uppdatering tillgänglig — v{updateDialog.version}
            </h2>
            <p className="text-sm text-[var(--ps-ink-3)]">
              Vill du installera den nya versionen? Appen startas om automatiskt.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="ps-btn ps-btn-outline ps-btn-sm"
                onClick={() => setUpdateDialog({ show: false })}
              >
                Avbryt
              </button>
              <button className="ps-btn ps-btn-accent ps-btn-sm" onClick={installUpdate}>
                Installera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--ps-rule)', background: 'var(--ps-paper)' }}
      >
        <span className="ps-display font-semibold text-[var(--ps-ink)] text-lg">Provstudio</span>
        <div className="flex-1" />
        {updateStatus && (
          <span className="text-xs text-[var(--ps-ink-3)]">{updateStatus}</span>
        )}
        <button className="ps-btn ps-btn-ghost ps-btn-sm text-xs" onClick={checkUpdate}>
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
      </div>
    </div>
  );
}

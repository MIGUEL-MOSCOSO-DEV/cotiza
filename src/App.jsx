import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings2,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import { api } from './api.js';
import { Brand, Button, ErrorNotice } from './components.jsx';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import Quotes from './Quotes.jsx';
import Clients from './Clients.jsx';
import QuoteEditor from './QuoteEditor.jsx';
import QuoteDetail from './QuoteDetail.jsx';
import Settings from './Settings.jsx';
import PublicQuote from './PublicQuote.jsx';

const navigation = [
  ['dashboard', 'Resumen', LayoutDashboard],
  ['quotes', 'Cotizaciones', FileText],
  ['clients', 'Clientes', Users],
  ['settings', 'Tu negocio', Settings2],
];

export default function App() {
  const publicToken = window.location.pathname.startsWith('/p/')
    ? window.location.pathname.split('/')[2]
    : null;
  if (publicToken) return <PublicQuote token={publicToken} />;
  return <Workspace />;
}

function Workspace() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const toastTimer = useRef(null);
  async function reload() {
    const [clientData, quoteData] = await Promise.all([api('/clients'), api('/quotes')]);
    setClients(clientData.clients);
    setQuotes(quoteData.quotes);
    setError('');
  }
  useEffect(() => {
    api('/me')
      .then(({ user }) => {
        setUser(user);
        return reload();
      })
      .catch((error) => {
        if (error.message !== 'Inicia sesión para continuar.') setError(error.message);
      })
      .finally(() => setInitializing(false));
    return () => clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    if (!user) return;
    function refresh() {
      if (document.visibilityState === 'visible')
        reload().catch((error) => setError(error.message));
    }
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, [user?.id]);
  function notify(message) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }
  function navigate(target) {
    setPage(target);
    setSidebarOpen(false);
    setSelected(null);
    window.scrollTo(0, 0);
  }
  function open(quote) {
    setSelected(quote.id);
    setPage('detail');
    window.scrollTo(0, 0);
  }
  function create() {
    setSelected(null);
    setPage('editor');
    window.scrollTo(0, 0);
  }
  const selectedQuote = quotes.find((quote) => quote.id === selected);
  if (initializing)
    return (
      <div className="loading">
        <Brand />
        <p>Abriendo tu espacio…</p>
      </div>
    );
  if (!user)
    return (
      <>
        <ErrorNotice message={error} />
        <Auth
          onLogin={async (user) => {
            setUser(user);
            try {
              await reload();
            } catch (error) {
              setError(error.message);
            }
          }}
        />
      </>
    );
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-overlay no-print"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={'sidebar no-print ' + (sidebarOpen ? 'open' : '')}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="sidebar-label">ESPACIO DE TRABAJO</span>
        <nav>
          {navigation.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={
                page === key || (key === 'quotes' && ['editor', 'detail'].includes(page))
                  ? 'active'
                  : ''
              }
            >
              <Icon size={19} strokeWidth={1.7} />
              {label}
              {key === 'quotes' && <span className="nav-count">{quotes.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>✦</span>
            <strong>
              El próximo sí
              <br />
              empieza contigo.
            </strong>
            <p>Dale a tu trabajo la presentación que merece.</p>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <small>Mi espacio personal</small>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={async () => {
                try {
                  await api('/auth/logout', { method: 'POST', body: {} });
                  setUser(null);
                  setQuotes([]);
                  setClients([]);
                  navigate('dashboard');
                } catch (error) {
                  setError(error.message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar no-print">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Mi espacio</span>
            <span>/</span>
            <strong>{navigation.find(([key]) => key === page)?.[1] || 'Cotizaciones'}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              aria-label="Actualizar datos"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await reload();
                  notify('Datos actualizados.');
                } catch (error) {
                  setError(error.message);
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
            <span className="workspace-indicator">
              <i /> Tu espacio, al día
            </span>
            <span className="avatar small">{user.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          <ErrorNotice message={error} />
          {page === 'dashboard' && (
            <Dashboard
              user={user}
              quotes={quotes}
              clients={clients}
              onCreate={create}
              onOpen={open}
              navigate={navigate}
            />
          )}
          {page === 'quotes' && (
            <Quotes quotes={quotes} clients={clients} onCreate={create} onOpen={open} />
          )}
          {page === 'clients' && <Clients clients={clients} reload={reload} notify={notify} />}
          {page === 'settings' && <Settings user={user} onUpdated={setUser} notify={notify} />}
          {page === 'editor' && (
            <QuoteEditor
              key={selected || 'new'}
              quote={selectedQuote}
              clients={clients}
              profile={user}
              reload={reload}
              onBack={() => navigate('quotes')}
              onSaved={(quote) => {
                open(quote);
                notify('Borrador guardado.');
              }}
            />
          )}
          {page === 'detail' && selectedQuote && (
            <QuoteDetail
              quote={selectedQuote}
              profile={user}
              client={clients.find((client) => client.id === selectedQuote.clientId)}
              reload={reload}
              notify={notify}
              onBack={() => navigate('quotes')}
              onEdit={() => setPage('editor')}
              onDuplicate={(quote) => {
                setSelected(quote.id);
                setPage('editor');
              }}
            />
          )}
        </main>
        <footer className="workspace-footer no-print">
          <span>Hecho para trabajar a tu manera.</span>
          <span>
            Cotiza <span className="purple">✦</span>
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast no-print" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

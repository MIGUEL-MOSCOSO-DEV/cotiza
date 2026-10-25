import React, { useEffect, useState } from 'react';
import { Check, Download, X, ShieldCheck } from 'lucide-react';
import { api } from './api.js';
import { Brand, Button, Field, ErrorNotice, Empty, useTask } from './components.jsx';
import QuoteDocument from './QuoteDocument.jsx';

export default function PublicQuote({ token }) {
  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [decision, setDecision] = useState('');
  const [name, setName] = useState('');
  const { busy, error, perform } = useTask();
  useEffect(() => {
    api('/public/' + token)
      .then(({ quote }) => setQuote(quote))
      .catch((error) => setLoadError(error.message));
  }, [token]);
  function respond(event) {
    event.preventDefault();
    perform(async () => {
      const result = await api('/public/' + token + '/decision', {
        method: 'POST',
        body: { decision, name },
      });
      setQuote(result.quote);
      setDecision('');
    });
  }
  return (
    <div className="public-page">
      <header className="public-header no-print">
        <Brand />
        <span>
          <ShieldCheck size={16} /> Propuesta privada
        </span>
        {quote && (
          <Button variant="secondary" onClick={() => window.print()}>
            <Download size={16} /> Guardar PDF
          </Button>
        )}
      </header>
      {loadError ? (
        <Empty title="Esta propuesta no está disponible">{loadError}</Empty>
      ) : !quote ? (
        <div className="loading">Cargando propuesta…</div>
      ) : (
        <>
          <QuoteDocument quote={quote} />
          <section className="public-response no-print">
            {quote.status === 'sent' ? (
              <>
                <div>
                  <h2>¿Damos el siguiente paso?</h2>
                  <p>Revisa los detalles y comparte tu decisión.</p>
                </div>
                {decision ? (
                  <form onSubmit={respond} className="stack">
                    <ErrorNotice message={error} />
                    <Field
                      label="Tu nombre completo"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      minLength={2}
                      maxLength={160}
                    />
                    <p className="muted">
                      Al confirmar se registrará tu nombre y la fecha de{' '}
                      {decision === 'accepted' ? 'aceptación' : 'rechazo'}.
                    </p>
                    <div className="actions">
                      <Button type="button" variant="secondary" onClick={() => setDecision('')}>
                        Volver
                      </Button>
                      <Button busy={busy} variant={decision === 'rejected' ? 'danger' : 'primary'}>
                        Confirmar {decision === 'accepted' ? 'aceptación' : 'rechazo'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="actions">
                    <Button variant="secondary" onClick={() => setDecision('rejected')}>
                      <X size={17} /> Rechazar
                    </Button>
                    <Button onClick={() => setDecision('accepted')}>
                      <Check size={17} /> Aceptar propuesta
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <h2>
                  {quote.status === 'accepted'
                    ? 'Gracias por tu confianza.'
                    : quote.status === 'rejected'
                      ? 'Tu respuesta quedó registrada.'
                      : 'Esta propuesta ha vencido.'}
                </h2>
                <p>
                  {quote.status === 'expired'
                    ? 'Contacta con quien la preparó para solicitar una nueva cotización.'
                    : 'Puedes guardar una copia de la propuesta como PDF.'}
                </p>
              </div>
            )}
          </section>
        </>
      )}
      <footer className="public-footer no-print">Cotiza · El comienzo de un buen proyecto.</footer>
    </div>
  );
}

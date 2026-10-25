import React from 'react';
import { calculateTotals, formatMoney, quoteNumber } from '../shared/quote.js';
import { Totals, Status } from './components.jsx';

export function formatDate(value) {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value.slice(0, 10) + 'T00:00:00Z'));
}

export default function QuoteDocument({ quote, profile, client }) {
  const business = quote.snapshot?.business || profile;
  const recipient = quote.snapshot?.client || client;
  const documentQuote = {
    ...quote,
    totals: calculateTotals(quote.items, quote.discountPercent, quote.taxPercent),
  };
  return (
    <article className="quote-paper">
      <header className="document-head">
        <div>
          <div className="document-business">{business?.businessName}</div>
          <p className="muted pre-line">{business?.address}</p>
          <p className="muted">
            {[business?.businessEmail, business?.phone].filter(Boolean).join(' · ')}
          </p>
          {business?.taxId && <p className="muted">Identificación fiscal: {business.taxId}</p>}
        </div>
        <div className="document-ref">
          <span className="eyebrow purple">COTIZACIÓN</span>
          <h2>{quoteNumber(quote.number)}</h2>
          <Status quote={quote} />
        </div>
      </header>
      <div className="document-parties">
        <div>
          <span className="eyebrow">PREPARADA PARA</span>
          <h3>{recipient?.name}</h3>
          {recipient?.company && <p>{recipient.company}</p>}
          <p className="muted">{recipient?.email}</p>
          <p className="muted pre-line">{recipient?.address}</p>
          {recipient?.taxId && <p className="muted">ID fiscal: {recipient.taxId}</p>}
        </div>
        <dl>
          <div>
            <dt>Fecha de emisión</dt>
            <dd>{formatDate(quote.sentAt || quote.createdAt)}</dd>
          </div>
          <div>
            <dt>Válida hasta</dt>
            <dd>{formatDate(quote.validUntil)}</dd>
          </div>
          <div>
            <dt>Moneda</dt>
            <dd>{quote.currency}</dd>
          </div>
        </dl>
      </div>
      <h1 className="document-title">{quote.title}</h1>
      <div className="table-scroll">
        <table className="document-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unitPriceCents, quote.currency)}</td>
                <td>
                  {formatMoney(
                    Math.round((item.unitPriceCents * Math.round(item.quantity * 1000)) / 1000),
                    quote.currency,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totals quote={documentQuote} />
      {quote.notes && (
        <section className="document-notes">
          <h4>Notas</h4>
          <p className="pre-line">{quote.notes}</p>
        </section>
      )}
      {quote.terms && (
        <section className="document-notes">
          <h4>Condiciones</h4>
          <p className="pre-line">{quote.terms}</p>
        </section>
      )}
      {quote.respondedAt && (
        <div className="response-record">
          <strong>
            {quote.status === 'accepted' ? 'Propuesta aceptada' : 'Propuesta rechazada'}
          </strong>
          <p>
            Respuesta registrada por {quote.responseName} el {formatDate(quote.respondedAt)}.
          </p>
        </div>
      )}
      <footer className="document-footer">
        Preparada con Cotiza <span>·</span> {quoteNumber(quote.number)}
      </footer>
    </article>
  );
}

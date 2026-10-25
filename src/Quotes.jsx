import React, { useState } from 'react';
import { Plus, Search, ArrowUpRight, FileText, SlidersHorizontal } from 'lucide-react';
import { Button, Empty, Status } from './components.jsx';
import {
  calculateTotals,
  effectiveStatus,
  formatMoney,
  quoteNumber,
  STATUS_LABELS,
} from '../shared/quote.js';
import { formatDate } from './QuoteDocument.jsx';

export function QuoteTable({ quotes, clients, onOpen }) {
  return (
    <div className="table-scroll">
      <table className="quote-table">
        <thead>
          <tr>
            <th>Propuesta</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Válida hasta</th>
            <th className="align-right">Importe</th>
            <th>
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => {
            const client =
              quote.snapshot?.client || clients.find((client) => client.id === quote.clientId);
            const total = calculateTotals(
              quote.items,
              quote.discountPercent,
              quote.taxPercent,
            ).total;
            return (
              <tr key={quote.id}>
                <td>
                  <button className="quote-title-button" onClick={() => onOpen(quote)}>
                    <span>{quote.title}</span>
                    <small>{quoteNumber(quote.number)}</small>
                  </button>
                </td>
                <td>
                  <div className="table-client">
                    <span className="mini-avatar">{client?.name.slice(0, 1)}</span>
                    <span>{client?.name}</span>
                  </div>
                </td>
                <td>
                  <Status quote={quote} />
                </td>
                <td className="muted nowrap">{formatDate(quote.validUntil)}</td>
                <td className="align-right amount">
                  {formatMoney(total, quote.currency)}
                  <small>{quote.currency}</small>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={'Abrir ' + quoteNumber(quote.number)}
                    onClick={() => onOpen(quote)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Quotes({ quotes, clients, onOpen, onCreate }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = quotes.filter((quote) => {
    const client = quote.snapshot?.client || clients.find((client) => client.id === quote.clientId);
    return (
      (filter === 'all' || effectiveStatus(quote) === filter) &&
      [quote.title, quoteNumber(quote.number), client?.name, client?.company]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEL BORRADOR AL SÍ</span>
          <h1>
            Cotizaciones<span className="count">{quotes.length}</span>
          </h1>
          <p>Tus propuestas, con cada detalle en su lugar.</p>
        </div>
        <Button onClick={onCreate}>
          <Plus size={18} /> Nueva cotización
        </Button>
      </div>
      <section className="panel">
        <div className="filter-tabs" role="group" aria-label="Estado de cotizaciones">
          {[['all', 'Todas'], ...Object.entries(STATUS_LABELS)].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => setFilter(key)}
            >
              {label}
              <span>
                {key === 'all'
                  ? quotes.length
                  : quotes.filter((quote) => effectiveStatus(quote) === key).length}
              </span>
            </button>
          ))}
        </div>
        <div className="panel-toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar cotizaciones"
              placeholder="Buscar por propuesta, número o cliente…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <span className="muted result-count">
            {filtered.length} {filtered.length === 1 ? 'propuesta' : 'propuestas'}
          </span>
        </div>
        {filtered.length ? (
          <QuoteTable quotes={filtered} clients={clients} onOpen={onOpen} />
        ) : (
          <Empty
            title={
              quotes.length
                ? 'Nada por aquí, por ahora'
                : 'Tu primera propuesta está por escribirse'
            }
            action={
              <Button variant="secondary" onClick={onCreate}>
                <Plus size={16} /> Crear cotización
              </Button>
            }
          >
            {quotes.length
              ? 'Cambia los filtros o prueba otra búsqueda.'
              : 'Convierte tu próximo proyecto en una propuesta clara, profesional y fácil de aceptar.'}
          </Empty>
        )}
      </section>
    </>
  );
}

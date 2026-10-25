import React from 'react';
import {
  Plus,
  ArrowRight,
  FileText,
  Clock3,
  CheckCheck,
  TrendingUp,
  Sparkles,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import { Button, Empty } from './components.jsx';
import { QuoteTable } from './Quotes.jsx';
import { effectiveStatus, calculateTotals, formatMoney } from '../shared/quote.js';

export default function Dashboard({ user, quotes, clients, onCreate, onOpen, navigate }) {
  const counts = (status) => quotes.filter((quote) => effectiveStatus(quote) === status).length;
  const accepted = counts('accepted');
  const decided = accepted + counts('rejected');
  const conversion = decided ? Math.round((accepted / decided) * 100) : 0;
  const totals = new Map();
  for (const quote of quotes.filter((quote) => quote.status === 'accepted')) {
    totals.set(
      quote.currency,
      (totals.get(quote.currency) || 0) +
        calculateTotals(quote.items, quote.discountPercent, quote.taxPercent).total,
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU ESPACIO PARA HACER CRECER IDEAS</span>
          <h1>
            Hola, {user.name.split(' ')[0]} <span className="greeting-dot">✦</span>
          </h1>
          <p>Un vistazo a tus propuestas y a lo que viene.</p>
        </div>
        <Button onClick={onCreate}>
          <Plus size={18} /> Nueva cotización
        </Button>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-label">
            <Sparkles size={14} /> DE UNA BUENA IDEA A UN BUEN PROYECTO
          </span>
          <h2>
            Menos vueltas.
            <br />
            Más propuestas que avanzan.
          </h2>
          <p>Prepara, comparte y recibe una respuesta. Así de claro.</p>
          <button onClick={onCreate}>
            Crear una propuesta <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-paper">
            <span className="art-logo">↗</span>
            <span className="art-line long" />
            <span className="art-line" />
            <div className="art-grid">
              <i />
              <i />
              <i />
            </div>
            <span className="art-total" />
            <span className="art-check">
              <CheckCheck size={24} />
            </span>
          </div>
          <span className="art-spark">✦</span>
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: 'Cotizaciones creadas',
            value: quotes.length,
            icon: FileText,
            note: counts('draft') + ' en borrador',
            color: 'purple',
          },
          {
            label: 'Esperando respuesta',
            value: counts('sent'),
            icon: Clock3,
            note: 'Propuestas vigentes',
            color: 'amber',
          },
          {
            label: 'Propuestas aceptadas',
            value: accepted,
            icon: CheckCheck,
            note: 'Proyectos que avanzan',
            color: 'green',
          },
          {
            label: 'Tasa de aceptación',
            value: conversion + '%',
            icon: TrendingUp,
            note: decided
              ? 'Sobre ' + decided + ' propuestas respondidas'
              : 'Aún no hay respuestas',
            color: 'blue',
          },
        ].map(({ label, value, icon: Icon, note, color }) => (
          <article className="stat-card panel" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={'stat-icon ' + color}>
                <Icon size={18} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-quotes">
          <div className="panel-heading">
            <div>
              <h2>Últimas cotizaciones</h2>
              <p>El siguiente paso de cada proyecto.</p>
            </div>
            <button className="text-button" onClick={() => navigate('quotes')}>
              Ver todas <ArrowRight size={15} />
            </button>
          </div>
          {quotes.length ? (
            <QuoteTable quotes={quotes.slice(0, 5)} clients={clients} onOpen={onOpen} />
          ) : (
            <Empty
              title="Aquí empieza tu próximo sí"
              action={
                <Button variant="secondary" onClick={onCreate}>
                  <Plus size={16} /> Crear mi primera cotización
                </Button>
              }
            >
              Todavía no has creado cotizaciones. Dale forma a tu primera propuesta y compártela
              cuando esté lista.
            </Empty>
          )}
        </section>
        <aside className="stack">
          <section className="panel activity-card">
            <span className="eyebrow">PROYECTOS CONFIRMADOS</span>
            <h2>Valor aceptado</h2>
            {totals.size ? (
              [...totals].map(([currency, total]) => (
                <div className="currency-total" key={currency}>
                  <strong>{formatMoney(total, currency)}</strong>
                  <span>{currency}</span>
                </div>
              ))
            ) : (
              <>
                <strong className="empty-value">—</strong>
                <p className="muted">
                  Los importes aparecerán cuando acepten tus primeras propuestas.
                </p>
              </>
            )}
            <span className="tiny-note">Cada moneda se calcula por separado.</span>
          </section>
          <button className="client-shortcut panel" onClick={() => navigate('clients')}>
            <span className="stat-icon purple">
              <Users size={20} />
            </span>
            <span>
              <strong>
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
              </strong>
              <small>Tu red de próximos proyectos</small>
            </span>
            <ArrowUpRight size={19} />
          </button>
        </aside>
      </div>
    </>
  );
}

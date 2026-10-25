import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Users } from 'lucide-react';
import { api } from './api.js';
import { Button, Field, ErrorNotice, Empty, Totals, useTask } from './components.jsx';
import { ClientForm } from './Clients.jsx';
import { calculateTotals, formatMoney } from '../shared/quote.js';

export const currencies = ['USD', 'PEN', 'EUR', 'MXN', 'COP', 'CLP', 'ARS', 'GBP'];
const blankItem = () => ({ description: '', quantity: 1, price: '' });

export default function QuoteEditor({ quote, clients, profile, reload, onSaved, onBack }) {
  const [addingClient, setAddingClient] = useState(false);
  const [data, setData] = useState(() => ({
    clientId: quote?.clientId || '',
    title: quote?.title || '',
    currency: quote?.currency || profile.currency,
    validUntil:
      quote?.validUntil || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    discountPercent: quote?.discountPercent ?? 0,
    taxPercent: quote?.taxPercent ?? 0,
    notes: quote?.notes || '',
    terms: quote?.terms ?? profile.terms,
  }));
  const [items, setItems] = useState(
    () =>
      quote?.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: String(item.unitPriceCents / 100),
      })) || [blankItem()],
  );
  const { busy, error, perform } = useTask();
  const normalizedItems = items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPriceCents: Math.round(Number(item.price) * 100),
  }));
  const totals = calculateTotals(
    normalizedItems,
    Number(data.discountPercent),
    Number(data.taxPercent),
  );
  function change(event) {
    setData({ ...data, [event.target.name]: event.target.value });
  }
  function updateItem(index, key, value) {
    setItems(
      items.map((item, position) => (position === index ? { ...item, [key]: value } : item)),
    );
  }
  function submit(event) {
    event.preventDefault();
    perform(async () => {
      const body = {
        ...data,
        discountPercent: Number(data.discountPercent),
        taxPercent: Number(data.taxPercent),
        items: normalizedItems,
      };
      const result = await api('/quotes' + (quote ? '/' + quote.id : ''), {
        method: quote ? 'PUT' : 'POST',
        body,
      });
      await reload();
      onSaved(result.quote);
    });
  }
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Volver a cotizaciones
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DALE FORMA A TU PRÓXIMO PROYECTO</span>
          <h1>{quote ? 'Editar cotización' : 'Nueva cotización'}</h1>
          <p>Los detalles claros hacen la diferencia.</p>
        </div>
        <span className="draft-note">
          <i /> Guardarás un borrador
        </span>
      </div>
      <form onSubmit={submit} className="editor-layout">
        <div className="stack">
          <ErrorNotice message={error} />
          <section className="panel form-panel">
            <div className="section-heading">
              <span className="step-number">01</span>
              <h2>Lo esencial</h2>
            </div>
            <Field
              label="Título de la propuesta"
              name="title"
              value={data.title}
              onChange={change}
              required
              maxLength={180}
            />
            <div className="form-grid">
              <Field label="Cliente">
                <select name="clientId" value={data.clientId} onChange={change} required>
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.company ? ' · ' + client.company : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Válida hasta"
                type="date"
                name="validUntil"
                value={data.validUntil}
                onChange={change}
                required
              />
            </div>
            <button type="button" className="text-button" onClick={() => setAddingClient(true)}>
              <Plus size={15} /> Agregar cliente sin salir
            </button>
          </section>
          <section className="panel form-panel">
            <div className="section-heading">
              <span className="step-number">02</span>
              <h2>Tu trabajo, en detalle</h2>
            </div>
            <div className="line-items">
              {items.map((item, index) => (
                <div className="line-item" key={index}>
                  <Field label={'Descripción ' + (index + 1)}>
                    <textarea
                      value={item.description}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      required
                      maxLength={500}
                      rows={2}
                    />
                  </Field>
                  <Field
                    label="Cantidad"
                    type="number"
                    min="0.001"
                    max="100000"
                    step="0.001"
                    required
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                  />
                  <Field
                    label="Precio unitario"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    required
                    value={item.price}
                    onChange={(event) => updateItem(index, 'price', event.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button remove-item"
                    disabled={items.length === 1}
                    aria-label={'Eliminar concepto ' + (index + 1)}
                    onClick={() => setItems(items.filter((_, position) => position !== index))}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={items.length >= 100}
              onClick={() => setItems([...items, blankItem()])}
            >
              <Plus size={16} /> Agregar concepto
            </Button>
          </section>
          <section className="panel form-panel">
            <div className="section-heading">
              <span className="step-number">03</span>
              <h2>Un poco de contexto</h2>
            </div>
            <Field label="Notas para el cliente">
              <textarea
                name="notes"
                value={data.notes}
                onChange={change}
                maxLength={4000}
                rows={3}
              />
            </Field>
            <Field
              label="Condiciones de la propuesta"
              hint="Plazos, forma de pago y lo que el cliente deba saber."
            >
              <textarea
                name="terms"
                value={data.terms}
                onChange={change}
                maxLength={4000}
                rows={4}
              />
            </Field>
          </section>
        </div>
        <aside className="editor-summary panel form-panel">
          <span className="eyebrow">TODO EN SU LUGAR</span>
          <h2>Resumen</h2>
          <Field label="Moneda">
            <select name="currency" value={data.currency} onChange={change}>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field
              label="Descuento (%)"
              name="discountPercent"
              type="number"
              value={data.discountPercent}
              onChange={change}
              required
              min="0"
              max="100"
              step="0.01"
            />
            <Field
              label="Impuesto (%)"
              name="taxPercent"
              type="number"
              value={data.taxPercent}
              onChange={change}
              required
              min="0"
              max="100"
              step="0.01"
            />
          </div>
          <Totals
            quote={{
              ...data,
              discountPercent: Number(data.discountPercent),
              taxPercent: Number(data.taxPercent),
              totals,
            }}
          />
          <Button busy={busy} type="submit">
            <Save size={17} /> Guardar borrador
          </Button>
          <p className="muted summary-hint">
            Podrás revisarlo antes de compartirlo con tu cliente.
          </p>
        </aside>
      </form>
      {addingClient && (
        <ClientForm
          onClose={() => setAddingClient(false)}
          onSaved={async (client) => {
            await reload();
            setData({ ...data, clientId: client.id });
            setAddingClient(false);
          }}
        />
      )}
    </>
  );
}

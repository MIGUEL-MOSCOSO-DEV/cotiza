import React from 'react';
import { Save, Download, Building2, LockKeyhole } from 'lucide-react';
import { api } from './api.js';
import { Button, Field, ErrorNotice, useTask } from './components.jsx';
import { currencies } from './QuoteEditor.jsx';

export default function Settings({ user, onUpdated, notify }) {
  const { busy, error, perform } = useTask();
  function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    perform(async () => {
      const { user: updated } = await api('/me', { method: 'PUT', body });
      onUpdated(updated);
      notify('Tu información está actualizada.');
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A TU MANERA</span>
          <h1>Tu negocio</h1>
          <p>La información que acompaña cada propuesta.</p>
        </div>
      </div>
      <form onSubmit={submit} className="settings-layout">
        <section className="panel form-panel">
          <div className="section-heading">
            <Building2 size={20} />
            <h2>Información del negocio</h2>
          </div>
          <ErrorNotice message={error} />
          <Field
            label="Nombre comercial"
            name="businessName"
            defaultValue={user.businessName}
            required
            maxLength={160}
          />
          <div className="form-grid">
            <Field
              label="Tu nombre"
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={100}
            />
            <Field
              label="Correo del negocio"
              name="businessEmail"
              type="email"
              defaultValue={user.businessEmail}
              maxLength={254}
            />
          </div>
          <div className="form-grid">
            <Field label="Teléfono" name="phone" defaultValue={user.phone} maxLength={40} />
            <Field
              label="Identificación fiscal"
              name="taxId"
              defaultValue={user.taxId}
              maxLength={40}
            />
          </div>
          <Field label="Dirección">
            <textarea name="address" defaultValue={user.address} maxLength={500} rows={2} />
          </Field>
          <Field label="Moneda predeterminada">
            <select name="currency" defaultValue={user.currency}>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Condiciones predeterminadas"
            hint="Se copiarán en las nuevas cotizaciones. Podrás ajustarlas en cada propuesta."
          >
            <textarea name="terms" defaultValue={user.terms} maxLength={4000} rows={5} />
          </Field>
          <div className="modal-actions">
            <Button busy={busy}>
              <Save size={16} /> Guardar cambios
            </Button>
          </div>
        </section>
        <aside className="stack">
          <section className="panel form-panel">
            <LockKeyhole size={22} className="purple" />
            <h2>Tu espacio de trabajo</h2>
            <p className="muted">Sesión iniciada con</p>
            <strong className="break-word">{user.email}</strong>
            <p className="muted">
              Tus clientes y cotizaciones solo son visibles desde tu cuenta. Cada propuesta
              compartida tiene su propio enlace privado.
            </p>
          </section>
          <section className="panel form-panel">
            <Download size={22} className="purple" />
            <h2>Tus datos van contigo</h2>
            <p className="muted">
              Descarga tus clientes y cotizaciones en JSON. El archivo no incluye contraseñas ni
              enlaces privados.
            </p>
            <a className="button secondary" href="/api/export" download>
              Exportar mis datos
            </a>
          </section>
        </aside>
      </form>
    </>
  );
}

import React, { useState } from 'react';
import { Plus, Users, Pencil, Trash2, Search, Mail, Building2 } from 'lucide-react';
import { api } from './api.js';
import { Button, Field, Modal, Empty, ErrorNotice, useTask } from './components.jsx';

export const blankClient = { name: '', company: '', email: '', phone: '', taxId: '', address: '' };

export function ClientForm({ client, onSaved, onClose }) {
  const { busy, error, perform } = useTask();
  function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    perform(async () => {
      const result = await api('/clients' + (client?.id ? '/' + client.id : ''), {
        method: client?.id ? 'PUT' : 'POST',
        body,
      });
      onSaved(result.client);
    });
  }
  const data = client || blankClient;
  return (
    <Modal title={client?.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorNotice message={error} />
        <Field
          label="Nombre del contacto"
          name="name"
          defaultValue={data.name}
          maxLength={160}
          required
          autoFocus
        />
        <Field label="Empresa" name="company" defaultValue={data.company} maxLength={160} />
        <div className="form-grid">
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            defaultValue={data.email}
            maxLength={254}
          />
          <Field label="Teléfono" name="phone" defaultValue={data.phone} maxLength={40} />
        </div>
        <Field
          label="Identificación fiscal"
          name="taxId"
          defaultValue={data.taxId}
          maxLength={40}
        />
        <Field label="Dirección">
          <textarea name="address" defaultValue={data.address} maxLength={500} rows={2} />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button busy={busy}>Guardar cliente</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients({ clients, reload, notify }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const { busy, error, perform } = useTask();
  const filtered = clients.filter((client) =>
    [client.name, client.company, client.email]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUENAS RELACIONES, MEJORES PROYECTOS</span>
          <h1>
            Clientes<span className="count">{clients.length}</span>
          </h1>
          <p>Las personas detrás de cada propuesta.</p>
        </div>
        <Button onClick={() => setEditing(blankClient)}>
          <Plus size={18} /> Nuevo cliente
        </Button>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar clientes"
              placeholder="Buscar por nombre, empresa o correo…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {!filtered.length ? (
          <Empty
            icon={Users}
            title={search ? 'No encontramos coincidencias' : 'Tu próxima relación empieza aquí'}
            action={
              !search && (
                <Button variant="secondary" onClick={() => setEditing(blankClient)}>
                  <Plus size={16} /> Agregar primer cliente
                </Button>
              )
            }
          >
            {search
              ? 'Prueba con otro nombre o correo.'
              : 'Guarda los datos de tus clientes para preparar propuestas sin repetir información.'}
          </Empty>
        ) : (
          <div className="client-grid">
            {filtered.map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-card-top">
                  <span className="avatar">{client.name.slice(0, 2).toUpperCase()}</span>
                  <div className="actions">
                    <button
                      className="icon-button"
                      aria-label={'Editar ' + client.name}
                      onClick={() => setEditing(client)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger-text"
                      aria-label={'Eliminar ' + client.name}
                      onClick={() => setDeleting(client)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3>{client.name}</h3>
                <p>
                  <Building2 size={14} /> {client.company || 'Sin empresa registrada'}
                </p>
                <p>
                  <Mail size={14} /> {client.email || 'Sin correo registrado'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <ClientForm
          client={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
            notify('Cliente guardado.');
          }}
        />
      )}
      {deleting && (
        <Modal title="Eliminar cliente" onClose={() => setDeleting(null)}>
          <div className="stack">
            <ErrorNotice message={error} />
            <p>
              ¿Eliminar a <strong>{deleting.name}</strong>? Solo se puede eliminar si no tiene
              cotizaciones asociadas.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                busy={busy}
                onClick={() =>
                  perform(async () => {
                    await api('/clients/' + deleting.id, { method: 'DELETE' });
                    setDeleting(null);
                    await reload();
                    notify('Cliente eliminado.');
                  })
                }
              >
                Eliminar cliente
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

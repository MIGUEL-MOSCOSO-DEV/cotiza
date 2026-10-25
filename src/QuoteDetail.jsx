import React, { useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Link2,
  Copy,
  Download,
  Trash2,
  Unlink,
  Check,
  ExternalLink,
} from 'lucide-react';
import { api } from './api.js';
import { Button, Modal, ErrorNotice, useTask } from './components.jsx';
import QuoteDocument from './QuoteDocument.jsx';
import { quoteNumber, effectiveStatus } from '../shared/quote.js';

export default function QuoteDetail({
  quote,
  profile,
  client,
  reload,
  onBack,
  onEdit,
  onDuplicate,
  notify,
}) {
  const [link, setLink] = useState('');
  const [confirming, setConfirming] = useState('');
  const [copied, setCopied] = useState(false);
  const { busy, error, perform } = useTask();
  function share() {
    perform(async () => {
      const result = await api('/quotes/' + quote.id + '/share', { method: 'POST', body: {} });
      setLink(result.url);
      setCopied(false);
      await reload();
      setConfirming('');
    });
  }
  function confirmAction() {
    perform(async () => {
      if (confirming === 'delete') {
        await api('/quotes/' + quote.id, { method: 'DELETE' });
        await reload();
        onBack();
        notify('Borrador eliminado.');
      } else {
        await api('/quotes/' + quote.id + '/revoke', { method: 'POST', body: {} });
        setLink('');
        await reload();
        notify('Enlace revocado.');
      }
      setConfirming('');
    });
  }
  const status = effectiveStatus(quote);
  return (
    <>
      <div className="no-print">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> Volver a cotizaciones
        </button>
        <div className="page-heading">
          <div>
            <span className="eyebrow">CADA DETALLE CUENTA</span>
            <h1>{quoteNumber(quote.number)}</h1>
            <p>Una propuesta que habla bien de tu trabajo.</p>
          </div>
          <div className="actions wrap">
            <Button variant="secondary" onClick={() => window.print()}>
              <Download size={16} /> PDF
            </Button>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() =>
                perform(async () => {
                  const result = await api('/quotes/' + quote.id + '/duplicate', {
                    method: 'POST',
                    body: {},
                  });
                  await reload();
                  onDuplicate(result.quote);
                })
              }
            >
              <Copy size={16} /> Duplicar
            </Button>
            {quote.status === 'draft' && (
              <Button variant="secondary" onClick={() => onEdit(quote)}>
                <Pencil size={16} /> Editar
              </Button>
            )}
            {['draft', 'sent'].includes(status) && (
              <Button busy={busy} onClick={() => setConfirming('share')}>
                <Link2 size={16} />{' '}
                {quote.status === 'draft' ? 'Compartir propuesta' : 'Nuevo enlace'}
              </Button>
            )}
          </div>
        </div>
        <ErrorNotice message={error} />
        {link && (
          <div className="share-box">
            <div>
              <strong>Tu propuesta está lista para compartir</strong>
              <p>Guarda este enlace. Crear otro invalidará el anterior.</p>
              <a href={link} target="_blank" rel="noreferrer">
                {link}
                <ExternalLink size={14} />
              </a>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                perform(async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                })
              }
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        )}
      </div>
      <QuoteDocument quote={quote} profile={profile} client={client} />
      <div className="detail-footer no-print">
        <p>Los documentos compartidos conservan los datos originales de la propuesta.</p>
        {quote.status === 'draft' ? (
          <button className="text-button danger-text" onClick={() => setConfirming('delete')}>
            <Trash2 size={15} /> Eliminar borrador
          </button>
        ) : (
          <button className="text-button" onClick={() => setConfirming('revoke')}>
            <Unlink size={15} /> Revocar enlace
          </button>
        )}
      </div>
      {confirming && (
        <Modal
          title={
            confirming === 'share'
              ? 'Compartir propuesta'
              : confirming === 'delete'
                ? 'Eliminar borrador'
                : 'Revocar enlace'
          }
          onClose={() => setConfirming('')}
        >
          <div className="stack">
            <ErrorNotice message={error} />
            <p>
              {confirming === 'share'
                ? quote.status === 'draft'
                  ? 'Al compartir, los precios y datos quedarán fijados. Podrás duplicar la cotización si necesitas hacer cambios. Copia el enlace y envíalo a tu cliente.'
                  : 'Se creará un enlace nuevo y el anterior dejará de funcionar. Los datos de la propuesta se conservarán.'
                : confirming === 'delete'
                  ? 'El borrador se eliminará de forma permanente.'
                  : 'El enlace dejará de funcionar. La cotización y su historial se conservarán.'}
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setConfirming('')}>
                Cancelar
              </Button>
              <Button
                busy={busy}
                variant={confirming === 'delete' ? 'danger' : 'primary'}
                onClick={confirming === 'share' ? share : confirmAction}
              >
                {confirming === 'share' ? 'Crear enlace privado' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, LoaderCircle, FileText, ArrowUpRight } from 'lucide-react';
import { STATUS_LABELS, effectiveStatus, formatMoney } from '../shared/quote.js';

export function Brand({ light = false }) {
  return (
    <a href="/" className={'brand ' + (light ? 'light' : '')} aria-label="Cotiza, inicio">
      <span className="brand-mark">
        <ArrowUpRight size={22} strokeWidth={3} />
      </span>
      cotiza<span className="brand-dot">.</span>
    </a>
  );
}

export function Button({ children, busy, variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={'button ' + variant + ' ' + className}
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, hint, ...props }) {
  const id = useId();
  const hintId = hint ? id + '-hint' : undefined;
  const control = children ? (
    React.cloneElement(children, { id, 'aria-describedby': hintId })
  ) : (
    <input {...props} id={id} aria-describedby={hintId} />
  );
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}

export function Status({ quote }) {
  const status = effectiveStatus(quote);
  return (
    <span className={'status ' + status}>
      <i />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Empty({ icon: Icon = FileText, title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus?.();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={'modal ' + (wide ? 'wide' : '')}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function ErrorNotice({ message }) {
  return message ? (
    <div className="error-notice" role="alert">
      {message}
    </div>
  ) : null;
}

export function Totals({ quote }) {
  const totals = quote.snapshot?.totals || quote.totals;
  return (
    <div className="totals">
      <div>
        <span>Subtotal</span>
        <span>{formatMoney(totals.subtotal, quote.currency)}</span>
      </div>
      {quote.discountPercent > 0 && (
        <div>
          <span>Descuento ({quote.discountPercent}%)</span>
          <span>−{formatMoney(totals.discount, quote.currency)}</span>
        </div>
      )}
      {quote.taxPercent > 0 && (
        <div>
          <span>Impuesto ({quote.taxPercent}%)</span>
          <span>{formatMoney(totals.tax, quote.currency)}</span>
        </div>
      )}
      <div className="grand-total">
        <strong>Total</strong>
        <strong>{formatMoney(totals.total, quote.currency)}</strong>
      </div>
    </div>
  );
}

export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function perform(task) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, perform };
}

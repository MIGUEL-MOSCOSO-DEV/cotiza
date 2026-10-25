export const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

export function calculateTotals(items, discountPercent = 0, taxPercent = 0) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Math.round((item.unitPriceCents * Math.round(item.quantity * 1000)) / 1000),
    0,
  );
  const discount = Math.round((subtotal * Math.round(discountPercent * 100)) / 10000);
  const tax = Math.round(((subtotal - discount) * Math.round(taxPercent * 100)) / 10000);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}

export function effectiveStatus(quote, today = new Date().toISOString().slice(0, 10)) {
  return quote.status === 'sent' && quote.validUntil < today ? 'expired' : quote.status;
}

export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(cents / 100);
}

export function quoteNumber(number) {
  return 'COT-' + String(number).padStart(4, '0');
}

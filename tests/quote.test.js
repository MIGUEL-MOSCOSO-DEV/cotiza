import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals, effectiveStatus } from '../shared/quote.js';
import { quoteSchema } from '../server/validation.js';

const items = [{ description: 'Trabajo', quantity: 1.5, unitPriceCents: 10001 }];

test('redondea cada concepto antes de calcular descuento e impuesto', () => {
  assert.deepEqual(calculateTotals(items, 10, 18), {
    subtotal: 15002,
    discount: 1500,
    tax: 2430,
    total: 15932,
  });
});
test('admite cantidades con tres decimales sin perder céntimos', () => {
  assert.equal(calculateTotals([{ quantity: 0.125, unitPriceCents: 7999 }]).total, 1000);
});
test('un descuento del 100% deja impuesto y total en cero', () => {
  assert.deepEqual(calculateTotals(items, 100, 18), {
    subtotal: 15002,
    discount: 15002,
    tax: 0,
    total: 0,
  });
});
test('la propuesta es válida durante todo el día de vencimiento UTC', () => {
  assert.equal(effectiveStatus({ status: 'sent', validUntil: '2026-10-25' }, '2026-10-25'), 'sent');
  assert.equal(
    effectiveStatus({ status: 'sent', validUntil: '2026-10-25' }, '2026-10-26'),
    'expired',
  );
  assert.equal(
    effectiveStatus({ status: 'accepted', validUntil: '2026-10-25' }, '2026-10-26'),
    'accepted',
  );
});
test('rechaza fechas imposibles, fracciones de céntimo e importes fuera de límite', () => {
  const input = {
    clientId: 'a4d41835-3dd8-4440-bfe1-68b9ce226e16',
    title: 'Trabajo',
    currency: 'USD',
    validUntil: '2026-02-30',
    discountPercent: 0,
    taxPercent: 0,
    notes: '',
    terms: '',
    items,
  };
  assert.equal(quoteSchema.safeParse(input).success, false);
  assert.equal(
    quoteSchema.safeParse({
      ...input,
      validUntil: '2026-12-01',
      items: [{ ...items[0], unitPriceCents: 1.2 }],
    }).success,
    false,
  );
  assert.equal(
    quoteSchema.safeParse({
      ...input,
      validUntil: '2026-12-01',
      items: [{ ...items[0], quantity: 100000, unitPriceCents: 100000000 }],
    }).success,
    false,
  );
});

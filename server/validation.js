import { z } from 'zod';

const text = (max) => z.string().trim().max(max);
const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const optionalEmail = z.union([email, z.literal('')]);
const percentage = z.number().min(0).max(100).multipleOf(0.01);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'La fecha no es válida.');

export const credentialsSchema = z.object({ email, password: z.string().min(10).max(128) });
export const registrationSchema = credentialsSchema.extend({ name: text(100).min(2) });
export const clientSchema = z.object({
  name: text(160).min(1),
  email: optionalEmail,
  phone: text(40),
  company: text(160),
  taxId: text(40),
  address: text(500),
});
export const profileSchema = z.object({
  name: text(100).min(2),
  businessName: text(160).min(1),
  businessEmail: optionalEmail,
  phone: text(40),
  taxId: text(40),
  address: text(500),
  currency: z.enum(['USD', 'PEN', 'EUR', 'MXN', 'COP', 'CLP', 'ARS', 'GBP']),
  terms: text(4000),
});
export const quoteSchema = z
  .object({
    clientId: z.string().uuid(),
    title: text(180).min(1),
    currency: z.enum(['USD', 'PEN', 'EUR', 'MXN', 'COP', 'CLP', 'ARS', 'GBP']),
    validUntil: date,
    discountPercent: percentage,
    taxPercent: percentage,
    notes: text(4000),
    terms: text(4000),
    items: z
      .array(
        z.object({
          description: text(500).min(1),
          quantity: z.number().positive().max(100000).multipleOf(0.001),
          unitPriceCents: z.number().int().min(0).max(100000000),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (quote) =>
      quote.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0) <=
      100000000000,
    'El importe supera el límite permitido.',
  );
export const decisionSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  name: text(160).min(2),
});

const { z, objectId } = require('./common');

const str = (max = 200) => z.string().trim().max(max);
const opt = (max = 200) => str(max).optional();

const join = z.object({
  name: opt(120),
  city: opt(80),
  type: z.enum(['CUSTOMER', 'FRIEND', 'PROPERTY_DEALER', 'BROKER', 'PARTNER', 'OTHER']).default('CUSTOMER'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms' }) }),
});

const payout = z.discriminatedUnion('method', [
  z.object({ method: z.literal('UPI'), upiId: str(80).regex(/^[\w.\-]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}$/, 'Enter a valid UPI ID, e.g. name@okicici'), pan: str(10).regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'Invalid PAN').optional().or(z.literal('')) }),
  z.object({
    method: z.literal('BANK'),
    accountName: str(120).min(2, 'Enter the account holder name'),
    accountNumber: str(20).regex(/^\d{9,18}$/, 'Enter a valid account number'),
    ifsc: str(11).regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Enter a valid IFSC'),
    bankName: opt(120),
    pan: str(10).regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'Invalid PAN').optional().or(z.literal('')),
  }),
]);

const submit = z.object({
  name: str(120).min(2, 'Enter the customer’s name'),
  mobile: str(20).min(10, 'Enter the customer’s mobile'),
  city: opt(80),
  propertyType: opt(80),
  budget: opt(80),
  notes: opt(1000),
  consent: z.literal(true, { errorMap: () => ({ message: 'Confirm the customer agreed to be contacted' }) }),
});

const note = z.object({ note: opt(1000) });
const reason = z.object({ reason: str(1000).min(3, 'Give a reason') });
const verify = z.object({ note: opt(1000), override: z.boolean().default(false) });
const link = z.object({ bookingNumber: str(40).min(3), reason: str(1000).min(3, 'Give a reason') });
const approve = z.object({ amount: z.coerce.number().min(0).max(1e8).optional(), note: opt(1000) });
const pay = z.object({
  paidAt: z.coerce.date().max(new Date(Date.now() + 864e5), 'Date cannot be in the future').optional(),
  method: z.enum(['UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER']),
  reference: str(120).min(2, 'Enter the payment reference / UTR'),
  tdsAmount: z.coerce.number().min(0).max(1e8).optional(),
});
const referrerUpdate = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  suspendedReason: opt(500),
  type: z.enum(['CUSTOMER', 'FRIEND', 'PROPERTY_DEALER', 'BROKER', 'PARTNER', 'OTHER']).optional(),
  adminNotes: opt(2000),
});

const adjust = z.object({ amount: z.coerce.number().min(0).max(1e8), reason: str(1000).min(3, 'Give a reason') });
const create = z.object({ referrerCode: str(20).regex(/^II-[A-Za-z0-9]{6}$/, 'Enter a referral code like II-ABC123'), customerMobile: str(20).min(10, 'Enter the customer mobile'), reason: str(1000).min(3, 'Give a reason') });

module.exports = { adjust, create, join, payout, submit, note, reason, verify, link, approve, pay, referrerUpdate, objectId };

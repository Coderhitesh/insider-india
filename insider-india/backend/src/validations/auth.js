const { z, objectId, mobile } = require('./common');

const sendOtp = z.object({
  mobile,
  channel: z.enum(['SMS', 'WHATSAPP']).default('SMS'),
  leadId: objectId.optional(),
  leadToken: z.string().max(200).optional(),
});

const verifyOtp = z.object({
  mobile,
  code: z.string().trim().regex(/^\d{4,8}$/, 'Enter the verification code'),
  leadId: objectId.optional(),
  leadToken: z.string().max(200).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  referralCode: z.string().trim().max(20).optional().transform((v) => (v && /^II-[A-Z0-9]{6}$/i.test(v) ? v.toUpperCase() : undefined)),
});

const staffLogin = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password is too short').max(200),
});

module.exports = { sendOtp, verifyOtp, staffLogin };

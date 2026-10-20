const { z, objectId } = require('./common');

const str = (max = 200) => z.string().trim().max(max);
const create = z.object({
  name: str(120).min(2, 'Enter your name'),
  mobile: str(20).min(10, 'Enter your mobile number'),
  email: z.union([z.literal(''), str(200).email('Enter a valid email')]).optional(),
  city: str(80).optional(),
  topic: z.enum(['GENERAL', 'NEW_PROJECT', 'EXISTING_PROJECT', 'COMMERCIAL', 'PARTNERSHIP', 'CAREERS', 'FEEDBACK', 'OTHER']).default('GENERAL'),
  message: str(3000).min(10, 'Please write a few words (at least 10 characters)'),
  preferredContact: z.enum(['CALL', 'WHATSAPP', 'EMAIL']).default('CALL'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to be contacted' }) }),
  website: str(200).optional(), // honeypot
  page: str(300).optional(),
  utm: z.object({ source: str(), medium: str(), campaign: str(), term: str(), content: str() }).partial().optional(),
});
const update = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']).optional(),
  assignedTo: objectId.nullable().optional(),
  note: str(2000).optional(),
});
module.exports = { create, update };

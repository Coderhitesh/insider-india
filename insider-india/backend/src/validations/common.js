const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const mobile = z.string().trim().min(10, 'Enter a valid mobile number').max(16);
const idParam = z.object({ id: objectId });
const pagination = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = { z, objectId, mobile, idParam, pagination };

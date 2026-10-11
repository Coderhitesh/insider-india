const Counter = require('../models/Counter');

async function nextNumber(prefix) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}-${year}-${String(c.seq).padStart(6, '0')}`;
}

module.exports = { nextNumber };

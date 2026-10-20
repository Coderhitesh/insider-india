const { Schema, model } = require('mongoose');

// Short-lived mutex: inserting a document with the same _id fails (unique), so only one holder at a time.
const lockSchema = new Schema({ _id: String, expiresAt: { type: Date, required: true } }, { versionKey: false });

module.exports = model('Lock', lockSchema);

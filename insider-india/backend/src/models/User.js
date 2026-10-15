const { Schema, model, Types } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    mobile: { type: String, trim: true }, // normalised 10-digit Indian number
    countryCode: { type: String, default: '+91' },
    email: { type: String, trim: true, lowercase: true },
    mobileVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, required: true, default: 'CUSTOMER', uppercase: true, index: true },
    // When customPermissions=true, `permissions` replaces the role defaults exactly.
    customPermissions: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'], default: 'ACTIVE', index: true },
    loginEnabled: { type: Boolean, default: true },
    avatar: { type: Types.ObjectId, ref: 'Media' },
    passwordHash: { type: String, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, select: false },
    },
    lastLogin: Date,
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

userSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { mobile: { $type: 'string' } } });
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ role: 1, status: 1, createdAt: -1 });

module.exports = model('User', userSchema);

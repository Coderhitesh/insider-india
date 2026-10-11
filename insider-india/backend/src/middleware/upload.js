const multer = require('multer');
const { MAX_UPLOAD_MB } = require('../config/constants');
const ApiError = require('../utils/ApiError');

const BLOCKED = /\.(exe|bat|cmd|sh|js|mjs|php|py|jar|msi|dll|com|scr|html?|svg)$/i;

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => {
    if (BLOCKED.test(file.originalname || '')) return cb(new ApiError(415, 'This file type is not allowed', 'FILE_TYPE_NOT_ALLOWED'));
    return cb(null, true);
  },
}).single('file');

module.exports = { uploadSingle };

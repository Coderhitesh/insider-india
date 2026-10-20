// One-off: npm run fix:file-urls — converts stored "http(s)://host/api/v1/files/…" values to "/api/v1/files/…".
const { connectDB, disconnectDB } = require('../src/config/db');
const { migrateFileUrls } = require('../src/services/fileUrlMigration');

(async () => {
  await connectDB();
  const n = await migrateFileUrls();
  console.log(`Updated ${n} document(s).`);
  await disconnectDB();
})().catch((err) => { console.error(err); process.exit(1); });

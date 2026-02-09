// File size limits
export const FREE_MAX_BYTES = 100 * 1024; // 100KB
// With direct client-to-Arweave uploads, files bypass Vercel body limit entirely.
// The old 3MB limit only applies to the legacy server-side upload path (api/upload/paid).
// For the new direct upload path, files can be much larger.
export const MAX_FILE_BYTES = parseInt(process.env.MAX_FILE_BYTES || String(100 * 1024 * 1024)); // 100MB default, env var is in bytes


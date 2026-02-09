// File size limits
export const FREE_MAX_BYTES = 100 * 1024; // 100KB
// Vercel serverless functions have a 4.5MB request body limit.
// Files are sent as base64 JSON (~33% overhead), so max raw file size is ~3.3MB.
// Using 3MB as a safe limit with margin for JSON envelope overhead.
export const MAX_FILE_BYTES = parseInt(process.env.MAX_FILE_BYTES || String(3 * 1024 * 1024)); // 3MB default, env var is in bytes


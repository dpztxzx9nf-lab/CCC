/**
 * Local ingestion runs only on a developer machine.
 * Disabled on Vercel and in production builds at runtime.
 */
export function isLocalIngestionEnabled(): boolean {
  if (process.env.CCC_LOCAL_INGESTION === "0") return false;
  if (process.env.VERCEL === "1") return false;
  if (process.env.VERCEL_ENV) return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

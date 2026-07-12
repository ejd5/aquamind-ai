/** Server-side AQWELIA administrator allowlist. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}

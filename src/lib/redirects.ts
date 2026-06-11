/**
 * Only allow same-origin, absolute-path redirect targets (e.g. "/bracket").
 * Rejects protocol-relative ("//evil.com"), userinfo ("@evil.com"), absolute
 * URLs and backslash variants that would otherwise turn a `?next=` parameter
 * into an open redirect after sign-in.
 */
export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\\@]/.test(raw.split("?")[0])) {
    return "/dashboard";
  }
  return raw;
}

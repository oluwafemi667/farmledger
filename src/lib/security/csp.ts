/**
 * Content Security Policy, built per request with a fresh nonce.
 *
 * Scripts: only our own bundle and scripts carrying this request's nonce, so an
 * injected <script> or a tampered inline snippet will not run. Styles allow
 * inline because React and the font loader write style attributes; styles
 * cannot execute code. Network: only this origin and the Supabase project.
 */
export function buildCsp({
  nonce,
  supabaseUrl,
  dev = false,
}: {
  nonce: string;
  supabaseUrl?: string;
  dev?: boolean;
}): string {
  const connect = ["'self'"];
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      connect.push(u.origin, `wss://${u.host}`);
    } catch {
      /* an invalid URL is already reported by the env check */
    }
  }
  if (dev) connect.push("ws://localhost:*", "http://localhost:*");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

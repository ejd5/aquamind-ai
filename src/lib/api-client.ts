// API client abstraction — single entry point for both web (relative URLs) and
// mobile (absolute URLs via Capacitor HTTP bridge).
//
// Configure via NEXT_PUBLIC_API_BASE_URL:
//   - Empty string (default, web)  → relative URLs e.g. "/api/dashboard"
//   - Full URL (mobile / Capacitor) → e.g. "https://api.aqwelia.app"
//
// Auth is cookie-based (`credentials: 'include'`) so the same Next.js session
// cookie works on web and is attached by Capacitor's HTTP bridge on mobile.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const message =
      (data as { error?: string; message?: string })?.error ||
      (data as { error?: string; message?: string })?.message ||
      `Erreur ${res.status}`
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

// Convenience re-exports
export type { PlanId } from './pool/freemium'

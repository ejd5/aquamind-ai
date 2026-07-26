// API client abstraction — single entry point for both web and Capacitor.
//
// Configure via NEXT_PUBLIC_API_BASE_URL:
//   - Empty string (web)             → relative URLs such as "/api/dashboard"
//   - Full HTTPS URL (native mobile) → such as "https://api.aqwelia.app"
//
// Authentication is cookie-based. CapacitorHttp and CapacitorCookies are
// enabled in capacitor.config.ts so native fetch requests and session cookies
// use the platform networking stack on iOS and Android.

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')

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

export interface ApiRequestOptions {
  headers?: Record<string, string>
}

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) throw new Error('API paths must start with /')
  return `${BASE}${path}`
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
  get: <T = unknown>(path: string, options?: ApiRequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T = unknown>(path: string, options?: ApiRequestOptions) =>
    request<T>('DELETE', path, undefined, options),
}

export type { PlanId } from './pool/freemium'

// Centralized API route paths — single source of truth for both client and
// server-side callers. Keep in sync with src/app/api/**/route.ts files.
//
// Usage:
//   import { api } from '@/lib/api-client'
//   import { API_ROUTES } from '@/lib/api-routes'
//   const dashboard = await api.get<Dashboard>(API_ROUTES.dashboard)

export const API_ROUTES = {
  dashboard: '/api/dashboard',
  profile: '/api/pool/profile',
  waterTest: '/api/pool/water-test',
  actionPlan: '/api/pool/action-plan',
  photoDiagnostic: '/api/pool/photo-diagnostic',
  equipment: '/api/pool/equipment',
  inventory: '/api/pool/inventory',
  weather: '/api/pool/weather',
  reminders: '/api/pool/reminders',
  chat: '/api/chat',
  guides: '/api/guides',
  subscription: '/api/subscription',
  analytics: '/api/analytics',
  auth: {
    me: '/api/auth/me',
    register: '/api/auth/register',
  },
} as const

export type ApiRouteKey = keyof Omit<typeof API_ROUTES, 'auth'>

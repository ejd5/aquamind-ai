/**
 * French default pool names stored in the DB before i18n refactor.
 * Used to detect if a pool name is a default (translatable) or custom (user-entered).
 * The UI translates these to the user's locale; custom names are displayed as-is.
 */
export const FRENCH_DEFAULT_POOL_NAMES = [
  'Ma piscine',
  'Piscine démo',
] as const

export function isDefaultPoolName(name: string): boolean {
  return (FRENCH_DEFAULT_POOL_NAMES as readonly string[]).includes(name)
}

export function getDefaultPoolNameKey(name: string): string | null {
  if (name === 'Ma piscine') return 'defaultPoolName'
  if (name === 'Piscine démo') return 'demoPoolName'
  return null
}

/**
 * French default account names stored in the DB before i18n refactor.
 * Used to detect if a user name is a default (translatable) or custom.
 */
export const FRENCH_DEFAULT_ACCOUNT_NAMES = [
  'Compte Démonstration',
] as const

export function getDefaultAccountNameKey(name: string): string | null {
  if (name === 'Compte Démonstration') return 'demoAccountName'
  return null
}

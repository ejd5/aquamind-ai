export type DatabaseProvider = 'sqlite' | 'postgresql'

export function resolveDatabaseProvider(
  configuredProvider: string | undefined,
  databaseUrl: string | undefined
): DatabaseProvider {
  const provider = configuredProvider || 'sqlite'
  if (provider !== 'sqlite' && provider !== 'postgresql') {
    throw new Error(`Unsupported DATABASE_PROVIDER: ${provider}`)
  }
  if (!databaseUrl) throw new Error('DATABASE_URL is required')
  if (provider === 'sqlite' && !databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_PROVIDER=sqlite requires a file: DATABASE_URL')
  }
  if (provider === 'postgresql' && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_PROVIDER=postgresql requires a PostgreSQL DATABASE_URL')
  }
  return provider
}

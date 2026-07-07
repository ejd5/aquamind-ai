import { getRequestConfig } from 'next-intl/server'
import { normalizeLocale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = normalizeLocale(requested)
  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  }
})

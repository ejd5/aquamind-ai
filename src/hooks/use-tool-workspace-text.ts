'use client'

import { useLocale } from 'next-intl'
import { toolWorkspaceText, type ToolWorkspaceKey } from '@/i18n/locales/tool-workspaces'

export function useToolWorkspaceText() {
  const locale = useLocale()
  return (key: ToolWorkspaceKey) => toolWorkspaceText(locale, key)
}

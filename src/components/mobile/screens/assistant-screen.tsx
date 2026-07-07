'use client'

import { useTranslations } from 'next-intl'

import { ModuleAssistant } from '../../aquamind/module-assistant'

interface AssistantScreenProps {
  /** Optional preset question (e.g. coming from the dashboard's quick prompts). */
  presetQuestion?: string
  /** Called after the assistant consumes the preset question. */
  onConsumePreset?: () => void
}

/**
 * Mobile "Assistant" screen — renders the existing `<ModuleAssistant />`
 * full-height so the chat fills the screen. No extra padding: the chat needs
 * full width and the input bar sticks to the bottom (just above the mobile
 * bottom tabs).
 *
 * The parent shell is responsible for adding bottom padding so the input
 * bar clears the fixed bottom tabs (see `<MobileAppShell />`).
 */
export function AssistantScreen({ presetQuestion, onConsumePreset }: AssistantScreenProps) {
  return (
    <div className="mobile-scroll flex h-full flex-col pb-24">
      <ModuleAssistant
        presetQuestion={presetQuestion}
        onConsumePreset={onConsumePreset}
      />
    </div>
  )
}

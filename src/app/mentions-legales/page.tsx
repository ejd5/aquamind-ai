/**
 * AQWELIA — Legacy URL redirect: /mentions-legales → /legal/cgu
 *
 * The legal content has been consolidated under /legal/* for clarity.
 * This route exists to keep old inbound links and bookmarks working
 * (308 permanent redirect, SEO-friendly).
 *
 * URL: /mentions-legales
 */
import { permanentRedirect } from 'next/navigation'

export default function MentionsLegalesPage(): never {
  permanentRedirect('/legal/cgu')
}

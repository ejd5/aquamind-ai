/**
 * AQWELIA — Legacy URL redirect: /confidentialite → /legal/privacy
 *
 * The privacy policy has been moved under /legal/* for clarity.
 * This route exists to keep old inbound links and bookmarks working
 * (308 permanent redirect, SEO-friendly).
 *
 * URL: /confidentialite
 */
import { permanentRedirect } from 'next/navigation'

export default function ConfidentialitePage(): never {
  permanentRedirect('/legal/privacy')
}

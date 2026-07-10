/**
 * AQWELIA — Legacy URL redirect: /conditions-utilisation → /legal/cgu
 *
 * The Terms of Use have been consolidated under /legal/cgu.
 * This route exists to keep old inbound links and bookmarks working
 * (308 permanent redirect, SEO-friendly).
 *
 * URL: /conditions-utilisation
 */
import { permanentRedirect } from 'next/navigation'

export default function ConditionsUtilisationPage(): never {
  permanentRedirect('/legal/cgu')
}

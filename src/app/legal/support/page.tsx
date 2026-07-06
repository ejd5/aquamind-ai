/**
 * AQWELIA — Support page.
 * Server component — no client hooks.
 *
 * URL: /legal/support
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Mail, Clock, HelpCircle, Bug, Lightbulb, BookOpen, MessageSquare, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Support — AQWELIA',
  description: 'Contacter le support AQWELIA, FAQ, signaler un bug, demander une fonctionnalité.',
}

export default function SupportPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="section-label">Aide & support</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Contacter le support
        </h1>
        <p className="text-sm text-muted-foreground">
          Notre équipe est disponible pour vous aider à tirer le meilleur d&apos;AQWELIA.
        </p>
        <div className="gold-divider" />
      </header>

      {/* Primary contact card */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                Email
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                La meilleure façon de nous joindre. Réponse sous 48h ouvrées.
              </p>
              <a
                href="mailto:support@aqwelia.app"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                <Mail className="h-3.5 w-3.5" />
                support@aqwelia.app
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Response times */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Clock className="h-4 w-4" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Temps de réponse
          </h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            <strong className="text-foreground">Plan Free</strong> : réponse sous 72h ouvrées.
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            <strong className="text-foreground">Plan Premium</strong> : réponse sous 48h ouvrées.
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            <strong className="text-foreground">Plan Expert</strong> : réponse sous 24h, support prioritaire.
          </li>
        </ul>
      </section>

      {/* Quick links grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SupportCard
          icon={<HelpCircle className="h-5 w-5" />}
          title="FAQ"
          description="Réponses aux questions les plus fréquentes : abonnements, données, piscine, compatibilité."
          link="/#faq"
          linkLabel="Voir la FAQ"
        />
        <SupportCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Base de connaissances"
          description="Guides détaillés, tutoriels vidéo et articles d’aide. À venir."
          link="/#faq"
          linkLabel="Bientôt disponible"
          disabled
        />
        <SupportCard
          icon={<Bug className="h-5 w-5" />}
          title="Signaler un bug"
          description="Vous avez repéré un comportement inattendu ? Décrivez-le nous avec une capture si possible."
          link="mailto:support@aqwelia.app?subject=Bug%20AQWELIA"
          linkLabel="Signaler par email"
        />
        <SupportCard
          icon={<Lightbulb className="h-5 w-5" />}
          title="Demander une fonctionnalité"
          description="Une idée pour améliorer AQWELIA ? Nous lisons toutes les suggestions."
          link="mailto:support@aqwelia.app?subject=Idée%20fonctionnalité%20AQWELIA"
          linkLabel="Partager mon idée"
        />
        <SupportCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Assistant IA intégré"
          description="Pour une question rapide sur votre piscine, interrogez l’assistant directement dans l’app."
          link="/"
          linkLabel="Ouvrir l’app"
        />
        <SupportCard
          icon={<Mail className="h-5 w-5" />}
          title="Questions légales"
          description="Pour les sujets RGPD, confidentialité ou CGU, écrivez à privacy@aqwelia.app."
          link="mailto:privacy@aqwelia.app"
          linkLabel="Contacter le DPO"
        />
      </section>

      {/* Bottom links */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Ressources associées
        </h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/legal/cgu"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Conditions générales
          </Link>
          <Link
            href="/legal/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Politique de confidentialité
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Paramètres du compte
          </Link>
        </div>
      </section>
    </article>
  )
}

interface SupportCardProps {
  icon: React.ReactNode
  title: string
  description: string
  link: string
  linkLabel: string
  disabled?: boolean
}

function SupportCard({ icon, title, description, link, linkLabel, disabled = false }: SupportCardProps) {
  const isExternal = link.startsWith('mailto:') || link.startsWith('http')
  const className = `mt-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
    disabled
      ? 'cursor-not-allowed text-muted-foreground/60'
      : 'text-gold hover:text-gold/80'
  }`

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {isExternal ? (
        <a
          href={disabled ? undefined : link}
          className={className}
          aria-disabled={disabled}
        >
          {linkLabel}
          {!disabled && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </a>
      ) : (
        <Link
          href={disabled ? '#' : link}
          className={className}
          aria-disabled={disabled}
          data-disabled={disabled || undefined}
        >
          {linkLabel}
          {!disabled && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </Link>
      )}
    </div>
  )
}

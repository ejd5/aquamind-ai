/**
 * AQWELIA — Politique de confidentialité (RGPD).
 * Server component — no client hooks.
 *
 * URL: /legal/privacy
 */
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — AQWELIA',
  description: 'Politique de protection des données personnelles AQWELIA (RGPD).',
}

const LAST_UPDATED = '15 janvier 2026'

export default function PrivacyPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="section-label">RGPD</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : {LAST_UPDATED}
        </p>
        <div className="gold-divider" />
      </header>

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via l&apos;application
          AQWELIA est la société <strong>AQWELIA</strong>, éditrice du Service.
        </p>
        <p>
          Contact DPO : <a href="mailto:privacy@aqwelia.app" className="text-gold underline">privacy@aqwelia.app</a>
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Le Service collecte les catégories de données suivantes :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Identifiants de compte</strong> : adresse e-mail, nom (facultatif), mot de passe (haché).</li>
          <li><strong>Profil de piscine</strong> : volume, forme, revêtement, traitement, filtre, exposition, région.</li>
          <li><strong>Données d&apos;eau</strong> : mesures (pH, chlore, TAC, TH, CYA, sel, température, etc.) saisies ou importées.</li>
          <li><strong>Photos</strong> : images de l&apos;eau, des parois, du filtre, des électrolyseurs et produits, utilisées pour le diagnostic visuel IA.</li>
          <li><strong>Équipements & inventaire</strong> : marque, modèle, dates de maintenance, produits chimiques en stock.</li>
          <li><strong>Historique</strong> : conversations avec l&apos;assistant IA, plans d&apos;action générés, diagnostics photo.</li>
          <li><strong>Données de facturation</strong> : plan souscrit, période, statut (les informations de paiement sont traitées par Stripe, Apple ou Google — AQWELIA ne stocke pas les numéros de carte).</li>
          <li><strong>Données d&apos;usage</strong> : événements analytics (consultation de guides, ouverture de paywall, fréquence d&apos;utilisation).</li>
        </ul>
      </Section>

      <Section title="3. Finalités">
        <p>Les données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>fonctionnement du Service (génération de plans d&apos;action, calculs de dosage, suivi de l&apos;eau) ;</li>
          <li>amélioration des modèles d&apos;IA (diagnostic photo, recommandations) — sur la base d&apos;une anonymisation préalable lorsque c&apos;est possible ;</li>
          <li>facturation et gestion des abonnements ;</li>
          <li>support utilisateur ;</li>
          <li>analyse d&apos;usage et amélioration de l&apos;expérience ;</li>
          <li>respect des obligations légales et comptables.</li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <p>Conformément à l&apos;article 6 du RGPD, les traitements reposent sur les bases légales suivantes :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Exécution du contrat</strong> (art. 6.1.b) : fourniture du Service souscrit.</li>
          <li><strong>Consentement</strong> (art. 6.1.a) : photos envoyées pour diagnostic, notifications, communications marketing éventuelles.</li>
          <li><strong>Intérêt légitime</strong> (art. 6.1.f) : amélioration du Service, sécurité, prévention de la fraude.</li>
          <li><strong>Obligation légale</strong> (art. 6.1.c) : conservation des factures et traces comptables.</li>
        </ul>
        <p>
          L&apos;Utilisateur peut retirer son consentement à tout moment depuis la page{' '}
          <Link href="/settings" className="text-gold underline">Paramètres</Link>, sans porter
          atteinte à la licéité du traitement antérieur.
        </p>
      </Section>

      <Section title="5. Durée de conservation">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Compte actif</strong> : durée d&apos;utilisation du Service.</li>
          <li><strong>Données de piscine, mesures, photos</strong> : conservées tant que le Compte est actif, plus 90 jours après suppression (pour restauration éventuelle), puis effacées définitivement.</li>
          <li><strong>Factures</strong> : 10 ans (obligation comptable légale en France).</li>
          <li><strong>Logs de sécurité</strong> : 12 mois.</li>
          <li><strong>Compte inactif</strong> : après 24 mois sans connexion, notification par e-mail puis suppression du Compte et de ses données.</li>
        </ul>
      </Section>

      <Section title="6. Destinataires">
        <p>Les données sont accessibles aux destinataires suivants :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>AQWELIA</strong> : personnel autorisé (ingénieurs, support) sous accord de confidentialité.</li>
          <li><strong>Hébergeur cloud</strong> : stockage et calcul (localisé UE).</li>
          <li><strong>Stripe</strong> : traitement des paiements web (soumis à son propre RGPD).</li>
          <li><strong>RevenueCat</strong> : gestion unifiée des abonnements iOS/Android.</li>
          <li><strong>Apple / Google</strong> : paiements In-App (soumis à leurs propres conditions).</li>
          <li><strong>Prestataires IA</strong> : pour le diagnostic photo et l&apos;assistant — uniquement les données strictement nécessaires, sans stockage au-delà de la session.</li>
        </ul>
        <p>
          AQWELIA ne vend jamais vos données à des tiers à des fins marketing.
        </p>
      </Section>

      <Section title="7. Transferts hors UE">
        <p>
          L&apos;hébergement principal est localisé dans l&apos;Union Européenne. Tout transfert
          hors UE éventuel (par exemple vers un prestataire IA basé aux États-Unis) est
          encadré par les clauses contractuelles types de la Commission Européenne (décision
          2021/914) et accompagné de garanties appropriées (chiffrement, minimisation,
          pseudonymisation).
        </p>
      </Section>

      <Section title="8. Vos droits">
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données.</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes.</li>
          <li><strong>Droit à l&apos;effacement</strong> (« droit à l&apos;oubli ») : supprimer votre Compte et vos données.</li>
          <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et réutilisable.</li>
          <li><strong>Droit d&apos;opposition</strong> : refuser un traitement fondé sur l&apos;intérêt légitime.</li>
          <li><strong>Droit à la limitation</strong> : geler temporairement un traitement.</li>
          <li><strong>Droit de retirer votre consentement</strong> à tout moment.</li>
        </ul>
        <p>
          Ces droits sont exerçables directement depuis la page{' '}
          <Link href="/settings" className="text-gold underline">Paramètres</Link> (export
          JSON, suppression du compte), ou par e-mail à{' '}
          <a href="mailto:privacy@aqwelia.app" className="text-gold underline">privacy@aqwelia.app</a>.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la CNIL
          (www.cnil.fr) ou de l&apos;autorité de contrôle de votre pays.
        </p>
      </Section>

      <Section title="9. Cookies et traceurs">
        <p>
          AQWELIA utilise un minimum de traceurs strictement nécessaires au fonctionnement du
          Service (session d&apos;authentification, préférences de langue et de thème). Aucun
          cookie publicitaire ou de tracking tiers n&apos;est déposé sans consentement.
        </p>
        <p>
          Les préférences peuvent être gérées depuis la page{' '}
          <Link href="/settings" className="text-gold underline">Paramètres</Link>.
        </p>
      </Section>

      <Section title="10. Sécurité">
        <p>
          AQWELIA met en œuvre les mesures techniques et organisationnelles appropriées pour
          protéger vos données :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>chiffrement des mots de passe (scrypt, algorithme résistant au brute-force) ;</li>
          <li>chiffrement des données en transit (TLS 1.2+) et au repos (chiffrement base de données) ;</li>
          <li>authentification par JWT signé, durée de vie limitée (30 jours) ;</li>
          <li>accès restreint aux données personnelles (principe du moindre privilège) ;</li>
          <li>sauvegardes chiffrées et tests d&apos;intrusion réguliers.</li>
        </ul>
        <p>
          En cas de violation de données susceptible d&apos;engendrer un risque pour vos droits
          et libertés, AQWELIA vous notifiera dans les meilleurs délais conformément à
          l&apos;article 34 du RGPD.
        </p>
      </Section>

      <Section title="11. Contact DPO">
        <p>
          Pour toute question relative à la protection de vos données, contactez notre DPO :
        </p>
        <p className="mt-2">
          <a
            href="mailto:privacy@aqwelia.app"
            className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            privacy@aqwelia.app
          </a>
        </p>
        <p className="mt-4 text-xs">
          Voir aussi nos <Link href="/legal/cgu" className="text-gold underline">CGU</Link> et
          notre <Link href="/legal/support" className="text-gold underline">page Support</Link>.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  )
}

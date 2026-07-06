/**
 * AQWELIA — Conditions Générales d'Utilisation (CGU).
 * Server component — no client hooks.
 *
 * URL: /legal/cgu
 */
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CGU — AQWELIA',
  description: 'Conditions générales d’utilisation du service AQWELIA.',
}

const LAST_UPDATED = '15 janvier 2026'

export default function CGUPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="section-label">Mentions légales</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : {LAST_UPDATED}
        </p>
        <div className="gold-divider" />
      </header>

      <Section title="Article 1 — Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (« <strong>CGU</strong> »)
          définissent les modalités et conditions d&apos;accès et d&apos;utilisation de
          l&apos;application AQWELIA (« <strong>le Service</strong> »), éditée par la société
          AQWELIA, ainsi que les droits et obligations des parties dans ce cadre.
        </p>
        <p>
          L&apos;utilisation du Service implique l&apos;acceptation pleine et entière des
          présentes CGU. Si vous n&apos;êtes pas d&apos;accord avec l&apos;une quelconque de ces
          conditions, vous ne devez pas utiliser le Service.
        </p>
      </Section>

      <Section title="Article 2 — Définitions">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>« Utilisateur »</strong> : toute personne physique qui utilise le Service.</li>
          <li><strong>« Compte »</strong> : espace personnel créé par l&apos;Utilisateur pour accéder au Service.</li>
          <li><strong>« Données »</strong> : informations saisies par l&apos;Utilisateur (mesures, photos, profil de piscine, etc.).</li>
          <li><strong>« Plan »</strong> : formule d&apos;abonnement (Free, Premium ou Expert) à laquelle l&apos;Utilisateur souscrit.</li>
          <li><strong>« Contenu »</strong> : recommandations, plans d&apos;action, analyses, guides et textes générés par le Service.</li>
        </ul>
      </Section>

      <Section title="Article 3 — Description du service">
        <p>
          AQWELIA est un copilote intelligent d&apos;entretien de piscine. Le Service permet à
          l&apos;Utilisateur de :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>suivre et analyser la qualité de l&apos;eau de sa piscine (pH, chlore, TAC, TH, etc.) ;</li>
          <li>obtenir des plans d&apos;action personnalisés (dosages, filtration, baignabilité) ;</li>
          <li>diagnostiquer visuellement l&apos;eau et les équipements via photo ;</li>
          <li>consulter un assistant IA pour toute question d&apos;entretien ;</li>
          <li>recevoir des rappels intelligents (météo, équipements, stocks produits) ;</li>
          <li>consulter des guides et ressources pédagogiques.</li>
        </ul>
        <p>
          Le Service est fourni à titre indicatif et ne remplace pas l&apos;intervention d&apos;un
          professionnel qualifié (pisciniste, revendeur, sauveteur).
        </p>
      </Section>

      <Section title="Article 4 — Inscription et compte">
        <p>
          L&apos;inscription au Service nécessite la création d&apos;un Compte via une adresse
          e-mail valide et un mot de passe. L&apos;Utilisateur s&apos;engage à fournir des
          informations exactes et à les maintenir à jour.
        </p>
        <p>
          L&apos;Utilisateur est seul responsable de la confidentialité de ses identifiants et
          de toute utilisation de son Compte. Toute activité réalisée depuis son Compte est
          réputée effectuée par l&apos;Utilisateur.
        </p>
        <p>
          AQWELIA se réserve le droit de refuser ou de clôturer un Compte en cas de non-respect
          des présentes CGU ou de comportement frauduleux.
        </p>
      </Section>

      <Section title="Article 5 — Utilisation du service">
        <p>L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>utiliser le Service conformément à sa destination et au droit applicable ;</li>
          <li>ne pas tenter de détourner, désactiver ou compromettre la sécurité du Service ;</li>
          <li>ne pas importer de Contenu illicite, diffamatoire ou portant atteinte aux droits des tiers ;</li>
          <li>respecter les notices des produits chimiques utilisés pour l&apos;entretien de sa piscine.</li>
        </ul>
        <p>
          L&apos;Utilisateur reconnaît que les recommandations fournies par le Service sont
          indicatives et qu&apos;il reste seul responsable des actes qu&apos;il pose sur sa piscine.
        </p>
      </Section>

      <Section title="Article 6 — Abonnements">
        <p>Le Service propose trois Plans :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Free</strong> : gratuit, inclut 1 piscine, mesures manuelles de base, assistant limité.</li>
          <li><strong>Premium</strong> : jusqu&apos;à 3 piscines, diagnostic photo illimité, assistant IA complet, rappels météo, guides avancés.</li>
          <li><strong>Expert</strong> : illimité (piscinistes professionnels), multi-clients, exports, support prioritaire.</li>
        </ul>
        <p>
          Les fonctionnalités et tarifs de chaque Plan sont détaillés sur la page{' '}
          <Link href="/#tarifs" className="text-gold underline">Tarifs</Link>. AQWELIA se réserve
          le droit de modifier ces offres à tout moment, sous réserve d&apos;en informer les
          Utilisateurs abonnés au moins 30 jours avant l&apos;entrée en vigueur.
        </p>
      </Section>

      <Section title="Article 7 — Paiement">
        <p>
          Le paiement des abonnements Premium et Expert s&apos;effectue selon la plateforme
          utilisée :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Web</strong> : via Stripe (carte bancaire, paiement sécurisé).</li>
          <li><strong>iOS</strong> : via Apple In-App Purchase (géré par Apple).</li>
          <li><strong>Android</strong> : via Google Play Billing (géré par Google).</li>
        </ul>
        <p>
          Le renouvellement est automatique à la fin de la période souscrite, sauf
          désactivation par l&apos;Utilisateur dans les paramètres de son compte Apple/Google ou
          via le portail client Stripe.
        </p>
      </Section>

      <Section title="Article 8 — Résiliation">
        <p>
          L&apos;Utilisateur peut résilier son abonnement à tout moment depuis l&apos;application
          (page <Link href="/settings" className="text-gold underline">Paramètres</Link>) ou
          depuis les réglages de l&apos;App Store / Google Play. La résiliation prend effet à la
          fin de la période de facturation en cours.
        </p>
        <p>
          AQWELIA se réserve le droit de résilier ou suspendre l&apos;accès au Service en cas de
          manquement aux CGU, après notification préalable sauf urgence.
        </p>
      </Section>

      <Section title="Article 9 — Données personnelles (RGPD)">
        <p>
          Le traitement des données personnelles de l&apos;Utilisateur est régi par notre{' '}
          <Link href="/legal/privacy" className="text-gold underline">Politique de
          confidentialité</Link>, conformément au Règlement Général sur la Protection des
          Données (RGPD, UE 2016/679).
        </p>
        <p>
          L&apos;Utilisateur dispose d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          de portabilité et d&apos;opposition. Ces droits peuvent être exercés depuis la page{' '}
          <Link href="/settings" className="text-gold underline">Paramètres</Link> ou par e-mail
          à <a href="mailto:privacy@aqwelia.app" className="text-gold underline">privacy@aqwelia.app</a>.
        </p>
      </Section>

      <Section title="Article 10 — Responsabilité">
        <p>
          AQWELIA met tout en œuvre pour assurer la disponibilité et la fiabilité du Service,
          mais ne peut garantir une absence totale d&apos;erreurs ou d&apos;interruptions.
        </p>
        <p>
          Le Service étant fourni à titre indicatif, AQWELIA ne saurait être tenu responsable
          des dommages directs ou indirects résultant de l&apos;application des recommandations
          (notamment : dommages matériels, pertes de baignade, détérioration d&apos;équipement,
          réactions chimiques). En cas de doute, l&apos;Utilisateur doit consulter un
          professionnel.
        </p>
      </Section>

      <Section title="Article 11 — Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du Service (marque, logo, textes, algorithmes, design,
          guides) est la propriété exclusive d&apos;AQWELIA ou de ses partenaires. Toute
          reproduction, représentation ou diffusion, totale ou partielle, sans autorisation
          écrite préalable est interdite.
        </p>
        <p>
          Les Données saisies par l&apos;Utilisateur restent sa propriété. L&apos;Utilisateur
          accorde à AQWELIA une licence non exclusive d&apos;utilisation de ces Données dans la
          mesure nécessaire à la fourniture et à l&apos;amélioration du Service.
        </p>
      </Section>

      <Section title="Article 12 — Modifications des CGU">
        <p>
          AQWELIA peut modifier les présentes CGU à tout moment. Les CGU applicables sont
          celles en vigueur au moment de l&apos;utilisation du Service. Les modifications
          substantielles seront notifiées par e-mail ou via l&apos;application au moins 30 jours
          avant leur entrée en vigueur.
        </p>
      </Section>

      <Section title="Article 13 — Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit français. En cas de litige, les parties
          s&apos;engagent à rechercher une solution amiable avant toute action judiciaire. À
          défaut d&apos;accord, les tribunaux français seront seuls compétents.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Pour toute question relative aux présentes CGU :{' '}
          <a href="mailto:legal@aqwelia.app" className="text-gold underline">legal@aqwelia.app</a>
        </p>
        <p>
          Pour toute question relative à vos données :{' '}
          <a href="mailto:privacy@aqwelia.app" className="text-gold underline">privacy@aqwelia.app</a>
        </p>
        <p>
          Pour toute demande de support :{' '}
          <Link href="/legal/support" className="text-gold underline">page Support</Link>.
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

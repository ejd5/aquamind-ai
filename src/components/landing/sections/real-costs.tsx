'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const ROWS = [
  { poste: 'Abonnement pisciniste (saisonnier)', low: '500€', high: '1 200€', note: '1 visite/semaine, saison 6 mois' },
  { poste: 'Produits chimiques (chlore, pH, TAC, anti-algues...)', low: '300€', high: '600€', note: 'Souvent en SUS du pisciniste' },
  { poste: 'Électricité (filtration 6-12h/jour)', low: '200€', high: '500€', note: 'Dépend pompe et tarif' },
  { poste: 'Eau (évaporation, renouvellement, backwash)', low: '100€', high: '300€', note: 'Plus cher en région sèche' },
  { poste: 'Chauffage (pompe à chaleur)', low: '300€', high: '800€', note: 'Optionnel mais fréquent' },
  { poste: 'Entretien matériel (sable, cartouche, pièces)', low: '100€', high: '400€', note: 'Renouvellements' },
]

export function RealCosts() {
  return (
    <section id="couts" className="relative py-20 sm:py-28">
      {/* subtle bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/30 via-background to-background" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="02 — Coûts réels"
          title={<>Combien coûte VRAIMENT votre piscine chaque année ?</>}
          subtitle="Les gens sous-estiment massivement le coût réel. Voici les moyennes françaises et européennes (sources : FPP, Aquaguard, études marché 2023-2024)."
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-gold/5">
                    <th className="px-4 py-3.5 font-semibold text-foreground sm:px-6">Poste</th>
                    <th className="px-4 py-3.5 font-semibold text-muted-foreground sm:px-6">Fourchette basse</th>
                    <th className="px-4 py-3.5 font-semibold text-muted-foreground sm:px-6">Fourchette haute</th>
                    <th className="hidden px-4 py-3.5 font-semibold text-muted-foreground sm:table-cell sm:px-6">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <motion.tr
                      key={r.poste}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.06 }}
                      className="border-b border-border/40 transition-colors hover:bg-gold/5"
                    >
                      <td className="px-4 py-3.5 font-medium sm:px-6">{r.poste}</td>
                      <td className="px-4 py-3.5 text-muted-foreground sm:px-6">{r.low}</td>
                      <td className="px-4 py-3.5 text-muted-foreground sm:px-6">{r.high}</td>
                      <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell sm:px-6">{r.note}</td>
                    </motion.tr>
                  ))}
                  <motion.tr
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-gradient-to-r from-primary/10 via-gold/10 to-primary/10 font-bold"
                  >
                    <td className="px-4 py-4 text-foreground sm:px-6">TOTAL annuel</td>
                    <td className="px-4 py-4 text-foreground sm:px-6">1 500€</td>
                    <td className="px-4 py-4 text-foreground sm:px-6">3 800€</td>
                    <td className="hidden px-4 py-4 text-xs font-semibold text-foreground sm:table-cell sm:px-6">
                      Moyenne ~2 500€/an
                    </td>
                  </motion.tr>
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Callout */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-6"
        >
          <motion.div
            variants={fadeUpVariants}
            className="rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/10 to-transparent p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>Sans compter les coups durs :</strong> eau verte (80€ de produits + 2 jours),
                électrolyseur en panne (150€ déplacement pro), fuite (300-2000€).
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Reveal, SectionHeading } from '../landing-utils'

export function Story() {
  return (
    <section id="histoire" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="08 — Notre histoire"
          title={<>Conçu par des propriétaires, pour des propriétaires.</>}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/70 via-white/50 to-white/30 p-8 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] sm:p-10">
            <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            {/* Etymology signature — AQWELIA = Aqua + Well + IA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative mb-8 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 px-6 py-4 text-center"
            >
              <span className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                AQWELIA
              </span>
              <span className="text-gold">=</span>
              <span className="text-sm font-semibold text-foreground/80 sm:text-base">
                <span className="text-primary">AQ</span>
                <span className="text-muted-foreground"> (aqua)</span>
                <span className="mx-1 text-gold">·</span>
                <span className="text-ocean-light">WEL</span>
                <span className="text-muted-foreground"> (well)</span>
                <span className="mx-1 text-gold">·</span>
                <span className="text-gold">IA</span>
                <span className="text-muted-foreground"> (intelligence)</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative space-y-5 font-display text-lg leading-relaxed text-foreground/90 sm:text-xl"
            >
              <p>
                « Trois racines, une promesse&nbsp;: une eau qui va bien, pilotée par l&apos;IA. »
              </p>
              <p>
                « Après 15 ans, 3 piscines différentes (béton, coque, hors-sol), 2 électrolyseurs,
                un filtre à sable et un à cartouche, des centaines de tests, des dizaines de
                mauvaises surprises — on a craqué. »
              </p>
              <p>
                « On a tout essayé : le pisciniste cher qui vient une fois par semaine, les apps
                basiques qui disent &ldquo;ajoutez du chlore&rdquo;, les forums, les vidéos YouTube à 23h. »
              </p>
              <p>
                « Rien ne répondait à la seule question qui compte :{' '}
                <span className="gradient-text-premium font-bold">
                  &ldquo;LÀ, maintenant, avec MES mesures, MA piscine, MA météo, qu&apos;est-ce que je fais,
                  dans quel ordre, et quand est-ce que je peux me baigner ?&rdquo;
                </span>{' '}
                »
              </p>
              <p>
                « AQWELIA est né de cette frustration. Pas par une équipe de marketers. Par des
                utilisateurs assidus qui en avaient marre de l&apos;eau verte. »
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative mt-6 text-right text-sm uppercase tracking-widest text-gold"
            >
              — L&apos;équipe AQWELIA
            </motion.p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const FAQ = [
  {
    q: 'AQWELIA remplace-t-elle le pisciniste ?',
    a: "Non. Elle le complète. Le pisciniste vient 1 fois/semaine ; AQWELIA couvre les 6 autres jours, gère les urgences, et vous apprend à comprendre votre piscine. Beaucoup d'utilisateurs gardent un pisciniste + AQWELIA.",
  },
  {
    q: 'L\'IA peut-elle se tromper ?',
    a: "L'IA est prudente et affiche toujours un niveau de confiance. Les calculs de dosage critiques ne sont PAS faits par l'IA mais par un moteur déterministe. En cas de doute, AQWELIA dit « consultez un professionnel ».",
  },
  {
    q: 'Puis-je utiliser AQWELIA sans pisciniste ?',
    a: "Oui, c'est même le cas le plus fréquent. L'app vous guide pas à pas comme le ferait un bon pisciniste.",
  },
  {
    q: 'Mes données sont-elles privées ?',
    a: 'Oui, 100%. Aucune revente. Vos photos et mesures restent les vôtres.',
  },
  {
    q: 'L\'application fonctionne-t-elle hors-ligne ?',
    a: "Le mode web nécessite une connexion. L'app mobile native (à venir) aura un mode offline pour les tests et le carnet.",
  },
  {
    q: 'AQWELIA gère-t-elle les spas ?',
    a: 'Oui ! AQWELIA gère les spas avec des spécificités dédiées : traitement au brome ou oxygène actif (pas de chlore en eau chaude), surveillance de la température, rappels de vidange, bâchage anti-évaporation, programmes de filtration adaptés. Le support spa est disponible à partir du plan Premium.',
  },
  {
    q: 'Et si j\'ai plusieurs piscines ?',
    a: 'Le plan Premium permet 3 piscines, le plan Expert est illimité (pour piscinistes pro).',
  },
  {
    q: 'Puis-je annuler à tout moment ?',
    a: 'Oui, sans engagement. Aucun frais caché.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="12 — FAQ" title={<>Questions fréquentes</>} />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10"
        >
          <motion.div variants={fadeUpVariants}>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="rounded-xl border border-white/40 bg-white/50 px-4 backdrop-blur-xl transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] data-[state=open]:border-gold/40 data-[state=open]:bg-white/70 mb-2.5"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline sm:text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </motion.div>

        <Reveal delay={0.1} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Une autre question ? Écrivez-nous :{' '}
            <a
              href="mailto:contact@aqwelia.app"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact@aqwelia.app
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

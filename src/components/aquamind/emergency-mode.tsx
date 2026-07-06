'use client'

import { useState } from 'react'
import {
  Siren,
  Waves,
  CloudRain,
  Plane,
  Wind,
  Eye,
  Sparkles,
  Droplet,
  Beaker,
  Gauge,
  Snowflake,
  Power,
  X,
  ArrowRight,
  Camera,
  FlaskConical,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TabId } from './app-shell'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAskAssistant: (q: string) => void
  onNavigate: (tab: TabId) => void
}

interface Emergency {
  id: string
  label: string
  icon: typeof Siren
  color: string
  prompt: string
  checklist: { title: string; steps: string[]; photoHint?: string; measureHint?: string[] }
}

const EMERGENCIES: Emergency[] = [
  {
    id: 'green_water',
    label: 'Eau verte',
    icon: Waves,
    color: 'from-[oklch(0.55_0.18_155)] to-[oklch(0.4_0.13_155)]',
    prompt: "Mon eau est devenue verte, aide-moi à identifier la cause et à la traiter étape par étape.",
    checklist: {
      title: 'Eau verte — protocole anti-algues',
      steps: [
        'Vérifier le pH (cible 7.0–7.4) : si hors plage, ajuster avant tout.',
        'Vérifier le chlore libre : souvent trop bas (< 1 mg/L).',
        'Vérifier le CYA (stabilisant) : si > 60, le chlore est bloqué → diluer.',
        'Brosser les parois et le fond pour décoller les algues.',
        'Faire un traitement choc chlore après équilibrage du pH.',
        'Mettre en filtration continue 24-48h.',
        'Ajouter un anti-algues si besoin.',
        'Re-tester après 24h.',
      ],
      photoHint: 'Photographiez la surface de l\'eau et une paroi pour confirmer la présence d\'algues.',
      measureHint: ['pH', 'freeChlorine', 'alkalinity', 'cyanuricAcid'],
    },
  },
  {
    id: 'cloudy_water',
    label: 'Eau trouble',
    icon: Droplet,
    color: 'from-[oklch(0.7_0.05_195)] to-[oklch(0.55_0.1_195)]',
    prompt: "Mon eau est trouble mais pas verte. Aide-moi à trouver la cause et à la clarifier.",
    checklist: {
      title: 'Eau trouble — diagnostic clarté',
      steps: [
        'Mesurer le pH (un pH trop haut trouble l\'eau).',
        'Vérifier le chlore libre et combiné (chloramines = trouble).',
        'Vérifier la filtration (pression, lavage du filtre).',
        'Vérifier le TH (dureté) : un TH bas peut rendre l\'eau laiteuse.',
        'Si filtre encrassé : contre-lavage ou floculant.',
        'Re-tester après filtration 12-24h.',
      ],
      photoHint: 'Photographiez l\'eau de surface et le manomètre du filtre.',
      measureHint: ['ph', 'freeChlorine', 'combinedChlorine', 'calciumHardness'],
    },
  },
  {
    id: 'after_storm',
    label: 'Après orage',
    icon: CloudRain,
    color: 'from-[oklch(0.55_0.1_240)] to-[oklch(0.4_0.12_240)]',
    prompt: "Mon piscine vient de subir un orage (pluie, chaleur, débris). Aide-moi à la remettre en état.",
    checklist: {
      title: 'Après orage — remise en état',
      steps: [
        'Skimmer et écrémer les débris en surface.',
        'Vérifier et videz le panier du préfiltre pompe.',
        'Mesurer le pH (la pluie acidifie souvent l\'eau).',
        'Mesurer le chlore libre (souvent dilué par la pluie).',
        'Faire un traitement choc si le chlore est < 1 mg/L.',
        'Laisser filtration continue 24h.',
      ],
      photoHint: 'Photographiez la surface pour vérifier débris et couleur.',
      measureHint: ['ph', 'freeChlorine', 'alkalinity'],
    },
  },
  {
    id: 'back_from_vacation',
    label: 'Retour de vacances',
    icon: Plane,
    color: 'from-[oklch(0.65_0.1_60)] to-[oklch(0.5_0.12_60)]',
    prompt: "Je reviens de vacances, ma piscine a tourné plusieurs semaines sans entretien. Comment la remettre en service ?",
    checklist: {
      title: 'Retour de vacances — remise en service',
      steps: [
        'Skimmer, écrémer, aspirer le fond.',
        'Vérifier la pompe et le filtre (lavage complet).',
        'Mesurer pH, chlore, TAC, CYA.',
        'Ajuster le pH en premier (cible 7.2).',
        'Faire un traitement choc chlore.',
        'Filtration continue 48h.',
        'Re-tester après 24-48h.',
      ],
      photoHint: 'Photographiez l\'eau et le fond de la piscine.',
      measureHint: ['ph', 'freeChlorine', 'alkalinity', 'cyanuricAcid'],
    },
  },
  {
    id: 'chlorine_smell',
    label: 'Odeur forte chlore',
    icon: Wind,
    color: 'from-[oklch(0.7_0.13_85)] to-[oklch(0.55_0.13_85)]',
    prompt: "Mon piscine sent très fort le chlore, et pourtant le chlore libre est normal. Que se passe-t-il ?",
    checklist: {
      title: 'Odeur forte = chloramines',
      steps: [
        'Mesurer chlore libre ET chlore total (combiné = total - libre).',
        'Si chlore combiné > 0.4 mg/L : ce sont les chloramines qui sentent.',
        'NE PAS rajouter du chlore lent : cela aggrave.',
        'Faire un traitement choc pour casser les chloramines.',
        'Vérifier le pH avant le choc.',
        'Baignade interdite pendant 8h après le choc.',
      ],
      measureHint: ['ph', 'freeChlorine', 'totalChlorine', 'combinedChlorine'],
    },
  },
  {
    id: 'stinging_eyes',
    label: 'Yeux qui piquent',
    icon: Eye,
    color: 'from-[oklch(0.65_0.15_15)] to-[oklch(0.5_0.16_15)]',
    prompt: "Les baigneurs ont les yeux qui piquent et la peau irritée. Est-ce le pH ou le chlore ?",
    checklist: {
      title: 'Irritations — pH ou chloramines ?',
      steps: [
        'Mesurer le pH en priorité (pH < 7 ou > 7.6 irrite).',
        'Mesurer le chlore libre (trop haut irrite).',
        'Mesurer le chlore combiné (chloramines irritent).',
        'Si pH hors plage : ajuster en priorité.',
        'Si chloramines : traitement choc.',
        'Si chlore libre > 4 : attendre qu\'il baisse, ne pas se baigner.',
      ],
      measureHint: ['ph', 'freeChlorine', 'totalChlorine', 'combinedChlorine'],
    },
  },
  {
    id: 'wall_algae',
    label: 'Algues sur parois',
    icon: Sparkles,
    color: 'from-[oklch(0.55_0.18_155)] to-[oklch(0.4_0.13_155)]',
    prompt: "J'ai des algues qui se form sur les parois de la piscine. Comment les éliminer durablement ?",
    checklist: {
      title: 'Algues sur parois',
      steps: [
        'Brosser vigoureusement parois et fond.',
        'Vérifier le pH et l\'ajuster.',
        'Vérifier le chlore libre (trop bas = algues).',
        'Vérifier le CYA (trop haut = chlore bloqué).',
        'Faire un traitement choc + anti-algues.',
        'Filtration continue 24-48h.',
        'Aspirer les dépôts après traitement.',
      ],
      photoHint: 'Photographiez les parois touchées.',
      measureHint: ['ph', 'freeChlorine', 'cyanuricAcid', 'phosphates'],
    },
  },
  {
    id: 'unstable_ph',
    label: 'pH instable',
    icon: Beaker,
    color: 'from-[oklch(0.7_0.13_85)] to-[oklch(0.55_0.13_195)]',
    prompt: "Mon pH ne tient pas, il remonte ou descend tout le temps. Comment le stabiliser ?",
    checklist: {
      title: 'pH instable — régler le TAC',
      steps: [
        'Mesurer l\'alcalinité (TAC) : c\'est elle qui stabilise le pH.',
        'Si TAC < 80 : ajouter TAC+ pour monter à 100-120 mg/L.',
        'Attendre 24h après ajustement du TAC avant de toucher au pH.',
        'Re-mesurer le pH et l\'ajuster (cible 7.2).',
        'Vérifier l\'aération / cascade : un fort brassage fait monter le pH.',
      ],
      measureHint: ['ph', 'alkalinity', 'calciumHardness'],
    },
  },
  {
    id: 'zero_chlorine',
    label: 'Chlore à zéro',
    icon: Power,
    color: 'from-destructive to-[oklch(0.4_0.18_25)]',
    prompt: "Mon chlore libre est à 0 mg/L. Comment le remonter sans danger ?",
    checklist: {
      title: 'Chlore à zéro — désinfection',
      steps: [
        'Vérifier le pH : si > 7.6, le chlore est inefficace.',
        'Faire un traitement choc chlore (après pH ajusté).',
        'Ajouter du chlore lent pour maintenir un résidu.',
        'Vérifier le CYA : si < 30, le soleil détruit le chlore.',
        'Filtration continue 12-24h.',
        'Baignade interdite jusqu\'à chlore libre > 1 mg/L.',
      ],
      measureHint: ['ph', 'freeChlorine', 'cyanuricAcid'],
    },
  },
  {
    id: 'too_much_chlorine',
    label: 'Trop de chlore',
    icon: Gauge,
    color: 'from-[oklch(0.7_0.16_60)] to-[oklch(0.55_0.18_40)]',
    prompt: "Mon chlore libre est trop élevé (> 5 mg/L). Comment le faire baisser ?",
    checklist: {
      title: 'Surchloration — faire baisser le chlore',
      steps: [
        'NE PAS rajouter de chlore ni de stabilisant.',
        'Couvrir la piscine n\'accélère pas la baisse : au contraire, laisser à l\'air.',
        'Si pas urgent : attendre (le soleil dégrade le chlore libre en 24-48h).',
        'Si très élevé (> 10) : dilution partielle (renouveler 20-30%).',
        'Il existe du neutraliseur de chlore (thiosulfate) : à doser avec précaution.',
        'Baignade interdite jusqu\'à chlore < 4 mg/L.',
      ],
      measureHint: ['ph', 'freeChlorine', 'cyanuricAcid'],
    },
  },
  {
    id: 'filter_high_pressure',
    label: 'Filtre pression haute',
    icon: Gauge,
    color: 'from-[oklch(0.65_0.16_60)] to-[oklch(0.5_0.16_40)]',
    prompt: "Le manomètre de mon filtre affiche une pression élevée. Que faire ?",
    checklist: {
      title: 'Pression filtre haute',
      steps: [
        'Faire un contre-lavage (backwash) : 2-3 minutes jusqu\'à eau claire.',
        'Rincer (rinse) 30 secondes pour remettre le sable en place.',
        'Si pression toujours haute : le média filtrant est peut-être à changer.',
        'Vérifier que les vannes sont bien ouvertes.',
        'Noter la date du dernier lavage pour suivi.',
      ],
      photoHint: 'Photographiez le manomètre du filtre.',
    },
  },
  {
    id: 'electrolyzer_error',
    label: 'Électrolyseur erreur',
    icon: Power,
    color: 'from-[oklch(0.65_0.16_30)] to-[oklch(0.5_0.16_25)]',
    prompt: "Mon électrolyseur au sel affiche un code erreur. Quelles sont les causes possibles ?",
    checklist: {
      title: 'Erreur électrolyseur',
      steps: [
        'Vérifier la tension d\'alimentation (disjoncteur).',
        'Mesurer le sel : si < 4 g/L, la cellule ne produit pas.',
        'Vérifier le débit d\'eau (circuit primaire).',
        'Inspecter la cellule : si entartrée, détartrer dans acide dilué.',
        'Vérifier le pH (un pH haut accélère l\'entartrage).',
        'Consulter le manuel pour le code exact.',
      ],
      photoHint: 'Photographiez l\'afficheur de l\'électrolyseur et la cellule.',
      measureHint: ['ph', 'salt'],
    },
  },
  {
    id: 'startup',
    label: 'Remise en route',
    icon: Power,
    color: 'from-[oklch(0.65_0.13_195)] to-[oklch(0.5_0.13_195)]',
    prompt: "C'est le printemps, je remets ma piscine en service après l'hiver. Donne-moi le protocole complet.",
    checklist: {
      title: 'Remise en route (printemps)',
      steps: [
        'Retirer la bâche d\'hivernage, la nettoyer et la sécher.',
        'Retirer les flotteurs/gizmos d\'hivernage.',
        'Rebrancher la pompe et remettre les vannes en position été.',
        'Vérifier le niveau d\'eau, compléter si besoin.',
        'Faire un contre-lavage du filtre.',
        'Mesurer pH, chlore, TAC, CYA, sel.',
        'Ajuster le pH, puis le TAC, puis traitement choc.',
        'Mettre en filtration continue 24-48h.',
      ],
      measureHint: ['ph', 'freeChlorine', 'alkalinity', 'cyanuricAcid', 'salt'],
    },
  },
  {
    id: 'winterizing',
    label: 'Hivernage',
    icon: Snowflake,
    color: 'from-[oklch(0.7_0.06_240)] to-[oklch(0.5_0.08_240)]',
    prompt: "Je veux hiverner correctement ma piscine pour l'hiver. Donne-moi le protocole actif/passif.",
    checklist: {
      title: 'Hivernage piscine',
      steps: [
        'Attendre eau < 12-15°C pour démarrer.',
        'Faire un dernier nettoyage fond/surface.',
        'Ajuster pH à 7.2-7.4.',
        'Faire un traitement choc chlore.',
        'Ajouter produit d\'hivernage (anti-algues, anticalcaire).',
        'Baisser le niveau d\'eau sous les skimmers (10-15 cm).',
        'Vider les canalisations, mettre gizmos et flotteurs.',
        'Couper pompe (hivernage passif) ou laisser tourner (actif, > 0°C).',
        'Couvrir avec bâche d\'hivernage.',
      ],
      measureHint: ['ph', 'freeChlorine', 'alkalinity', 'temperature'],
    },
  },
]

export function EmergencyMode({ open, onOpenChange, onAskAssistant, onNavigate }: Props) {
  const [selected, setSelected] = useState<Emergency | null>(null)

  function closeAll() {
    setSelected(null)
    onOpenChange(false)
  }

  function ask(em: Emergency) {
    onAskAssistant(em.prompt)
    closeAll()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeAll(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {!selected ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-[oklch(0.4_0.18_25)] shadow-md shadow-destructive/30">
                  <Siren className="h-5 w-5 text-white" />
                </span>
                J'ai un problème
              </DialogTitle>
              <DialogDescription>
                Sélectionnez votre situation : AquaMind propose un protocole guidé et peut préparer
                une question pour l'assistant IA.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EMERGENCIES.map((em) => {
                const Icon = em.icon
                return (
                  <button
                    key={em.id}
                    onClick={() => setSelected(em)}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border/50 bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${em.color} text-white shadow-sm`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold leading-tight">{em.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              En cas de danger électrique, fuite, irritation grave ou incapacité à traiter,
              contactez un professionnel.
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${selected.color} text-white shadow-md`}>
                  <selected.icon className="h-5 w-5" />
                </span>
                {selected.label}
              </DialogTitle>
              <DialogDescription>{selected.checklist.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Steps */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Protocole pas à pas
                </p>
                <ol className="space-y-1.5">
                  {selected.checklist.steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 p-2.5 text-sm"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Photo recommendation */}
              {selected.checklist.photoHint && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <Camera className="h-3.5 w-3.5" />
                    Photo recommandée
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">{selected.checklist.photoHint}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onNavigate('diagnostic')
                      closeAll()
                    }}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Aller au diagnostic photo
                  </Button>
                </div>
              )}

              {/* Measurements recommendation */}
              {selected.checklist.measureHint && selected.checklist.measureHint.length > 0 && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Mesures à saisir
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.checklist.measureHint.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onNavigate('water')
                      closeAll()
                    }}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    Saisir mes mesures
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                <Button
                  onClick={() => ask(selected)}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  Aller à l'assistant
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                  Retour
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

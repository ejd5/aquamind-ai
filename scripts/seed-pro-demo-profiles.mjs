import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../generated/client-postgresql')

if (!process.env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error('A PostgreSQL DATABASE_URL is required')
}

const prisma = new PrismaClient()
const now = new Date()
const DAY = 24 * 60 * 60 * 1000

const OWNER_HASHES = {
  solo: '9e9e28fa634b338a89f7e4521d18d473:1b170f47bcc0991a2528a82a66ee676038e60842c4dfe47a9b2889abc9470be41e971524e9ca0b40f5225ea255da4c9b646194c3d2c03b7784d0d81a36182ffb',
  team: '8d3c2b63cfa3a098507b6ca9a2f19a1d:8604ef0b8b2c124d44f36b0656a17d48c5bf5dec5204795a9044d9538587c127349ba84f8e004522733d92e2d15a3be447da5fba0be6d4862d598947f80f80e7',
  fleet: 'c31d9b195125339b5ace6a0a6bc17235:e4e0f5fe7b8ff2d75d8faa4b39af0df53714f4f9207479e668877ad3fea8bc9fb5caba59341199147bcd904861d0b10fc4023116547e3a1a8ac0c91aab926902',
  enterprise: '4acf47826ac8c3c9ebe06bbd4a9cda54:f12a7405aecac5105c4581beb15a0cf1525b9cd744a882d2ef1a94981f57d6defbe35887073909afd8f7ca0a71db20513fcd843a7df6878b729e8386588e71d3',
}

const TECH_HASH = '262486754dce676fee7a9a318c2d2963:3fff329046df01215fa3ea95c9a04bdb374b3df03f71e6e15b8d0b9bc37c59e001702e308b56929a30a1fc3b21dd9ef283725b4a1d793291998837907d20e1d6'

const DEMOS = [
  {
    key: 'solo',
    email: 'pro.solo.demo@aqwelia.test',
    name: 'Démo AQWELIA Pro Solo',
    company: 'Piscines Calanques — Solo',
    plan: 'pro_solo',
    city: 'Cassis',
    zipCode: '13260',
    clients: 12,
    prospects: 3,
    paused: 1,
    archived: 0,
    pools: 12,
    technicians: 1,
    interventions: 28,
    tests: 24,
    reminders: 8,
    inventory: 7,
  },
  {
    key: 'team',
    email: 'pro.team.demo@aqwelia.test',
    name: 'Démo AQWELIA Pro Team',
    company: 'Azur Piscines Services — Team',
    plan: 'pro_team',
    city: 'Aix-en-Provence',
    zipCode: '13100',
    clients: 36,
    prospects: 7,
    paused: 3,
    archived: 1,
    pools: 42,
    technicians: 4,
    interventions: 90,
    tests: 72,
    reminders: 18,
    inventory: 10,
  },
  {
    key: 'fleet',
    email: 'pro.fleet.demo@aqwelia.test',
    name: 'Démo AQWELIA Pro Fleet',
    company: 'Riviera Pool Fleet — Fleet',
    plan: 'pro_fleet',
    city: 'Cannes',
    zipCode: '06400',
    clients: 90,
    prospects: 15,
    paused: 7,
    archived: 3,
    pools: 110,
    technicians: 10,
    interventions: 240,
    tests: 180,
    reminders: 38,
    inventory: 15,
  },
  {
    key: 'enterprise',
    email: 'pro.enterprise.demo@aqwelia.test',
    name: 'Démo AQWELIA Pro Enterprise',
    company: 'Méditerranée Piscines Réseau — Enterprise',
    plan: 'pro_enterprise',
    city: 'Marseille',
    zipCode: '13008',
    clients: 180,
    prospects: 28,
    paused: 14,
    archived: 6,
    pools: 230,
    technicians: 24,
    interventions: 520,
    tests: 360,
    reminders: 72,
    inventory: 20,
  },
]

const FIRST_NAMES = ['Camille', 'Thomas', 'Sofia', 'Julien', 'Nora', 'Lucas', 'Emma', 'Hugo', 'Inès', 'Gabriel', 'Léa', 'Arthur', 'Chloé', 'Nicolas', 'Sarah', 'Maxime', 'Julie', 'Antoine', 'Clara', 'Romain']
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Girard', 'Bonnet']
const CITIES = [
  ['Marseille', '13008'], ['Aix-en-Provence', '13100'], ['Cassis', '13260'], ['La Ciotat', '13600'],
  ['Toulon', '83000'], ['Hyères', '83400'], ['Cannes', '06400'], ['Antibes', '06600'],
  ['Nice', '06000'], ['Mougins', '06250'], ['Saint-Tropez', '83990'], ['Aubagne', '13400'],
]
const SOURCES = ['recommandation', 'site_web', 'appel_entrant', 'partenaire', 'salon', 'growth_os']
const TAGS = ['contrat annuel', 'résidence secondaire', 'spa', 'urgence', 'premium', 'collectivité', 'location saisonnière']
const ACTIVITY_TYPES = ['call', 'email', 'sms', 'visit', 'follow_up', 'note']
const INTERVENTION_TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency']
const SKILLS = ['entretien', 'hydraulique', 'électricité', 'traitement eau', 'spa', 'rénovation', 'domotique']
const VEHICLES = ['Renault Trafic', 'Ford Transit', 'Peugeot Expert', 'Citroën Jumpy', 'Toyota Proace']
const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#ec4899', '#6366f1']
const PRODUCT_NAMES = [
  ['pH Minus granulés', 'ph_minus', 'kg'],
  ['pH Plus poudre', 'ph_plus', 'kg'],
  ['Chlore lent 250 g', 'chlorine_slow', 'kg'],
  ['Chlore choc', 'chlorine_shock', 'kg'],
  ['Sel piscine', 'salt', 'kg'],
  ['TAC Plus', 'alkalinity_plus', 'kg'],
  ['Stabilisant', 'stabilizer', 'kg'],
  ['Floculant liquide', 'flocculant', 'L'],
  ['Anti-algues', 'anti_algae', 'L'],
  ['Nettoyant filtre', 'filter_cleaner', 'L'],
]

function dateFromNow(days, hours = 0) {
  return new Date(now.getTime() + days * DAY + hours * 60 * 60 * 1000)
}

function id(prefix, index) {
  return `${prefix}_${String(index + 1).padStart(4, '0')}`
}

function clientStatus(config, index) {
  if (index < config.prospects) return 'prospect'
  if (index >= config.clients - config.archived) return 'archived'
  if (index >= config.clients - config.archived - config.paused) return 'paused'
  return 'active'
}

function interventionStatus(scheduledAt, index) {
  if (index % 29 === 0) return 'cancelled'
  if (scheduledAt > now) return 'scheduled'
  if (index % 23 === 0) return 'in_progress'
  return 'completed'
}

function valuesForTest(index) {
  const warning = index % 7 === 0
  return {
    ph: warning ? 7.75 : 7.2 + (index % 4) * 0.05,
    freeChlorine: warning ? 0.7 : 1.4 + (index % 5) * 0.2,
    totalChlorine: warning ? 1.2 : 1.7 + (index % 4) * 0.2,
    alkalinity: 85 + (index % 6) * 8,
    calciumHardness: 180 + (index % 8) * 20,
    cyanuricAcid: 25 + (index % 5) * 8,
    salt: index % 3 === 0 ? 4.2 + (index % 4) * 0.1 : null,
    phosphates: 0.08 + (index % 5) * 0.03,
    temperature: 23 + (index % 9),
    clearWaterIndex: warning ? 62 : 82 + (index % 16),
    notes: warning ? 'Contrôle nécessaire : équilibre à corriger.' : 'Eau claire, paramètres contrôlés.',
  }
}

async function clearDemo(owner) {
  await prisma.organization.deleteMany({ where: { ownerId: owner.id, type: 'pro' } })
  await prisma.proClient.deleteMany({ where: { proUserId: owner.id } })
  await prisma.subscription.deleteMany({ where: { userId: owner.id } })
  await prisma.reminder.deleteMany({ where: { userId: owner.id } })
  await prisma.productInventory.deleteMany({ where: { userId: owner.id } })
  await prisma.maintenanceTask.deleteMany({ where: { userId: owner.id } })
}

async function seedDemo(config) {
  const owner = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      name: config.name,
      passwordHash: OWNER_HASHES[config.key],
      role: 'pro',
      locale: 'fr',
      country: 'FR',
      timezone: 'Europe/Paris',
      consentMarketing: false,
      consentAnalytics: true,
      consentEmail: true,
    },
    create: {
      email: config.email,
      name: config.name,
      passwordHash: OWNER_HASHES[config.key],
      role: 'pro',
      locale: 'fr',
      country: 'FR',
      timezone: 'Europe/Paris',
      consentMarketing: false,
      consentAnalytics: true,
      consentEmail: true,
    },
  })

  await clearDemo(owner)

  await prisma.subscription.create({
    data: {
      userId: owner.id,
      plan: config.plan,
      status: 'active',
      active: true,
      duration: 'year',
      store: 'web',
      startedAt: dateFromNow(-30),
      currentPeriodStart: dateFromNow(-30),
      currentPeriodEnd: dateFromNow(335),
      expiresAt: dateFromNow(335),
    },
  })

  const organization = await prisma.organization.create({
    data: {
      type: 'pro',
      name: config.company,
      legalName: config.company,
      siret: `DEMO${config.key.toUpperCase().padEnd(10, '0')}`.slice(0, 14),
      address: '12 avenue des Eaux Claires',
      city: config.city,
      zipCode: config.zipCode,
      country: 'FR',
      phone: '+33491000000',
      email: config.email,
      website: `https://${config.key}.demo.aqwelia.test`,
      plan: config.plan,
      status: 'active',
      ownerId: owner.id,
    },
  })

  const technicians = [owner]
  for (let index = 1; index < config.technicians; index += 1) {
    const firstName = FIRST_NAMES[(index * 3) % FIRST_NAMES.length]
    const lastName = LAST_NAMES[(index * 5) % LAST_NAMES.length]
    const email = `pro.${config.key}.tech${String(index).padStart(2, '0')}.demo@aqwelia.test`
    const tech = await prisma.user.upsert({
      where: { email },
      update: {
        name: `${firstName} ${lastName}`,
        passwordHash: TECH_HASH,
        role: 'pro',
        locale: 'fr',
        country: 'FR',
        timezone: 'Europe/Paris',
      },
      create: {
        email,
        name: `${firstName} ${lastName}`,
        passwordHash: TECH_HASH,
        role: 'pro',
        locale: 'fr',
        country: 'FR',
        timezone: 'Europe/Paris',
      },
    })
    technicians.push(tech)
  }

  await prisma.organizationMember.createMany({
    data: technicians.map((technician, index) => ({
      organizationId: organization.id,
      userId: technician.id,
      role: index === 0 ? 'owner' : index === 1 && config.technicians > 4 ? 'manager' : 'technician',
      status: 'active',
      dispatchEnabled: true,
      skills: JSON.stringify(SKILLS.slice(index % 3, Math.min(SKILLS.length, index % 3 + 4))),
      serviceZones: JSON.stringify(CITIES.slice(index % 5, index % 5 + 3).map(([city]) => city)),
      workingDays: JSON.stringify(index % 4 === 0 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6]),
      dayStart: index % 3 === 0 ? '07:30' : '08:00',
      dayEnd: index % 3 === 0 ? '16:30' : '18:00',
      timeZone: 'Europe/Paris',
      dailyCapacityMinutes: index === 0 ? 420 : 480,
      dispatchColor: COLORS[index % COLORS.length],
      phone: `+33655${String(config.technicians).padStart(2, '0')}${String(index).padStart(4, '0')}`,
      vehicle: VEHICLES[index % VEHICLES.length],
    })),
  })

  const clientRows = []
  for (let index = 0; index < config.clients; index += 1) {
    const [city, zipCode] = CITIES[index % CITIES.length]
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
    const lastName = LAST_NAMES[(index * 7) % LAST_NAMES.length]
    const status = clientStatus(config, index)
    clientRows.push({
      id: id(`pro_demo_${config.key}_client`, index),
      proUserId: owner.id,
      firstName,
      lastName,
      companyName: index % 9 === 0 ? `Résidence ${lastName}` : index % 17 === 0 ? `Hôtel ${city} Azur` : null,
      email: `${config.key}.client.${String(index + 1).padStart(3, '0')}@example.test`,
      phone: `+33670${String(index + 1).padStart(6, '0')}`,
      address: `${10 + index} chemin des Pins`,
      city,
      zipCode,
      status,
      source: SOURCES[index % SOURCES.length],
      preferredContact: ['email', 'phone', 'sms', 'whatsapp'][index % 4],
      tags: JSON.stringify([TAGS[index % TAGS.length], TAGS[(index + 3) % TAGS.length]]),
      lastContactAt: status === 'prospect' ? dateFromNow(-(index % 8) - 1) : dateFromNow(-(index % 20)),
      nextFollowUpAt: status === 'prospect' ? dateFromNow((index % 7) - 2) : index % 5 === 0 ? dateFromNow(index % 12) : null,
      notes: status === 'prospect'
        ? 'Prospect fictif à qualifier. Besoin et budget à confirmer.'
        : 'Client fictif de démonstration AQWELIA Pro.',
      createdAt: dateFromNow(-(index % 160) - 10),
      updatedAt: dateFromNow(-(index % 12)),
    })
  }
  await prisma.proClient.createMany({ data: clientRows })

  const activityRows = []
  for (let index = 0; index < config.clients; index += 1) {
    const activityCount = clientRows[index].status === 'prospect' ? 2 : 3
    for (let activityIndex = 0; activityIndex < activityCount; activityIndex += 1) {
      const type = ACTIVITY_TYPES[(index + activityIndex) % ACTIVITY_TYPES.length]
      activityRows.push({
        id: `pro_demo_${config.key}_activity_${String(index).padStart(4, '0')}_${activityIndex}`,
        proClientId: clientRows[index].id,
        actorUserId: technicians[(index + activityIndex) % technicians.length].id,
        type,
        title: type === 'call' ? 'Appel de suivi' : type === 'email' ? 'Email envoyé' : type === 'visit' ? 'Visite technique' : type === 'follow_up' ? 'Relance programmée' : 'Mise à jour du dossier',
        details: `Activité fictive ${activityIndex + 1} pour tester la chronologie CRM.`,
        occurredAt: dateFromNow(-((index + activityIndex * 3) % 60), -(activityIndex + 1)),
        createdAt: dateFromNow(-((index + activityIndex * 3) % 60), -(activityIndex + 1)),
      })
    }
  }
  await prisma.proClientActivity.createMany({ data: activityRows })

  const activeClients = clientRows.filter((client) => client.status === 'active' || client.status === 'paused')
  const poolRows = []
  for (let index = 0; index < config.pools; index += 1) {
    const client = activeClients[index % activeClients.length]
    const secondPool = index >= activeClients.length
    poolRows.push({
      id: id(`pro_demo_${config.key}_pool`, index),
      proClientId: client.id,
      name: secondPool ? (index % 4 === 0 ? 'Spa extérieur' : 'Bassin secondaire') : 'Piscine principale',
      type: secondPool && index % 4 === 0 ? 'spa' : 'pool',
      status: index % 19 === 0 ? 'seasonal' : 'active',
      volume: secondPool && index % 4 === 0 ? 2.2 : 28 + (index % 9) * 5,
      unit: 'm3',
      shape: ['rectangular', 'free', 'round', 'oval'][index % 4],
      surface: ['liner', 'shell', 'tile', 'concrete'][index % 4],
      treatmentType: ['chlorine', 'salt', 'bromine'][index % 3],
      saltSystem: index % 3 === 1,
      filterType: ['sand', 'cartridge', 'glass', 'diatom'][index % 4],
      brand: ['AstralPool', 'Hayward', 'Zodiac', 'Pentair'][index % 4],
      model: `AQ-${100 + (index % 25)}`,
      serialNumber: `DEMO-${config.key.toUpperCase()}-${String(index + 1).padStart(5, '0')}`,
      installedAt: dateFromNow(-365 * (1 + (index % 10))),
      address: client.address,
      accessInstructions: index % 6 === 0 ? 'Portail latéral, prévenir 15 minutes avant.' : 'Accès par le jardin principal.',
      equipmentNotes: 'Pompe, filtre et traitement vérifiés lors de la dernière visite.',
      lastServiceAt: dateFromNow(-(index % 21)),
      nextServiceAt: dateFromNow(1 + (index % 14)),
      notes: 'Bassin fictif de démonstration.',
      createdAt: dateFromNow(-(index % 300) - 20),
      updatedAt: dateFromNow(-(index % 14)),
    })
  }
  await prisma.proPool.createMany({ data: poolRows })

  const testRows = []
  for (let index = 0; index < config.tests; index += 1) {
    testRows.push({
      id: id(`pro_demo_${config.key}_test`, index),
      proPoolId: poolRows[index % poolRows.length].id,
      ...valuesForTest(index),
      testedAt: dateFromNow(-((index * 3) % 120), -(index % 8)),
    })
  }
  await prisma.proWaterTest.createMany({ data: testRows })

  const interventionRows = []
  for (let index = 0; index < config.interventions; index += 1) {
    const dayOffset = (index % 75) - 52
    const scheduledAt = dateFromNow(dayOffset, 7 + (index % 9))
    const status = interventionStatus(scheduledAt, index)
    const pool = poolRows[index % poolRows.length]
    const client = clientRows.find((candidate) => candidate.id === pool.proClientId)
    const duration = 45 + (index % 5) * 15
    const type = INTERVENTION_TYPES[index % INTERVENTION_TYPES.length]
    const completedAt = status === 'completed' ? new Date(scheduledAt.getTime() + duration * 60 * 1000) : null
    interventionRows.push({
      id: id(`pro_demo_${config.key}_intervention`, index),
      proClientId: client.id,
      proPoolId: pool.id,
      technicianId: technicians[index % technicians.length].id,
      type,
      status,
      priority: index % 31 === 0 ? 'urgent' : index % 11 === 0 ? 'high' : index % 4 === 0 ? 'low' : 'normal',
      scheduledAt,
      startedAt: status === 'completed' || status === 'in_progress' ? scheduledAt : null,
      completedAt,
      duration,
      summary: status === 'completed' ? `Intervention ${type} terminée avec contrôle complet.` : `Intervention ${type} planifiée.`,
      customerNotes: status === 'completed' ? 'Compte rendu envoyé au client. Eau et équipements contrôlés.' : 'Prévenir le client avant arrivée.',
      internalNotes: index % 8 === 0 ? 'Prévoir une vérification complémentaire du filtre.' : null,
      notes: 'Donnée fictive de démonstration AQWELIA Pro.',
      photos: null,
      actions: JSON.stringify(['Contrôle visuel', 'Analyse de l’eau', 'Nettoyage du bassin', 'Vérification filtration'].slice(0, 2 + (index % 3))),
      productsUsed: JSON.stringify(index % 4 === 0 ? ['pH Minus', 'Chlore choc'] : ['Chlore lent']),
      billable: status !== 'cancelled',
      amount: status === 'cancelled' ? null : 65 + (index % 7) * 25,
      currency: 'EUR',
      createdAt: new Date(scheduledAt.getTime() - 3 * DAY),
      updatedAt: completedAt || scheduledAt,
    })
  }
  await prisma.proIntervention.createMany({ data: interventionRows })

  const reminderRows = []
  for (let index = 0; index < config.reminders; index += 1) {
    reminderRows.push({
      id: id(`pro_demo_${config.key}_reminder`, index),
      userId: owner.id,
      type: ['test_water', 'filter_clean', 'cell_clean', 'retest_after_product'][index % 4],
      title: ['Analyse d’eau à réaliser', 'Nettoyage filtre', 'Contrôle cellule électrolyseur', 'Nouveau contrôle après traitement'][index % 4],
      detail: 'Rappel fictif associé à l’activité de démonstration.',
      action: 'Ouvrir le dossier client concerné',
      priority: index % 13 === 0 ? 'urgent' : index % 4 === 0 ? 'high' : 'medium',
      source: index % 3 === 0 ? 'test_history' : 'schedule',
      dueAt: dateFromNow((index % 20) - 4),
      done: index % 5 === 0,
      doneAt: index % 5 === 0 ? dateFromNow(-1) : null,
      snoozed: false,
      createdAt: dateFromNow(-(index % 15)),
    })
  }
  await prisma.reminder.createMany({ data: reminderRows })

  const inventoryRows = []
  for (let index = 0; index < config.inventory; index += 1) {
    const [productName, category, unit] = PRODUCT_NAMES[index % PRODUCT_NAMES.length]
    inventoryRows.push({
      id: id(`pro_demo_${config.key}_inventory`, index),
      userId: owner.id,
      productName,
      category,
      concentration: category.includes('chlorine') ? 65 : null,
      quantity: 2 + (index % 8) * 3,
      unit,
      price: 18 + (index % 7) * 6,
      instructions: 'Produit fictif de démonstration — ne pas utiliser comme consigne réelle.',
      createdAt: dateFromNow(-(index % 45)),
    })
  }
  await prisma.productInventory.createMany({ data: inventoryRows })

  await prisma.maintenanceTask.createMany({
    data: Array.from({ length: Math.max(6, Math.round(config.technicians * 2.5)) }, (_, index) => ({
      id: id(`pro_demo_${config.key}_task`, index),
      userId: owner.id,
      title: ['Préparer la tournée', 'Réapprovisionner le véhicule', 'Vérifier les rapports', 'Relancer les prospects'][index % 4],
      description: 'Tâche fictive utilisée pour la démonstration AQWELIA Pro.',
      type: ['planning', 'inventory', 'reporting', 'sales'][index % 4],
      priority: index % 7 === 0 ? 'high' : 'medium',
      status: index % 4 === 0 ? 'done' : 'pending',
      dueDate: dateFromNow((index % 10) - 2),
      doneAt: index % 4 === 0 ? dateFromNow(-1) : null,
      createdAt: dateFromNow(-(index % 14)),
      updatedAt: dateFromNow(-(index % 3)),
    })),
  })

  const verification = {
    key: config.key,
    email: config.email,
    organizationPlan: organization.plan,
    clients: await prisma.proClient.count({ where: { proUserId: owner.id } }),
    prospects: await prisma.proClient.count({ where: { proUserId: owner.id, status: 'prospect' } }),
    pools: await prisma.proPool.count({ where: { client: { proUserId: owner.id } } }),
    technicians: await prisma.organizationMember.count({ where: { organizationId: organization.id, dispatchEnabled: true } }),
    interventions: await prisma.proIntervention.count({ where: { client: { proUserId: owner.id } } }),
    waterTests: await prisma.proWaterTest.count({ where: { pool: { client: { proUserId: owner.id } } } }),
    activities: await prisma.proClientActivity.count({ where: { client: { proUserId: owner.id } } }),
    reminders: await prisma.reminder.count({ where: { userId: owner.id } }),
    inventory: await prisma.productInventory.count({ where: { userId: owner.id } }),
  }

  if (
    verification.clients !== config.clients ||
    verification.pools !== config.pools ||
    verification.technicians !== config.technicians ||
    verification.interventions !== config.interventions ||
    verification.waterTests !== config.tests
  ) {
    throw new Error(`Verification failed for ${config.key}: ${JSON.stringify(verification)}`)
  }

  return verification
}

const results = []
try {
  for (const config of DEMOS) {
    console.log(`Seeding AQWELIA Pro ${config.key} demo...`)
    results.push(await seedDemo(config))
  }
  console.log('AQWELIA_PRO_DEMO_SEED_RESULT')
  console.log(JSON.stringify(results, null, 2))
} finally {
  await prisma.$disconnect()
}

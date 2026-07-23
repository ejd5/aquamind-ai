import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../generated/client-postgresql')

if (!process.env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error('A PostgreSQL DATABASE_URL is required')
}

const prisma = new PrismaClient()
const now = new Date()
const DAY = 24 * 60 * 60 * 1000

const DEMOS = [
  {
    key: 'starter',
    email: 'growth.starter.demo@aqwelia.test',
    name: 'Démo AQWELIA Growth Starter',
    organization: 'Piscines Horizon — Starter',
    plan: 'growth_starter',
    passwordHash: '5ef35055c9367fba4abff949bbd52f9a:4d66d3c2ba7567165279ea1d1912621499314f0208ac933124c1305c288cade177ad83ba8450f05392b67534e99e020e71170c559e4e0ebccf189ff319ecf266',
    statuses: ['NEW', 'NEW', 'QUALIFIED', 'SCORED', 'CONTACTED', 'APPOINTMENT', 'QUOTED', 'WON'],
    upcomingAppointments: 1,
    acceptedQuotes: 1,
    sentQuotes: 1,
    agentRuns: 8,
  },
  {
    key: 'pro',
    email: 'growth.pro.demo@aqwelia.test',
    name: 'Démo AQWELIA Growth Pro',
    organization: 'Azur Piscines Services — Pro',
    plan: 'growth_pro',
    passwordHash: '30c1deb3c7e83e359c8935368cfa5196:581ac24b60467d11c65c9767d6f4920e4a8f40337cc6a30b8bd5a29dd87ad32aff0e7d338f4e6505f8041d19e248dc8db306d6e89fa692984cecb146a5857f58',
    statuses: [
      ...Array(2).fill('NEW'),
      ...Array(3).fill('QUALIFIED'),
      ...Array(2).fill('SCORED'),
      ...Array(3).fill('CONTACTED'),
      ...Array(3).fill('APPOINTMENT'),
      ...Array(4).fill('QUOTED'),
      ...Array(5).fill('WON'),
      ...Array(2).fill('LOST'),
    ],
    upcomingAppointments: 4,
    acceptedQuotes: 5,
    sentQuotes: 4,
    agentRuns: 24,
  },
  {
    key: 'performance',
    email: 'growth.performance.demo@aqwelia.test',
    name: 'Démo AQWELIA Growth Performance',
    organization: 'Riviera Pool Network — Performance',
    plan: 'performance',
    passwordHash: 'e4e80de53e7a03dc99dbf4f5bbd1ce67:6fc363a4beeb3dc8c19838f9931f74f13310c75cb94fdb9ca7ecc2e3ee88ea32c97fe9e1e36b53b9f81cd1b1af914806f5b3eaa8b36738cc8f21b54c3eb1259c',
    statuses: [
      ...Array(3).fill('NEW'),
      ...Array(4).fill('QUALIFIED'),
      ...Array(4).fill('SCORED'),
      ...Array(5).fill('ASSIGNED'),
      ...Array(6).fill('CONTACTED'),
      ...Array(7).fill('APPOINTMENT'),
      ...Array(8).fill('QUOTED'),
      ...Array(21).fill('WON'),
      ...Array(2).fill('LOST'),
    ],
    upcomingAppointments: 9,
    acceptedQuotes: 16,
    sentQuotes: 8,
    agentRuns: 60,
  },
]

const FIRST_NAMES = ['Camille', 'Thomas', 'Sofia', 'Julien', 'Nora', 'Lucas', 'Emma', 'Hugo', 'Inès', 'Gabriel']
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon']
const SOURCES = ['website', 'widget', 'campaign', 'partner', 'referral', 'qr']
const SERVICES = ['maintenance', 'repair', 'opening', 'closing', 'spa', 'renovation']
const AGENT_TYPES = ['offer_builder', 'lead_capture', 'qualification', 'diagnostic', 'matching', 'appointment', 'nurturing', 'quote', 'attribution', 'compliance']

function dateFromNow(days, hours = 0) {
  return new Date(now.getTime() + days * DAY + hours * 60 * 60 * 1000)
}

function scoreFor(status, index) {
  const base = {
    NEW: 28,
    QUALIFIED: 48,
    SCORED: 58,
    ASSIGNED: 64,
    CONTACTED: 70,
    APPOINTMENT: 78,
    QUOTED: 86,
    WON: 96,
    LOST: 35,
  }[status] ?? 40
  return Math.min(100, base + (index % 4))
}

async function clearPreviousDemo(tx, userId) {
  const organizations = await tx.organization.findMany({
    where: { ownerId: userId, type: 'growth' },
    select: { id: true },
  })
  for (const organization of organizations) {
    const runs = await tx.agentRun.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
    })
    if (runs.length > 0) {
      await tx.agentAction.deleteMany({ where: { agentRunId: { in: runs.map((run) => run.id) } } })
      await tx.agentRun.deleteMany({ where: { id: { in: runs.map((run) => run.id) } } })
    }
    await tx.organization.delete({ where: { id: organization.id } })
  }
}

async function seedDemo(config) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: config.email },
      update: {
        name: config.name,
        passwordHash: config.passwordHash,
        role: 'pro',
        locale: 'fr',
        country: 'FR',
        timezone: 'Europe/Paris',
      },
      create: {
        email: config.email,
        name: config.name,
        passwordHash: config.passwordHash,
        role: 'pro',
        locale: 'fr',
        country: 'FR',
        timezone: 'Europe/Paris',
      },
    })

    await clearPreviousDemo(tx, user.id)

    const organization = await tx.organization.create({
      data: {
        type: 'growth',
        name: config.organization,
        legalName: config.organization,
        city: 'Aix-en-Provence',
        zipCode: '13100',
        country: 'FR',
        email: config.email,
        plan: config.plan,
        status: 'active',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
            status: 'active',
          },
        },
      },
    })

    const leads = []
    for (let index = 0; index < config.statuses.length; index += 1) {
      const status = config.statuses[index]
      const createdAt = dateFromNow(-(index % 18), -(index % 8))
      const updatedAt = dateFromNow(-(index % 6), -(index % 5))
      const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
      const lastName = LAST_NAMES[(index * 3) % LAST_NAMES.length]
      const lead = await tx.lead.create({
        data: {
          organizationId: organization.id,
          source: SOURCES[index % SOURCES.length],
          firstName,
          lastName,
          email: `${config.key}.lead.${String(index + 1).padStart(2, '0')}@example.test`,
          phone: `+3360000${String(index + 1).padStart(4, '0')}`,
          city: ['Aix-en-Provence', 'Marseille', 'Cannes', 'Toulon'][index % 4],
          zipCode: ['13100', '13008', '06400', '83000'][index % 4],
          country: 'FR',
          serviceType: SERVICES[index % SERVICES.length],
          poolType: index % 5 === 0 ? 'spa' : 'pool',
          poolVolume: 28 + (index % 7) * 6,
          problem: `Demande de démonstration ${index + 1} — ${SERVICES[index % SERVICES.length]}`,
          urgency: index % 9 === 0 ? 'high' : 'normal',
          budget: index % 3 === 0 ? '1000-3000' : '500-1000',
          status,
          score: scoreFor(status, index),
          consent: true,
          consentSource: 'growth_demo_seed',
          consentAt: createdAt,
          notes: `Profil de démonstration AQWELIA Growth ${config.key}`,
          createdAt,
          updatedAt,
          events: {
            create: [
              { type: 'created', actor: 'lead_capture', payload: JSON.stringify({ source: SOURCES[index % SOURCES.length] }), createdAt },
              { type: status.toLowerCase(), actor: 'qualification', payload: JSON.stringify({ score: scoreFor(status, index) }), createdAt: updatedAt },
            ],
          },
        },
      })
      leads.push(lead)
    }

    for (let index = 0; index < Math.min(config.upcomingAppointments, leads.length); index += 1) {
      const startTime = dateFromNow(index + 1, 9 + (index % 5))
      await tx.appointment.create({
        data: {
          leadId: leads[index].id,
          organizationId: organization.id,
          assignedTo: user.id,
          startTime,
          endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
          status: index % 3 === 0 ? 'proposed' : 'confirmed',
          notes: `Rendez-vous de démonstration ${config.key}`,
        },
      })
    }

    const quoteCount = Math.min(config.acceptedQuotes + config.sentQuotes, leads.length)
    for (let index = 0; index < quoteCount; index += 1) {
      const accepted = index < config.acceptedQuotes
      const total = 420 + index * 115 + (config.key === 'performance' ? 650 : config.key === 'pro' ? 250 : 0)
      const quote = await tx.quote.create({
        data: {
          leadId: leads[index].id,
          organizationId: organization.id,
          items: JSON.stringify([
            { label: 'Diagnostic et remise en équilibre', quantity: 1, unitPrice: Math.round(total * 0.35) },
            { label: 'Contrat entretien piscine', quantity: 1, unitPrice: Math.round(total * 0.65) },
          ]),
          total,
          currency: 'EUR',
          status: accepted ? 'accepted' : 'sent',
          sentAt: dateFromNow(-(index % 5), -2),
          acceptedAt: accepted ? dateFromNow(-(index % 3), -1) : null,
          validUntil: dateFromNow(20 + index),
        },
      })
      if (accepted) {
        await tx.commission.create({
          data: {
            leadId: leads[index].id,
            organizationId: organization.id,
            invoiceId: `DEMO-${config.key.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
            rate: 0.08,
            amount: Math.min(150, Math.max(25, Math.round(total * 0.08))),
            minimum: 25,
            maximum: 150,
            status: index % 3 === 0 ? 'paid' : 'due',
            disputeWindow: dateFromNow(15),
            paidAt: index % 3 === 0 ? dateFromNow(-1) : null,
          },
        })
      }
      void quote
    }

    for (let index = 0; index < config.agentRuns; index += 1) {
      const completed = index % 11 !== 0
      const agentType = AGENT_TYPES[index % AGENT_TYPES.length]
      const startedAt = dateFromNow(-(index % 27), -(index % 10))
      const completedAt = completed ? new Date(startedAt.getTime() + (35 + (index % 90)) * 1000) : null
      await tx.agentRun.create({
        data: {
          agentType,
          organizationId: organization.id,
          userId: user.id,
          leadId: leads[index % leads.length].id,
          objective: `Exécuter l’agent ${agentType} sur le prospect de démonstration`,
          input: JSON.stringify({ demo: true, plan: config.plan }),
          output: completed ? JSON.stringify({ success: true, confidence: 0.82 + (index % 12) / 100 }) : JSON.stringify({ escalated: true }),
          confidence: completed ? Math.min(0.98, 0.82 + (index % 12) / 100) : 0.55,
          status: completed ? 'completed' : 'escalated',
          cost: Number((0.01 + (index % 5) * 0.003).toFixed(3)),
          startedAt,
          completedAt,
          actions: {
            create: {
              tool: agentType === 'appointment' ? 'calendar' : agentType === 'quote' ? 'quote_builder' : 'growth_crm',
              action: `demo_${agentType}`,
              approvalRequired: ['appointment', 'quote'].includes(agentType),
              approvedBy: ['appointment', 'quote'].includes(agentType) ? user.id : null,
              result: JSON.stringify({ seeded: true }),
            },
          },
        },
      })
    }

    return {
      email: config.email,
      plan: organization.plan,
      organizationId: organization.id,
      leads: await tx.lead.count({ where: { organizationId: organization.id } }),
      appointments: await tx.appointment.count({ where: { organizationId: organization.id } }),
      quotes: await tx.quote.count({ where: { organizationId: organization.id } }),
      agentRuns: await tx.agentRun.count({ where: { organizationId: organization.id } }),
    }
  }, { timeout: 120000 })
}

try {
  const results = []
  for (const config of DEMOS) results.push(await seedDemo(config))
  console.log(JSON.stringify({ success: true, profiles: results }, null, 2))
} finally {
  await prisma.$disconnect()
}

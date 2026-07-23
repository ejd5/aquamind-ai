from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ("fr", "en", "es", "de", "it", "pt", "nl")

COPY = {
    "fr": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automatisations pour piscinistes",
            "metaDescription": "Un moteur de croissance supervisé pour capturer, qualifier, orienter et suivre vos prospects piscine, avec des règles explicables et un journal d’actions.",
            "badgeGrowthOS": "Growth OS — 10 automatisations",
            "pageSubtitle": "10 automatisations spécialisées, de la capture du prospect au suivi de conversion, avec contrôle humain pour les actions sensibles.",
            "statAgents": "Automatisations spécialisées",
            "statConversion": "Score de qualification",
            "statResponseTime": "Étapes du pipeline",
            "statAvailability": "Actions journalisées",
            "agentsEyebrow": "01 — Les 10 automatisations",
            "agentsTitle": "Dix automatisations spécialisées, un seul objectif : votre croissance.",
            "agentsSubtitle": "Chaque automatisation a un périmètre limité, des règles explicites et un score de confiance. Les actions sensibles restent soumises à validation humaine.",
            "agentsViewAll": "Voir le détail des 10 automatisations",
            "pipelineSubtitle": "Six étapes structurées et journalisées, de la capture du prospect au client gagné.",
            "featuresMetaTitle": "Les 10 automatisations — AQWELIA Growth OS",
            "featuresMetaDescription": "Détail des 10 automatisations spécialisées : objectif, outils autorisés, budget, actions maximales et exemple de résultat.",
            "faqMetaTitle": "FAQ Growth OS — automatisations commerciales pour piscinistes",
            "faqMetaDescription": "Réponses sur les automatisations Growth OS, le pipeline, la marketplace, les commissions et la conformité RGPD.",
            "faqSubtitle": "Tout comprendre sur les automatisations, le pipeline, la marketplace et les commissions.",
            "faqA1": "Growth OS est un moteur de croissance pour piscinistes composé de 10 automatisations spécialisées. Elles capturent, qualifient, orientent et suivent les prospects selon des règles explicites. Les actions sensibles restent supervisées par un humain.",
            "faqA2": "Les 10 automatisations couvrent l’offre, la capture, la qualification, le prédiagnostic, le matching, les rendez-vous, le nurturing, les devis, l’attribution et la conformité. Chacune possède un objectif, des outils autorisés, un budget et une limite d’actions.",
        },
        "general": {
            "trustFrance": "Copilote IA accessible en ligne",
            "solutionTitle": "AQWELIA : votre assistant intelligent pour la piscine.",
            "choiceAvailabilityA": "Copilote en ligne avec historique contextuel et météo",
            "article8Body1": "L’Éditeur s’efforce de maintenir le service accessible en ligne. Des interruptions peuvent intervenir pour maintenance, incident technique ou cas de force majeure. Aucun taux de disponibilité contractuel n’est garanti sauf accord spécifique.",
            "f2B2": "Planning des interventions et rappels automatiques",
            "piscinisteNotIncluded8": "Répondre rapidement aux demandes, y compris hors horaires habituels",
        },
        "offlineB2C": "Le mode déconnecté couvre les données de base déjà synchronisées, notamment les tests d’eau, rappels et équipements. Le chat IA, l’analyse photo, la météo et la synchronisation avancée nécessitent une connexion.",
        "offlinePro": "Le mode déconnecté permet de consulter et saisir certaines données de terrain déjà synchronisées. L’analyse photo, le tableau de bord web et la synchronisation avancée nécessitent une connexion. Cette fonction reste en accès anticipé.",
        "proFeature2": "Planning des interventions, affectation manuelle, preuves de passage et suivi de statut. L’optimisation automatique des tournées est prévue dans une phase ultérieure.",
        "proFeature3": "Historique des interventions et données de bassin centralisés. Les rapports PDF avancés et exports comptables restent en cours de développement.",
        "proPrivacy": "AQWELIA applique des contrôles d’accès, le chiffrement en transit et des règles de minimisation des données. La documentation RGPD, les durées de conservation et les accords avec les sous-traitants sont finalisés avant le lancement commercial.",
        "proArrays": {
            "soloFeatures": ["Jusqu’à 50 bassins", "1 technicien", "CRM clients + bassins", "Planning des interventions", "Historique des passages", "Interface mobile responsive"],
            "teamFeatures": ["Jusqu’à 200 bassins", "Jusqu’à 4 techniciens", "Tout Solo +", "Affectation des interventions", "Suivi par technicien", "Support prioritaire"],
            "fleetFeatures": ["Bassins illimités", "Jusqu’à 12 techniciens", "Tout Team +", "Tableau de bord multi-sites", "Intégrations sur étude", "Onboarding accompagné"],
            "enterpriseFeatures": ["Périmètre personnalisé", "Accompagnement dédié", "Intégrations à définir", "SLA contractuel sur étude", "Branding personnalisé", "Formation sur site"],
        },
    },
    "en": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automations for pool professionals",
            "metaDescription": "A supervised growth engine to capture, qualify, route and track pool-service prospects with explainable rules and a complete action log.",
            "badgeGrowthOS": "Growth OS — 10 automations",
            "pageSubtitle": "10 specialized automations, from lead capture to conversion follow-up, with human control for sensitive actions.",
            "statAgents": "Specialized automations",
            "statConversion": "Qualification score",
            "statResponseTime": "Pipeline stages",
            "statAvailability": "Logged actions",
            "agentsEyebrow": "01 — The 10 automations",
            "agentsTitle": "Ten specialized automations, one objective: your growth.",
            "agentsSubtitle": "Each automation has a limited scope, explicit rules and a confidence score. Sensitive actions remain subject to human approval.",
            "agentsViewAll": "View all 10 automations",
            "pipelineSubtitle": "Six structured and logged stages, from captured lead to won customer.",
            "featuresMetaTitle": "The 10 automations — AQWELIA Growth OS",
            "featuresMetaDescription": "Details of the 10 specialized automations: objective, allowed tools, budget, maximum actions and sample output.",
            "faqMetaTitle": "Growth OS FAQ — sales automations for pool professionals",
            "faqMetaDescription": "Answers about Growth OS automations, the pipeline, marketplace, commissions and GDPR compliance.",
            "faqSubtitle": "Understand the automations, pipeline, marketplace and commissions.",
            "faqA1": "Growth OS is a growth engine for pool professionals built around 10 specialized automations. They capture, qualify, route and follow up prospects using explicit rules. Sensitive actions remain human-supervised.",
            "faqA2": "The 10 automations cover offer setup, capture, qualification, pre-diagnosis, matching, appointments, nurturing, quotes, attribution and compliance. Each has an objective, allowed tools, a budget and an action limit.",
        },
        "general": {
            "trustFrance": "AI copilot available online",
            "solutionTitle": "AQWELIA: your intelligent pool assistant.",
            "choiceAvailabilityA": "Online copilot with contextual history and weather",
            "article8Body1": "The Publisher aims to keep the service accessible online. Interruptions may occur for maintenance, technical incidents or force majeure. No contractual availability rate is guaranteed unless specifically agreed.",
            "f2B2": "Intervention planning and automatic reminders",
            "piscinisteNotIncluded8": "Respond quickly to requests, including outside usual business hours",
        },
        "offlineB2C": "Offline mode covers previously synchronized core data, including water tests, reminders and equipment. AI chat, photo analysis, weather and advanced synchronization require a connection.",
        "offlinePro": "Offline mode allows selected synchronized field data to be viewed and entered. Photo analysis, the web dashboard and advanced synchronization require a connection. This feature remains in early access.",
        "proFeature2": "Intervention planning, manual assignment, visit evidence and status tracking. Automatic route optimization is planned for a later phase.",
        "proFeature3": "Centralized intervention history and pool data. Advanced PDF reports and accounting exports are still under development.",
        "proPrivacy": "AQWELIA applies access controls, encryption in transit and data-minimization rules. GDPR documentation, retention periods and processor agreements are finalized before commercial launch.",
        "proArrays": {
            "soloFeatures": ["Up to 50 pools", "1 technician", "Customer and pool CRM", "Intervention planning", "Visit history", "Responsive mobile interface"],
            "teamFeatures": ["Up to 200 pools", "Up to 4 technicians", "Everything in Solo +", "Intervention assignment", "Technician tracking", "Priority support"],
            "fleetFeatures": ["Unlimited pools", "Up to 12 technicians", "Everything in Team +", "Multi-site dashboard", "Integrations subject to review", "Guided onboarding"],
            "enterpriseFeatures": ["Custom scope", "Dedicated support", "Integrations to be defined", "Contractual SLA subject to review", "Custom branding", "On-site training"],
        },
    },
    "es": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automatizaciones para profesionales de piscinas",
            "metaDescription": "Un motor de crecimiento supervisado para captar, calificar, asignar y seguir prospectos con reglas explicables y registro completo de acciones.",
            "badgeGrowthOS": "Growth OS — 10 automatizaciones",
            "pageSubtitle": "10 automatizaciones especializadas, desde la captación hasta el seguimiento de la conversión, con control humano para las acciones sensibles.",
            "statAgents": "Automatizaciones especializadas",
            "statConversion": "Puntuación de calificación",
            "statResponseTime": "Etapas del embudo",
            "statAvailability": "Acciones registradas",
            "agentsEyebrow": "01 — Las 10 automatizaciones",
            "agentsTitle": "Diez automatizaciones especializadas, un único objetivo: su crecimiento.",
            "agentsSubtitle": "Cada automatización tiene un alcance limitado, reglas explícitas y una puntuación de confianza. Las acciones sensibles requieren validación humana.",
            "agentsViewAll": "Ver las 10 automatizaciones",
            "pipelineSubtitle": "Seis etapas estructuradas y registradas, desde el prospecto captado hasta el cliente ganado.",
            "featuresMetaTitle": "Las 10 automatizaciones — AQWELIA Growth OS",
            "featuresMetaDescription": "Detalle de las 10 automatizaciones: objetivo, herramientas permitidas, presupuesto, acciones máximas y ejemplo de resultado.",
            "faqMetaTitle": "FAQ Growth OS — automatizaciones comerciales para profesionales de piscinas",
            "faqMetaDescription": "Respuestas sobre las automatizaciones, el embudo, el marketplace, las comisiones y el RGPD.",
            "faqSubtitle": "Todo sobre las automatizaciones, el embudo, el marketplace y las comisiones.",
            "faqA1": "Growth OS es un motor de crecimiento para profesionales de piscinas compuesto por 10 automatizaciones especializadas. Captan, califican, asignan y siguen prospectos mediante reglas explícitas. Las acciones sensibles siguen bajo supervisión humana.",
            "faqA2": "Las 10 automatizaciones cubren oferta, captación, calificación, prediagnóstico, matching, citas, nurturing, presupuestos, atribución y cumplimiento. Cada una tiene un objetivo, herramientas permitidas, presupuesto y límite de acciones.",
        },
        "general": {
            "trustFrance": "Copiloto IA disponible en línea",
            "solutionTitle": "AQWELIA: su asistente inteligente para piscinas.",
            "choiceAvailabilityA": "Copiloto en línea con historial contextual y meteorología",
            "article8Body1": "El Editor procura mantener el servicio accesible en línea. Pueden producirse interrupciones por mantenimiento, incidentes técnicos o fuerza mayor. No se garantiza una tasa contractual de disponibilidad salvo acuerdo específico.",
            "f2B2": "Planificación de intervenciones y recordatorios automáticos",
            "piscinisteNotIncluded8": "Responder rápidamente a las solicitudes, incluso fuera del horario habitual",
        },
        "offlineB2C": "El modo sin conexión cubre los datos básicos previamente sincronizados, incluidos análisis de agua, recordatorios y equipos. El chat IA, el análisis de fotos, la meteorología y la sincronización avanzada requieren conexión.",
        "offlinePro": "El modo sin conexión permite consultar e introducir determinados datos de campo ya sincronizados. El análisis de fotos, el panel web y la sincronización avanzada requieren conexión. Esta función permanece en acceso anticipado.",
        "proFeature2": "Planificación de intervenciones, asignación manual, pruebas de visita y seguimiento de estado. La optimización automática de rutas está prevista para una fase posterior.",
        "proFeature3": "Historial de intervenciones y datos de piscinas centralizados. Los informes PDF avanzados y las exportaciones contables siguen en desarrollo.",
        "proPrivacy": "AQWELIA aplica controles de acceso, cifrado en tránsito y reglas de minimización de datos. La documentación RGPD, los plazos de conservación y los acuerdos con encargados se finalizan antes del lanzamiento comercial.",
        "proArrays": {
            "soloFeatures": ["Hasta 50 piscinas", "1 técnico", "CRM de clientes y piscinas", "Planificación de intervenciones", "Historial de visitas", "Interfaz móvil responsive"],
            "teamFeatures": ["Hasta 200 piscinas", "Hasta 4 técnicos", "Todo Solo +", "Asignación de intervenciones", "Seguimiento por técnico", "Soporte prioritario"],
            "fleetFeatures": ["Piscinas ilimitadas", "Hasta 12 técnicos", "Todo Team +", "Panel multisitio", "Integraciones sujetas a estudio", "Onboarding acompañado"],
            "enterpriseFeatures": ["Alcance personalizado", "Acompañamiento dedicado", "Integraciones por definir", "SLA contractual sujeto a estudio", "Marca personalizada", "Formación presencial"],
        },
    },
    "de": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 Automatisierungen für Poolprofis",
            "metaDescription": "Eine überwachte Wachstumsplattform zur Erfassung, Qualifizierung, Zuweisung und Nachverfolgung von Interessenten mit nachvollziehbaren Regeln und Aktionsprotokoll.",
            "badgeGrowthOS": "Growth OS — 10 Automatisierungen",
            "pageSubtitle": "10 spezialisierte Automatisierungen von der Lead-Erfassung bis zur Konversionsnachverfolgung, mit menschlicher Kontrolle bei sensiblen Aktionen.",
            "statAgents": "Spezialisierte Automatisierungen",
            "statConversion": "Qualifizierungsscore",
            "statResponseTime": "Pipeline-Stufen",
            "statAvailability": "Protokollierte Aktionen",
            "agentsEyebrow": "01 — Die 10 Automatisierungen",
            "agentsTitle": "Zehn spezialisierte Automatisierungen, ein Ziel: Ihr Wachstum.",
            "agentsSubtitle": "Jede Automatisierung hat einen begrenzten Umfang, klare Regeln und einen Vertrauenswert. Sensible Aktionen bleiben genehmigungspflichtig.",
            "agentsViewAll": "Alle 10 Automatisierungen ansehen",
            "pipelineSubtitle": "Sechs strukturierte und protokollierte Stufen vom erfassten Lead bis zum gewonnenen Kunden.",
            "featuresMetaTitle": "Die 10 Automatisierungen — AQWELIA Growth OS",
            "featuresMetaDescription": "Details der 10 Automatisierungen: Ziel, erlaubte Werkzeuge, Budget, maximale Aktionen und Beispielergebnis.",
            "faqMetaTitle": "Growth OS FAQ — Vertriebsautomatisierungen für Poolprofis",
            "faqMetaDescription": "Antworten zu Automatisierungen, Pipeline, Marketplace, Provisionen und DSGVO.",
            "faqSubtitle": "Alles über Automatisierungen, Pipeline, Marketplace und Provisionen.",
            "faqA1": "Growth OS ist eine Wachstumsplattform für Poolprofis mit 10 spezialisierten Automatisierungen. Sie erfassen, qualifizieren, weisen zu und verfolgen Interessenten anhand klarer Regeln. Sensible Aktionen bleiben menschlich überwacht.",
            "faqA2": "Die 10 Automatisierungen decken Angebot, Erfassung, Qualifizierung, Vordiagnose, Matching, Termine, Nurturing, Angebote, Attribution und Compliance ab. Jede hat ein Ziel, erlaubte Werkzeuge, Budget und Aktionslimit.",
        },
        "general": {
            "trustFrance": "KI-Copilot online verfügbar",
            "solutionTitle": "AQWELIA: Ihr intelligenter Poolassistent.",
            "choiceAvailabilityA": "Online-Copilot mit Kontextverlauf und Wetter",
            "article8Body1": "Der Herausgeber bemüht sich, den Dienst online zugänglich zu halten. Unterbrechungen können durch Wartung, technische Störungen oder höhere Gewalt entstehen. Eine vertragliche Verfügbarkeitsquote wird nur bei besonderer Vereinbarung garantiert.",
            "f2B2": "Einsatzplanung und automatische Erinnerungen",
            "piscinisteNotIncluded8": "Anfragen auch außerhalb üblicher Geschäftszeiten schnell beantworten",
        },
        "offlineB2C": "Der Offline-Modus umfasst zuvor synchronisierte Kerndaten wie Wassertests, Erinnerungen und Geräte. KI-Chat, Fotoanalyse, Wetter und erweiterte Synchronisierung benötigen eine Verbindung.",
        "offlinePro": "Der Offline-Modus erlaubt das Anzeigen und Erfassen ausgewählter synchronisierter Felddaten. Fotoanalyse, Web-Dashboard und erweiterte Synchronisierung benötigen eine Verbindung. Diese Funktion bleibt im Early Access.",
        "proFeature2": "Einsatzplanung, manuelle Zuweisung, Besuchsnachweise und Statusverfolgung. Automatische Routenoptimierung ist für eine spätere Phase geplant.",
        "proFeature3": "Zentraler Einsatzverlauf und Pooldaten. Erweiterte PDF-Berichte und Buchhaltungsexporte befinden sich noch in Entwicklung.",
        "proPrivacy": "AQWELIA verwendet Zugriffskontrollen, Verschlüsselung bei der Übertragung und Datenminimierung. DSGVO-Dokumentation, Aufbewahrungsfristen und Auftragsverarbeitungsverträge werden vor dem kommerziellen Start abgeschlossen.",
        "proArrays": {
            "soloFeatures": ["Bis zu 50 Pools", "1 Techniker", "Kunden- und Pool-CRM", "Einsatzplanung", "Besuchsverlauf", "Responsive mobile Oberfläche"],
            "teamFeatures": ["Bis zu 200 Pools", "Bis zu 4 Techniker", "Alles aus Solo +", "Einsatzzuweisung", "Techniker-Nachverfolgung", "Priorisierter Support"],
            "fleetFeatures": ["Unbegrenzte Pools", "Bis zu 12 Techniker", "Alles aus Team +", "Multi-Site-Dashboard", "Integrationen nach Prüfung", "Begleitetes Onboarding"],
            "enterpriseFeatures": ["Individueller Umfang", "Dedizierte Begleitung", "Zu definierende Integrationen", "Vertragliches SLA nach Prüfung", "Individuelles Branding", "Vor-Ort-Schulung"],
        },
    },
    "it": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automazioni per professionisti della piscina",
            "metaDescription": "Un motore di crescita supervisionato per acquisire, qualificare, assegnare e seguire i prospect con regole spiegabili e registro completo delle azioni.",
            "badgeGrowthOS": "Growth OS — 10 automazioni",
            "pageSubtitle": "10 automazioni specializzate, dall’acquisizione del lead al monitoraggio della conversione, con controllo umano per le azioni sensibili.",
            "statAgents": "Automazioni specializzate",
            "statConversion": "Punteggio di qualificazione",
            "statResponseTime": "Fasi della pipeline",
            "statAvailability": "Azioni registrate",
            "agentsEyebrow": "01 — Le 10 automazioni",
            "agentsTitle": "Dieci automazioni specializzate, un solo obiettivo: la crescita.",
            "agentsSubtitle": "Ogni automazione ha un perimetro limitato, regole esplicite e un punteggio di affidabilità. Le azioni sensibili richiedono approvazione umana.",
            "agentsViewAll": "Vedi le 10 automazioni",
            "pipelineSubtitle": "Sei fasi strutturate e registrate, dal lead acquisito al cliente conquistato.",
            "featuresMetaTitle": "Le 10 automazioni — AQWELIA Growth OS",
            "featuresMetaDescription": "Dettaglio delle 10 automazioni: obiettivo, strumenti consentiti, budget, azioni massime ed esempio di risultato.",
            "faqMetaTitle": "FAQ Growth OS — automazioni commerciali per professionisti della piscina",
            "faqMetaDescription": "Risposte su automazioni, pipeline, marketplace, commissioni e GDPR.",
            "faqSubtitle": "Tutto su automazioni, pipeline, marketplace e commissioni.",
            "faqA1": "Growth OS è un motore di crescita per professionisti della piscina composto da 10 automazioni specializzate. Acquisiscono, qualificano, assegnano e seguono i prospect secondo regole esplicite. Le azioni sensibili restano supervisionate da una persona.",
            "faqA2": "Le 10 automazioni coprono offerta, acquisizione, qualificazione, prediagnosi, matching, appuntamenti, nurturing, preventivi, attribuzione e conformità. Ognuna ha un obiettivo, strumenti consentiti, budget e limite di azioni.",
        },
        "general": {
            "trustFrance": "Copilota IA disponibile online",
            "solutionTitle": "AQWELIA: il tuo assistente intelligente per la piscina.",
            "choiceAvailabilityA": "Copilota online con cronologia contestuale e meteo",
            "article8Body1": "L’Editore si impegna a mantenere il servizio accessibile online. Possono verificarsi interruzioni per manutenzione, incidenti tecnici o forza maggiore. Nessuna percentuale di disponibilità contrattuale è garantita salvo accordo specifico.",
            "f2B2": "Pianificazione degli interventi e promemoria automatici",
            "piscinisteNotIncluded8": "Rispondere rapidamente alle richieste anche fuori dagli orari abituali",
        },
        "offlineB2C": "La modalità offline copre i dati di base già sincronizzati, inclusi test dell’acqua, promemoria e attrezzature. Chat IA, analisi foto, meteo e sincronizzazione avanzata richiedono una connessione.",
        "offlinePro": "La modalità offline consente di consultare e inserire alcuni dati di campo già sincronizzati. Analisi foto, dashboard web e sincronizzazione avanzata richiedono una connessione. La funzione resta in accesso anticipato.",
        "proFeature2": "Pianificazione degli interventi, assegnazione manuale, prove di passaggio e monitoraggio dello stato. L’ottimizzazione automatica dei percorsi è prevista in una fase successiva.",
        "proFeature3": "Storico degli interventi e dati piscina centralizzati. Rapporti PDF avanzati ed esportazioni contabili sono ancora in sviluppo.",
        "proPrivacy": "AQWELIA applica controlli di accesso, cifratura in transito e minimizzazione dei dati. Documentazione GDPR, tempi di conservazione e accordi con i responsabili saranno completati prima del lancio commerciale.",
        "proArrays": {
            "soloFeatures": ["Fino a 50 piscine", "1 tecnico", "CRM clienti e piscine", "Pianificazione interventi", "Storico visite", "Interfaccia mobile responsive"],
            "teamFeatures": ["Fino a 200 piscine", "Fino a 4 tecnici", "Tutto Solo +", "Assegnazione interventi", "Monitoraggio per tecnico", "Supporto prioritario"],
            "fleetFeatures": ["Piscine illimitate", "Fino a 12 tecnici", "Tutto Team +", "Dashboard multi-sito", "Integrazioni su valutazione", "Onboarding assistito"],
            "enterpriseFeatures": ["Perimetro personalizzato", "Supporto dedicato", "Integrazioni da definire", "SLA contrattuale su valutazione", "Branding personalizzato", "Formazione in sede"],
        },
    },
    "pt": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automações para profissionais de piscinas",
            "metaDescription": "Um motor de crescimento supervisionado para captar, qualificar, encaminhar e acompanhar potenciais clientes com regras explicáveis e registo completo de ações.",
            "badgeGrowthOS": "Growth OS — 10 automações",
            "pageSubtitle": "10 automações especializadas, da captação ao acompanhamento da conversão, com controlo humano nas ações sensíveis.",
            "statAgents": "Automações especializadas",
            "statConversion": "Pontuação de qualificação",
            "statResponseTime": "Etapas do pipeline",
            "statAvailability": "Ações registadas",
            "agentsEyebrow": "01 — As 10 automações",
            "agentsTitle": "Dez automações especializadas, um único objetivo: o crescimento.",
            "agentsSubtitle": "Cada automação tem um âmbito limitado, regras explícitas e uma pontuação de confiança. As ações sensíveis exigem validação humana.",
            "agentsViewAll": "Ver as 10 automações",
            "pipelineSubtitle": "Seis etapas estruturadas e registadas, do lead captado ao cliente conquistado.",
            "featuresMetaTitle": "As 10 automações — AQWELIA Growth OS",
            "featuresMetaDescription": "Detalhes das 10 automações: objetivo, ferramentas autorizadas, orçamento, ações máximas e exemplo de resultado.",
            "faqMetaTitle": "FAQ Growth OS — automações comerciais para profissionais de piscinas",
            "faqMetaDescription": "Respostas sobre automações, pipeline, marketplace, comissões e RGPD.",
            "faqSubtitle": "Tudo sobre automações, pipeline, marketplace e comissões.",
            "faqA1": "Growth OS é um motor de crescimento para profissionais de piscinas composto por 10 automações especializadas. Captam, qualificam, encaminham e acompanham potenciais clientes segundo regras explícitas. As ações sensíveis permanecem sob supervisão humana.",
            "faqA2": "As 10 automações abrangem oferta, captação, qualificação, pré-diagnóstico, matching, marcações, nurturing, orçamentos, atribuição e conformidade. Cada uma tem um objetivo, ferramentas autorizadas, orçamento e limite de ações.",
        },
        "general": {
            "trustFrance": "Copiloto IA disponível online",
            "solutionTitle": "AQWELIA: o seu assistente inteligente para piscinas.",
            "choiceAvailabilityA": "Copiloto online com histórico contextual e meteorologia",
            "article8Body1": "O Editor procura manter o serviço acessível online. Podem ocorrer interrupções por manutenção, incidentes técnicos ou força maior. Não é garantida qualquer taxa contratual de disponibilidade salvo acordo específico.",
            "f2B2": "Planeamento de intervenções e lembretes automáticos",
            "piscinisteNotIncluded8": "Responder rapidamente aos pedidos, incluindo fora do horário habitual",
        },
        "offlineB2C": "O modo offline cobre dados essenciais previamente sincronizados, incluindo testes da água, lembretes e equipamentos. Chat IA, análise de fotografias, meteorologia e sincronização avançada exigem ligação.",
        "offlinePro": "O modo offline permite consultar e introduzir determinados dados de campo já sincronizados. Análise de fotografias, dashboard web e sincronização avançada exigem ligação. Esta função permanece em acesso antecipado.",
        "proFeature2": "Planeamento de intervenções, atribuição manual, provas de visita e acompanhamento do estado. A otimização automática de rotas está prevista para uma fase posterior.",
        "proFeature3": "Histórico de intervenções e dados das piscinas centralizados. Relatórios PDF avançados e exportações contabilísticas continuam em desenvolvimento.",
        "proPrivacy": "AQWELIA aplica controlos de acesso, encriptação em trânsito e minimização de dados. A documentação RGPD, os períodos de conservação e os acordos com subcontratantes serão finalizados antes do lançamento comercial.",
        "proArrays": {
            "soloFeatures": ["Até 50 piscinas", "1 técnico", "CRM de clientes e piscinas", "Planeamento de intervenções", "Histórico de visitas", "Interface móvel responsiva"],
            "teamFeatures": ["Até 200 piscinas", "Até 4 técnicos", "Tudo Solo +", "Atribuição de intervenções", "Acompanhamento por técnico", "Suporte prioritário"],
            "fleetFeatures": ["Piscinas ilimitadas", "Até 12 técnicos", "Tudo Team +", "Dashboard multi-site", "Integrações sujeitas a avaliação", "Onboarding acompanhado"],
            "enterpriseFeatures": ["Âmbito personalizado", "Acompanhamento dedicado", "Integrações a definir", "SLA contratual sujeito a avaliação", "Branding personalizado", "Formação presencial"],
        },
    },
    "nl": {
        "growth": {
            "metaTitle": "AQWELIA Growth OS — 10 automatiseringen voor zwembadprofessionals",
            "metaDescription": "Een begeleide groeimotor om prospects vast te leggen, te kwalificeren, toe te wijzen en op te volgen met uitlegbare regels en een volledig actielogboek.",
            "badgeGrowthOS": "Growth OS — 10 automatiseringen",
            "pageSubtitle": "10 gespecialiseerde automatiseringen, van leadcaptatie tot conversieopvolging, met menselijke controle voor gevoelige acties.",
            "statAgents": "Gespecialiseerde automatiseringen",
            "statConversion": "Kwalificatiescore",
            "statResponseTime": "Pipelinefasen",
            "statAvailability": "Gelogde acties",
            "agentsEyebrow": "01 — De 10 automatiseringen",
            "agentsTitle": "Tien gespecialiseerde automatiseringen, één doel: uw groei.",
            "agentsSubtitle": "Elke automatisering heeft een beperkt bereik, duidelijke regels en een vertrouwensscore. Gevoelige acties vereisen menselijke goedkeuring.",
            "agentsViewAll": "Bekijk de 10 automatiseringen",
            "pipelineSubtitle": "Zes gestructureerde en gelogde fasen, van vastgelegde lead tot gewonnen klant.",
            "featuresMetaTitle": "De 10 automatiseringen — AQWELIA Growth OS",
            "featuresMetaDescription": "Details van de 10 automatiseringen: doel, toegestane tools, budget, maximale acties en voorbeeldresultaat.",
            "faqMetaTitle": "Growth OS FAQ — verkoopautomatiseringen voor zwembadprofessionals",
            "faqMetaDescription": "Antwoorden over automatiseringen, pipeline, marketplace, commissies en AVG.",
            "faqSubtitle": "Alles over automatiseringen, pipeline, marketplace en commissies.",
            "faqA1": "Growth OS is een groeimotor voor zwembadprofessionals met 10 gespecialiseerde automatiseringen. Ze leggen prospects vast, kwalificeren, wijzen toe en volgen op volgens duidelijke regels. Gevoelige acties blijven onder menselijk toezicht.",
            "faqA2": "De 10 automatiseringen bestrijken aanbod, captatie, kwalificatie, voordiagnose, matching, afspraken, nurturing, offertes, attributie en compliance. Elke heeft een doel, toegestane tools, budget en actielimiet.",
        },
        "general": {
            "trustFrance": "AI-copilot online beschikbaar",
            "solutionTitle": "AQWELIA: uw intelligente zwembadassistent.",
            "choiceAvailabilityA": "Online copilot met contextgeschiedenis en weer",
            "article8Body1": "De Uitgever streeft ernaar de dienst online toegankelijk te houden. Onderbrekingen kunnen optreden door onderhoud, technische incidenten of overmacht. Er wordt geen contractueel beschikbaarheidspercentage gegarandeerd tenzij specifiek overeengekomen.",
            "f2B2": "Interventieplanning en automatische herinneringen",
            "piscinisteNotIncluded8": "Snel reageren op aanvragen, ook buiten de gebruikelijke openingstijden",
        },
        "offlineB2C": "De offline modus omvat eerder gesynchroniseerde basisgegevens, waaronder watertests, herinneringen en apparatuur. AI-chat, fotoanalyse, weer en geavanceerde synchronisatie vereisen een verbinding.",
        "offlinePro": "De offline modus maakt het mogelijk geselecteerde gesynchroniseerde veldgegevens te bekijken en in te voeren. Fotoanalyse, het webdashboard en geavanceerde synchronisatie vereisen een verbinding. Deze functie blijft in early access.",
        "proFeature2": "Interventieplanning, handmatige toewijzing, bezoekbewijs en statusopvolging. Automatische routeoptimalisatie is gepland voor een latere fase.",
        "proFeature3": "Gecentraliseerde interventiehistoriek en zwembadgegevens. Geavanceerde PDF-rapporten en boekhoudexports zijn nog in ontwikkeling.",
        "proPrivacy": "AQWELIA gebruikt toegangscontroles, versleuteling tijdens transport en dataminimalisatie. AVG-documentatie, bewaartermijnen en verwerkersovereenkomsten worden vóór de commerciële lancering afgerond.",
        "proArrays": {
            "soloFeatures": ["Tot 50 zwembaden", "1 technicus", "CRM voor klanten en zwembaden", "Interventieplanning", "Bezoekhistoriek", "Responsieve mobiele interface"],
            "teamFeatures": ["Tot 200 zwembaden", "Tot 4 technici", "Alles in Solo +", "Interventietoewijzing", "Opvolging per technicus", "Prioritaire ondersteuning"],
            "fleetFeatures": ["Onbeperkt aantal zwembaden", "Tot 12 technici", "Alles in Team +", "Multi-site dashboard", "Integraties na evaluatie", "Begeleide onboarding"],
            "enterpriseFeatures": ["Aangepaste scope", "Toegewijde begeleiding", "Integraties te bepalen", "Contractuele SLA na evaluatie", "Aangepaste branding", "Training op locatie"],
        },
    },
}


def replace_key_recursive(node: object, key: str, value: str) -> None:
    if isinstance(node, dict):
        for current_key in list(node):
            if current_key == key:
                node[current_key] = value
            else:
                replace_key_recursive(node[current_key], key, value)
    elif isinstance(node, list):
        for item in node:
            replace_key_recursive(item, key, value)


def update_offline_faqs(node: object, offline_b2c: str, offline_pro: str) -> None:
    markers = ("hors ligne", "hors-ligne", "offline", "sin conexión", "senza connessione")
    if isinstance(node, dict):
        q4 = str(node.get("faq4Q", "")).lower()
        if any(marker in q4 for marker in markers) and "faq4A" in node:
            node["faq4A"] = offline_b2c
        q8 = str(node.get("faqQ8", "")).lower()
        if any(marker in q8 for marker in markers) and "faqA8" in node:
            node["faqA8"] = offline_pro
        for value in node.values():
            update_offline_faqs(value, offline_b2c, offline_pro)
    elif isinstance(node, list):
        for item in node:
            update_offline_faqs(item, offline_b2c, offline_pro)


for locale in LOCALES:
    path = ROOT / "src" / "i18n" / "locales" / f"{locale}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    cfg = COPY[locale]

    growth = data.get("growth")
    pro = data.get("pro")
    if not isinstance(growth, dict) or not isinstance(pro, dict):
        raise RuntimeError(f"Missing growth/pro namespace in {locale}")

    growth.update(cfg["growth"])
    pro["feature2Text"] = cfg["proFeature2"]
    pro["feature3Title"] = "Suivi & comptes rendus" if locale == "fr" else pro.get("feature3Title", "Service tracking")
    pro["feature3Text"] = cfg["proFeature3"]
    pro["faqA4"] = cfg["proPrivacy"]
    for array_key, array_value in cfg["proArrays"].items():
        pro[array_key] = array_value

    for key, value in cfg["general"].items():
        replace_key_recursive(data, key, value)
    update_offline_faqs(data, cfg["offlineB2C"], cfg["offlinePro"])

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


growth_page = ROOT / "src" / "app" / "growth" / "page.tsx"
growth_text = growth_page.read_text(encoding="utf-8")
old_stats = """  const STATS = [
    { value: '10', label: t('statAgents') },
    { value: '+38%', label: t('statConversion') },
    { value: '< 2min', label: t('statResponseTime') },
    { value: '24/7', label: t('statAvailability') },
  ]"""
new_stats = """  const STATS = [
    { value: '10', label: t('statAgents') },
    { value: '0–100', label: t('statConversion') },
    { value: '6', label: t('statResponseTime') },
    { value: '100%', label: t('statAvailability') },
  ]"""
if old_stats not in growth_text:
    raise RuntimeError("Growth STATS block not found")
growth_page.write_text(growth_text.replace(old_stats, new_stats), encoding="utf-8")

plans_path = ROOT / "src" / "lib" / "billing" / "plans.ts"
plans_text = plans_path.read_text(encoding="utf-8")
plans_text = plans_text.replace(
    "maxPhotoScansPerMonth: 999999, // Scans illimités (P0-A decision)",
    "maxPhotoScansPerMonth: 2, // 2 scans photo / mois — offre Découverte",
).replace(
    "maxTestsPerMonth: 999999,      // Tests illimités (P0-A decision)",
    "maxTestsPerMonth: 2,           // 2 tests manuels / mois — offre Découverte",
)
plans_path.write_text(plans_text, encoding="utf-8")

test_path = ROOT / "tests" / "p0-a-marketing-truth.test.ts"
test_path.write_text(
    """import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']

describe('P0-A marketing truth', () => {
  it('removes unsupported Growth performance claims', () => {
    const page = readFileSync(join(ROOT, 'src/app/growth/page.tsx'), 'utf8')
    expect(page).not.toContain("value: '+38%'")
    expect(page).not.toContain("value: '< 2min'")
    expect(page).not.toContain("value: '24/7'")
    expect(page).toContain("value: '0–100'")
    expect(page).toContain("value: '100%'")
  })

  it.each(locales)('uses supervised automation copy in %s', (locale) => {
    const data = JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
    const growth = JSON.stringify(data.growth).toLowerCase()
    expect(growth).not.toContain('10 agents ia')
    expect(growth).not.toContain('10 specialized ai agents')
    expect(growth).not.toContain('working 24/7')
    expect(growth).not.toContain('travaillent 24/7')
  })

  it.each(locales)('does not advertise unsupported Pro integrations in %s', (locale) => {
    const data = JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
    const pro = JSON.stringify(data.pro)
    expect(pro).not.toMatch(/QuickBooks|Xero|SLA 99[,.]9|synchronisation comptable/i)
    expect(pro).not.toMatch(/tournées optimisées par géolocalisation/i)
  })

  it('enforces the advertised Discovery limits', () => {
    const plans = readFileSync(join(ROOT, 'src/lib/billing/plans.ts'), 'utf8')
    expect(plans).toContain('maxPhotoScansPerMonth: 2')
    expect(plans).toContain('maxTestsPerMonth: 2')
  })
})
""",
    encoding="utf-8",
)

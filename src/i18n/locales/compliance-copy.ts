import { normalizeLocale, type Locale } from '@/i18n/config'

export const COMPLIANCE_COPY = {
  "fr": {
    "common": {
      "lastUpdated": "Dernière mise à jour",
      "statusIncomplete": "Informations obligatoires à compléter avant commercialisation",
      "contact": "Contact",
      "learnMore": "En savoir plus",
      "manageCookies": "Gérer les cookies",
      "yes": "Oui",
      "no": "Non",
      "processorsLink": "Sous-traitants",
      "aiTransparencyLink": "Transparence IA",
      "deleteAccountLink": "Suppression du compte",
      "legalTranslationWarning": "",
      "cancelSubscriptionBeforeDeletion": "Résiliez d’abord votre abonnement actif dans Stripe, l’App Store ou Google Play, puis relancez la suppression.",
      "transferOrganizationBeforeDeletion": "Transférez ou fermez d’abord votre organisation AQWELIA Pro avant de supprimer le compte."
    },
    "consent": {
      "title": "Vos choix de confidentialité",
      "body": "Les traceurs nécessaires font fonctionner AQWELIA. Les statistiques PostHog sont facultatives et ne sont activées qu’avec votre accord.",
      "necessaryTitle": "Nécessaires",
      "necessaryBody": "Authentification, sécurité, langue et mémorisation de votre choix. Toujours actifs.",
      "analyticsTitle": "Mesure d’audience",
      "analyticsBody": "Aide à comprendre l’usage du produit sans publicité ni revente de données.",
      "accept": "Tout accepter",
      "reject": "Tout refuser",
      "customize": "Personnaliser",
      "save": "Enregistrer mes choix",
      "saveError": "Votre choix n’a pas pu être enregistré. Aucun traceur facultatif n’a été activé. Réessayez.",
      "close": "Fermer"
    },
    "aiNotice": {
      "label": "Contenu généré avec une IA.",
      "body": "AQWELIA peut se tromper : vérifiez les mesures, les notices produit et les consignes de sécurité avant d’agir.",
      "link": "Comprendre le fonctionnement"
    },
    "privacy": {
      "metaTitle": "Politique de confidentialité — AQWELIA",
      "metaDescription": "Données traitées, finalités, bases légales, durées, sous-traitants et droits RGPD dans AQWELIA.",
      "eyebrow": "CONFIDENTIALITÉ",
      "title": "Politique de confidentialité",
      "intro": "Cette politique décrit les traitements réellement mis en œuvre dans les services web et mobiles AQWELIA. Elle est distincte des conditions contractuelles.",
      "sections": [
        {
          "title": "1. Responsable du traitement",
          "paragraphs": [
            "L’éditeur indiqué dans les mentions légales est responsable des traitements décrits ici. Tant que son identité juridique complète n’est pas renseignée, AQWELIA ne doit pas être ouvert à la commercialisation.",
            "Pour toute question ou exercice de droits : privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Données traitées",
          "paragraphs": [
            "Selon les fonctions utilisées, AQWELIA traite les catégories suivantes :"
          ],
          "items": [
            "Compte et authentification : nom, e-mail, téléphone éventuel, langue, pays et comptes Google/Apple liés.",
            "Piscine, spa et équipements : caractéristiques du bassin, mesures d’eau, produits, interventions, rappels et historique.",
            "Photos : l’image est normalisée, ses métadonnées sont supprimées puis elle est transmise au fournisseur d’IA pour analyse ; AQWELIA conserve le diagnostic et une référence privée, pas les octets de la photo normalisée.",
            "Assistant IA : messages, contexte du bassin et réponses afin de fournir le service et afficher l’historique.",
            "Abonnement et facturation : plan, statut, identifiants Stripe ou RevenueCat et événements techniques ; AQWELIA ne reçoit pas le numéro complet de carte.",
            "Support, formulaires et partenariats : coordonnées et contenu transmis.",
            "Statistiques facultatives : événements d’usage PostHog uniquement après consentement.",
            "Fonctions Pro : clients, techniciens, interventions et, uniquement si la fonction GPS est réactivée, données de localisation professionnelle."
          ]
        },
        {
          "title": "3. Finalités et bases juridiques",
          "paragraphs": [
            "Les traitements nécessaires au compte, au diagnostic, aux recommandations, au support et à l’abonnement reposent sur l’exécution du contrat ou les mesures précontractuelles. La sécurité, la prévention des abus et l’amélioration non publicitaire du service peuvent reposer sur l’intérêt légitime, après mise en balance. Les statistiques non essentielles et la prospection reposent sur le consentement. Les pièces de facturation sont conservées lorsque la loi l’impose."
          ]
        },
        {
          "title": "4. Intelligence artificielle et photos",
          "paragraphs": [
            "Les réponses, synthèses et diagnostics signalés comme générés par IA sont produits avec des services tiers, notamment NVIDIA selon la configuration active. Ils constituent une aide et non une décision produisant un effet juridique. L’utilisateur reste décisionnaire.",
            "N’envoyez pas de visage, document d’identité, plaque d’immatriculation ni autre donnée sans rapport avec l’entretien du bassin."
          ]
        },
        {
          "title": "5. Destinataires et sous-traitants",
          "paragraphs": [
            "L’accès est limité aux personnes autorisées et aux prestataires nécessaires à l’hébergement, l’authentification, l’IA, la facturation, l’e-mail, la sécurité et les statistiques consenties. La liste opérationnelle est publiée sur la page Sous-traitants. Certains prestataires peuvent traiter des données hors de l’Espace économique européen sous les mécanismes juridiques applicables."
          ]
        },
        {
          "title": "6. Durées de conservation",
          "items": [
            "Compte, bassins, historique, conversations et diagnostics : pendant la vie du compte, puis suppression ou anonymisation lors de sa clôture, sauf obligation contraire.",
            "Photo normalisée : traitement transitoire ; le fichier normalisé n’est pas conservé par AQWELIA après l’analyse.",
            "Préférences de consentement : choix mémorisé six mois ; preuve conservée pendant la durée nécessaire à la démonstration de conformité.",
            "Support : durée nécessaire au traitement puis archivage limité en cas de litige.",
            "Facturation et commandes payées : durée légale applicable, pouvant atteindre dix ans pour les documents comptables.",
            "Localisation Pro : fonction désactivée par défaut ; lorsque réactivée, conservation limitée par la date retentionUntil de chaque session."
          ]
        },
        {
          "title": "7. Vos droits",
          "paragraphs": [
            "Vous pouvez demander l’accès, la rectification, l’effacement, la limitation, l’opposition, la portabilité et le retrait d’un consentement. Les réglages permettent d’exporter ou de supprimer le compte. Vous pouvez également écrire à privacy@aqwelia.app. Une preuve d’identité strictement nécessaire peut être demandée en cas de doute raisonnable.",
            "Vous pouvez introduire une réclamation auprès de la CNIL."
          ]
        },
        {
          "title": "8. Suppression du compte",
          "paragraphs": [
            "La suppression est disponible dans les paramètres et via la page publique dédiée. Les abonnements actifs doivent d’abord être résiliés auprès du canal d’achat. Les données sans obligation de conservation sont supprimées ; les enregistrements légalement requis sont dissociés du compte ou minimisés."
          ]
        },
        {
          "title": "9. Sécurité et modifications",
          "paragraphs": [
            "AQWELIA applique des mesures proportionnées : contrôle d’accès, séparation des utilisateurs, hachage des mots de passe, chiffrement des échanges HTTPS, vérification des webhooks, limitation de débit et journalisation technique. Aucun système ne peut garantir un risque nul.",
            "Cette politique est mise à jour lorsque les traitements ou fournisseurs changent. La date affichée permet d’identifier la version applicable."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Politique de cookies — AQWELIA",
      "metaDescription": "Traceurs nécessaires, statistiques facultatives et gestion du consentement dans AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Politique de cookies et traceurs",
      "intro": "AQWELIA ne dépose les traceurs de mesure d’audience qu’après un choix positif. Refuser est aussi simple qu’accepter et le choix peut être modifié à tout moment.",
      "necessaryTitle": "Traceurs nécessaires",
      "analyticsTitle": "Traceurs statistiques facultatifs",
      "manageBody": "Utilisez le bouton ci-dessous pour rouvrir le centre de préférences. Le choix est redemandé au plus tard après six mois ou lorsqu’une finalité change.",
      "tableHeaders": [
        "Nom ou famille",
        "Finalité",
        "Durée indicative",
        "Statut"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Session authentifiée et protection du compte",
          "30 jours maximum",
          "Nécessaire"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Sécurisation des connexions et redirections",
          "Session ou courte durée",
          "Nécessaire"
        ],
        [
          "NEXT_LOCALE",
          "Langue de l’interface",
          "1 an",
          "Nécessaire / préférence"
        ],
        [
          "aqwelia_consent_v2",
          "Mémorisation du choix analytics",
          "6 mois",
          "Nécessaire"
        ],
        [
          "ph_* (PostHog)",
          "Mesure d’audience et événements d’usage explicites",
          "Selon la configuration, limitée par la politique AQWELIA",
          "Facultatif — consentement"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des inscriptions automatisées lorsque la protection est active",
          "Durée du défi / sécurité",
          "Nécessaire à la sécurité"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google ou RevenueCat peuvent utiliser leurs propres traceurs lorsque vous ouvrez leur parcours d’authentification ou de paiement. Ces traceurs sont déposés sur leurs domaines et relèvent de leurs politiques respectives."
    },
    "mentions": {
      "metaTitle": "Mentions légales — AQWELIA",
      "metaDescription": "Identification de l’éditeur, hébergeur, directeur de publication et médiation.",
      "eyebrow": "INFORMATIONS LÉGALES",
      "title": "Mentions légales",
      "intro": "Les valeurs ci-dessous proviennent de la configuration de production. Les champs absents sont affichés comme bloquants plutôt que remplacés par des informations inventées.",
      "publisher": "Éditeur du service",
      "director": "Directeur de la publication",
      "hosting": "Hébergement",
      "consumer": "Médiation de la consommation",
      "intellectual": "Propriété intellectuelle",
      "intellectualBody": "Les marques, interfaces, textes, visuels, moteurs de calcul et éléments logiciels d’AQWELIA sont protégés. Toute réutilisation non autorisée est interdite, sous réserve des droits des tiers et des licences applicables.",
      "fields": {
        "publisherName": "Dénomination / nom",
        "legalForm": "Forme juridique",
        "capital": "Capital social",
        "registeredAddress": "Adresse du siège",
        "siren": "SIREN / SIRET",
        "register": "RCS / registre",
        "vat": "TVA intracommunautaire",
        "email": "E-mail",
        "phone": "Téléphone",
        "hostName": "Hébergeur",
        "hostAddress": "Adresse",
        "hostContact": "Téléphone / contact",
        "mediatorName": "Médiateur",
        "mediatorUrl": "Adresse / URL",
        "publicationDirector": "Directeur de la publication"
      },
      "missing": "Champ non renseigné — commercialisation bloquée."
    },
    "processors": {
      "metaTitle": "Sous-traitants et fournisseurs — AQWELIA",
      "metaDescription": "Liste transparente des catégories de prestataires susceptibles de traiter des données pour AQWELIA.",
      "eyebrow": "SOUS-TRAITANTS",
      "title": "Prestataires et destinataires",
      "intro": "Cette liste décrit les intégrations présentes dans le code. Un prestataire ne traite des données que si la fonction correspondante est configurée ou utilisée. Les contrats, localisations et garanties doivent être vérifiés avant l’activation commerciale.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Transparence sur l’intelligence artificielle — AQWELIA",
      "metaDescription": "Fonctions IA, limites, données transmises et contrôle humain dans AQWELIA.",
      "eyebrow": "TRANSPARENCE IA",
      "title": "Comment AQWELIA utilise l’IA",
      "intro": "AQWELIA combine des moteurs déterministes de calcul avec des modèles d’intelligence artificielle. Les dosages et règles de sécurité ne doivent pas dépendre d’une réponse libre non vérifiée.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Supprimer un compte AQWELIA",
      "metaDescription": "Chemin web public pour demander la suppression d’un compte et des données associées.",
      "eyebrow": "SUPPRESSION DU COMPTE",
      "title": "Supprimer votre compte AQWELIA",
      "intro": "Depuis l’application : Paramètres → Données personnelles → Supprimer mon compte. Cette page reste disponible si vous avez désinstallé l’application ou perdu l’accès.",
      "stepsTitle": "Avant la suppression",
      "steps": [
        "Exportez vos données depuis les paramètres si vous souhaitez en conserver une copie.",
        "Résiliez tout abonnement actif dans Stripe, l’App Store ou Google Play. La suppression du compte ne peut pas arrêter automatiquement un abonnement géré par une boutique.",
        "La suppression retire le compte et les données associées sans obligation de conservation. Les éléments requis pour la facturation, la prévention de la fraude ou un litige peuvent être minimisés et conservés pour la durée légale."
      ],
      "formTitle": "Demander la suppression par le web",
      "name": "Nom",
      "email": "E-mail du compte",
      "message": "Précisions facultatives",
      "submit": "Envoyer la demande",
      "success": "Votre demande a été enregistrée. Le support vérifiera l’identité du demandeur avant suppression.",
      "error": "La demande n’a pas pu être envoyée. Réessayez ou écrivez à privacy@aqwelia.app.",
      "signedIn": "Vous avez encore accès au compte ? Utilisez la suppression immédiate dans les paramètres."
    },
    "security": {
      "metaTitle": "Sécurité des données — AQWELIA",
      "metaDescription": "Mesures de sécurité réellement mises en œuvre et responsabilités partagées.",
      "eyebrow": "SÉCURITÉ",
      "title": "Sécurité et signalement",
      "intro": "AQWELIA applique une défense en profondeur proportionnée au service, sans promettre un risque nul ni revendiquer une certification non vérifiée.",
      "items": [
        "Mots de passe hachés avec scrypt ; secrets absents du code source.",
        "Sessions JWT et protections CSRF fournies par NextAuth.",
        "Contrôles d’accès et filtrage par utilisateur sur les routes privées.",
        "Signatures Stripe, secret RevenueCat et traitement idempotent des webhooks.",
        "Limitation de débit, Turnstile optionnel et journaux techniques.",
        "HTTPS fourni par l’infrastructure de déploiement en production.",
        "Images normalisées et métadonnées supprimées avant analyse."
      ],
      "contact": "Pour signaler une vulnérabilité sans exploiter ni divulguer de données : security@aqwelia.app. Aucune prime ni délai de réponse ne sont promis tant qu’un programme public n’est pas formalisé."
    },
    "accessibility": {
      "metaTitle": "Accessibilité — AQWELIA",
      "metaDescription": "État d’accessibilité, limites connues et canal de signalement.",
      "eyebrow": "ACCESSIBILITÉ",
      "title": "Démarche d’accessibilité",
      "intro": "AQWELIA vise une interface utilisable au clavier, lisible et compatible avec les technologies d’assistance. Aucun taux de conformité RGAA/WCAG n’est publié tant qu’un audit complet et indépendant n’a pas été réalisé.",
      "items": [
        "Composants sémantiques et libellés accessibles privilégiés.",
        "Contrastes, tailles tactiles et réduction des animations pris en compte dans le design system.",
        "Des défauts peuvent subsister, notamment dans les cartes, graphiques, contenus tiers et parcours mobiles."
      ],
      "contact": "Signalez un obstacle à accessibility@aqwelia.app ou via le formulaire de contact, en indiquant la page, l’appareil et l’aide technique utilisée."
    }
  },
  "en": {
    "common": {
      "lastUpdated": "Last updated",
      "statusIncomplete": "Mandatory information must be completed before commercial launch",
      "contact": "Contact",
      "learnMore": "Learn more",
      "manageCookies": "Manage cookies",
      "yes": "Yes",
      "no": "No",
      "processorsLink": "Processors",
      "aiTransparencyLink": "AI transparency",
      "deleteAccountLink": "Account deletion",
      "legalTranslationWarning": "",
      "cancelSubscriptionBeforeDeletion": "Cancel your active subscription in Stripe, the App Store or Google Play before trying account deletion again.",
      "transferOrganizationBeforeDeletion": "Transfer ownership or close your AQWELIA Pro organisation before deleting the account."
    },
    "consent": {
      "title": "Your privacy choices",
      "body": "Necessary trackers make AQWELIA work. PostHog analytics are optional and start only after your consent.",
      "necessaryTitle": "Necessary",
      "necessaryBody": "Authentication, security, language and remembering your choice. Always active.",
      "analyticsTitle": "Audience measurement",
      "analyticsBody": "Helps us understand product usage without advertising or selling data.",
      "accept": "Accept all",
      "reject": "Reject all",
      "customize": "Customize",
      "save": "Save my choices",
      "saveError": "Your choice could not be saved. No optional tracker was enabled. Please try again.",
      "close": "Close"
    },
    "aiNotice": {
      "label": "AI-generated content.",
      "body": "AQWELIA can be wrong: check measurements, product labels and safety instructions before acting.",
      "link": "How it works"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  },
  "es": {
    "common": {
      "lastUpdated": "Última actualización",
      "statusIncomplete": "Información obligatoria pendiente antes del lanzamiento comercial",
      "contact": "Contacto",
      "learnMore": "Más información",
      "manageCookies": "Gestionar cookies",
      "yes": "Sí",
      "no": "No",
      "processorsLink": "Encargados del tratamiento",
      "aiTransparencyLink": "Transparencia de IA",
      "deleteAccountLink": "Eliminación de la cuenta",
      "legalTranslationWarning": "Versión jurídica temporal en inglés. Se requiere una traducción profesional validada antes de comercializar el servicio en español.",
      "cancelSubscriptionBeforeDeletion": "Cancela primero tu suscripción activa en Stripe, App Store o Google Play y vuelve a solicitar la eliminación.",
      "transferOrganizationBeforeDeletion": "Transfiere la propiedad o cierra tu organización AQWELIA Pro antes de eliminar la cuenta."
    },
    "consent": {
      "title": "Tus opciones de privacidad",
      "body": "Los rastreadores necesarios permiten que AQWELIA funcione. Las estadísticas de PostHog son opcionales y solo se activan con tu consentimiento.",
      "necessaryTitle": "Necesarias",
      "necessaryBody": "Autenticación, seguridad, idioma y memoria de tu elección. Siempre activas.",
      "analyticsTitle": "Medición de audiencia",
      "analyticsBody": "Ayuda a comprender el uso sin publicidad ni venta de datos.",
      "accept": "Aceptar todo",
      "reject": "Rechazar todo",
      "customize": "Personalizar",
      "save": "Guardar mis opciones",
      "saveError": "No se pudo guardar tu elección. No se activó ningún rastreador opcional. Inténtalo de nuevo.",
      "close": "Cerrar"
    },
    "aiNotice": {
      "label": "Contenido generado con IA.",
      "body": "AQWELIA puede equivocarse: verifica las mediciones, etiquetas y normas de seguridad antes de actuar.",
      "link": "Cómo funciona"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  },
  "de": {
    "common": {
      "lastUpdated": "Zuletzt aktualisiert",
      "statusIncomplete": "Pflichtangaben müssen vor dem kommerziellen Start ergänzt werden",
      "contact": "Kontakt",
      "learnMore": "Mehr erfahren",
      "manageCookies": "Cookies verwalten",
      "yes": "Ja",
      "no": "Nein",
      "processorsLink": "Auftragsverarbeiter",
      "aiTransparencyLink": "KI-Transparenz",
      "deleteAccountLink": "Konto löschen",
      "legalTranslationWarning": "Vorläufige englische Rechtsfassung. Vor einer Vermarktung auf Deutsch ist eine professionell geprüfte Übersetzung erforderlich.",
      "cancelSubscriptionBeforeDeletion": "Kündigen Sie zuerst Ihr aktives Abonnement bei Stripe, im App Store oder bei Google Play und starten Sie die Kontolöschung erneut.",
      "transferOrganizationBeforeDeletion": "Übertragen Sie die Inhaberschaft oder schließen Sie Ihre AQWELIA-Pro-Organisation, bevor Sie das Konto löschen."
    },
    "consent": {
      "title": "Ihre Datenschutzauswahl",
      "body": "Notwendige Tracker ermöglichen AQWELIA. PostHog-Statistiken sind freiwillig und werden nur nach Einwilligung aktiviert.",
      "necessaryTitle": "Notwendig",
      "necessaryBody": "Authentifizierung, Sicherheit, Sprache und Speicherung Ihrer Auswahl. Immer aktiv.",
      "analyticsTitle": "Reichweitenmessung",
      "analyticsBody": "Hilft, die Produktnutzung ohne Werbung oder Datenverkauf zu verstehen.",
      "accept": "Alle akzeptieren",
      "reject": "Alle ablehnen",
      "customize": "Anpassen",
      "save": "Auswahl speichern",
      "saveError": "Ihre Auswahl konnte nicht gespeichert werden. Es wurde kein optionaler Tracker aktiviert. Bitte erneut versuchen.",
      "close": "Schließen"
    },
    "aiNotice": {
      "label": "KI-generierter Inhalt.",
      "body": "AQWELIA kann Fehler machen: Prüfen Sie Messwerte, Produktetiketten und Sicherheitshinweise.",
      "link": "Funktionsweise"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  },
  "it": {
    "common": {
      "lastUpdated": "Ultimo aggiornamento",
      "statusIncomplete": "Informazioni obbligatorie da completare prima del lancio commerciale",
      "contact": "Contatto",
      "learnMore": "Scopri di più",
      "manageCookies": "Gestisci cookie",
      "yes": "Sì",
      "no": "No",
      "processorsLink": "Responsabili del trattamento",
      "aiTransparencyLink": "Trasparenza IA",
      "deleteAccountLink": "Eliminazione dell’account",
      "legalTranslationWarning": "Versione legale temporanea in inglese. Prima della commercializzazione in italiano è necessaria una traduzione professionale convalidata.",
      "cancelSubscriptionBeforeDeletion": "Annulla prima l’abbonamento attivo in Stripe, App Store o Google Play, quindi riprova a eliminare l’account.",
      "transferOrganizationBeforeDeletion": "Trasferisci la proprietà o chiudi l’organizzazione AQWELIA Pro prima di eliminare l’account."
    },
    "consent": {
      "title": "Le tue scelte sulla privacy",
      "body": "I tracciatori necessari fanno funzionare AQWELIA. Le statistiche PostHog sono facoltative e si attivano solo con il consenso.",
      "necessaryTitle": "Necessari",
      "necessaryBody": "Autenticazione, sicurezza, lingua e memorizzazione della scelta. Sempre attivi.",
      "analyticsTitle": "Misurazione del pubblico",
      "analyticsBody": "Aiuta a capire l’uso del prodotto senza pubblicità o vendita di dati.",
      "accept": "Accetta tutto",
      "reject": "Rifiuta tutto",
      "customize": "Personalizza",
      "save": "Salva le scelte",
      "saveError": "Non è stato possibile salvare la scelta. Nessun tracciatore facoltativo è stato attivato. Riprova.",
      "close": "Chiudi"
    },
    "aiNotice": {
      "label": "Contenuto generato con IA.",
      "body": "AQWELIA può sbagliare: verifica misure, etichette e istruzioni di sicurezza.",
      "link": "Come funziona"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  },
  "pt": {
    "common": {
      "lastUpdated": "Última atualização",
      "statusIncomplete": "Informações obrigatórias a completar antes do lançamento comercial",
      "contact": "Contacto",
      "learnMore": "Saber mais",
      "manageCookies": "Gerir cookies",
      "yes": "Sim",
      "no": "Não",
      "processorsLink": "Subcontratantes",
      "aiTransparencyLink": "Transparência da IA",
      "deleteAccountLink": "Eliminação da conta",
      "legalTranslationWarning": "Versão jurídica temporária em inglês. É necessária uma tradução profissional validada antes da comercialização em português.",
      "cancelSubscriptionBeforeDeletion": "Cancele primeiro a subscrição ativa no Stripe, App Store ou Google Play e volte a pedir a eliminação.",
      "transferOrganizationBeforeDeletion": "Transfira a propriedade ou encerre a organização AQWELIA Pro antes de eliminar a conta."
    },
    "consent": {
      "title": "As suas escolhas de privacidade",
      "body": "Os rastreadores necessários permitem o funcionamento da AQWELIA. As estatísticas PostHog são opcionais e só são ativadas com consentimento.",
      "necessaryTitle": "Necessários",
      "necessaryBody": "Autenticação, segurança, idioma e memória da escolha. Sempre ativos.",
      "analyticsTitle": "Medição de audiência",
      "analyticsBody": "Ajuda a compreender a utilização sem publicidade ou venda de dados.",
      "accept": "Aceitar tudo",
      "reject": "Recusar tudo",
      "customize": "Personalizar",
      "save": "Guardar escolhas",
      "saveError": "Não foi possível guardar a sua escolha. Nenhum rastreador opcional foi ativado. Tente novamente.",
      "close": "Fechar"
    },
    "aiNotice": {
      "label": "Conteúdo gerado por IA.",
      "body": "A AQWELIA pode errar: confirme medições, rótulos e instruções de segurança.",
      "link": "Como funciona"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  },
  "nl": {
    "common": {
      "lastUpdated": "Laatst bijgewerkt",
      "statusIncomplete": "Verplichte informatie moet vóór commerciële lancering worden aangevuld",
      "contact": "Contact",
      "learnMore": "Meer informatie",
      "manageCookies": "Cookies beheren",
      "yes": "Ja",
      "no": "Nee",
      "processorsLink": "Verwerkers",
      "aiTransparencyLink": "AI-transparantie",
      "deleteAccountLink": "Account verwijderen",
      "legalTranslationWarning": "Tijdelijke Engelstalige juridische versie. Voor commerciële lancering in het Nederlands is een professioneel gevalideerde vertaling vereist.",
      "cancelSubscriptionBeforeDeletion": "Beëindig eerst uw actieve abonnement via Stripe, de App Store of Google Play en probeer daarna opnieuw uw account te verwijderen.",
      "transferOrganizationBeforeDeletion": "Draag het eigendom over of sluit uw AQWELIA Pro-organisatie voordat u het account verwijdert."
    },
    "consent": {
      "title": "Uw privacykeuzes",
      "body": "Noodzakelijke trackers laten AQWELIA werken. PostHog-statistieken zijn optioneel en starten alleen na toestemming.",
      "necessaryTitle": "Noodzakelijk",
      "necessaryBody": "Authenticatie, beveiliging, taal en het onthouden van uw keuze. Altijd actief.",
      "analyticsTitle": "Publieksmeting",
      "analyticsBody": "Helpt gebruik begrijpen zonder reclame of verkoop van gegevens.",
      "accept": "Alles accepteren",
      "reject": "Alles weigeren",
      "customize": "Aanpassen",
      "save": "Keuzes opslaan",
      "saveError": "Uw keuze kon niet worden opgeslagen. Er is geen optionele tracker geactiveerd. Probeer opnieuw.",
      "close": "Sluiten"
    },
    "aiNotice": {
      "label": "Door AI gegenereerde inhoud.",
      "body": "AQWELIA kan fouten maken: controleer metingen, productlabels en veiligheidsinstructies.",
      "link": "Hoe het werkt"
    },
    "privacy": {
      "metaTitle": "Privacy Policy — AQWELIA",
      "metaDescription": "Data processed, purposes, legal bases, retention, processors and GDPR rights in AQWELIA.",
      "eyebrow": "PRIVACY",
      "title": "Privacy Policy",
      "intro": "This policy describes the processing actually implemented in AQWELIA web and mobile services. It is separate from contractual terms.",
      "sections": [
        {
          "title": "1. Controller",
          "paragraphs": [
            "The publisher identified in the legal notice is the controller. Until its complete legal identity is configured, AQWELIA must not be commercially launched.",
            "Privacy requests: privacy@aqwelia.app."
          ]
        },
        {
          "title": "2. Data processed",
          "items": [
            "Account and authentication data.",
            "Pool, spa, equipment, water measurements, products and maintenance history.",
            "Normalized photos sent for AI analysis after metadata removal; AQWELIA retains the diagnosis and a private reference, not the normalized photo bytes.",
            "AI assistant messages and useful pool context.",
            "Subscription, Stripe/RevenueCat identifiers and billing events, never the full card number.",
            "Support and partnership form content.",
            "Optional PostHog usage events after consent.",
            "Professional data and, only if re-enabled, professional location data."
          ]
        },
        {
          "title": "3. Purposes and legal bases",
          "paragraphs": [
            "Core account, diagnostics, recommendations, support and subscription processing rely on contract performance or pre-contractual steps. Security and abuse prevention may rely on legitimate interests. Non-essential analytics and marketing rely on consent. Billing records are retained where required by law."
          ]
        },
        {
          "title": "4. AI and photos",
          "paragraphs": [
            "AI-labelled answers and diagnoses use configured third-party services, including NVIDIA. They are assistance, not decisions producing legal effects. The user remains in control. Do not upload faces, identity documents or unrelated personal data."
          ]
        },
        {
          "title": "5. Recipients and processors",
          "paragraphs": [
            "Access is limited to authorised people and providers needed for hosting, authentication, AI, payments, email, security and consented analytics. Some providers may process data outside the EEA under applicable safeguards. See the processors page."
          ]
        },
        {
          "title": "6. Retention",
          "items": [
            "Account and service history: while the account exists, then deletion or anonymisation unless retention is legally required.",
            "Normalized photo: transient processing and not retained by AQWELIA after analysis.",
            "Consent choice: six months; audit evidence for the period needed to demonstrate compliance.",
            "Support: for handling and limited dispute archiving.",
            "Paid orders and accounting records: applicable legal period, potentially ten years.",
            "Professional location: disabled by default and, if enabled, limited by each session retentionUntil date."
          ]
        },
        {
          "title": "7. Your rights",
          "paragraphs": [
            "You may request access, correction, deletion, restriction, objection, portability and withdrawal of consent. Export and deletion are available in settings and through the public deletion page. You may complain to your local supervisory authority."
          ]
        },
        {
          "title": "8. Account deletion",
          "paragraphs": [
            "Active subscriptions must first be cancelled through the purchase channel. Data not subject to retention duties is deleted; legally required records are separated from the account or minimised."
          ]
        },
        {
          "title": "9. Security and changes",
          "paragraphs": [
            "AQWELIA uses proportionate access controls, tenant isolation, password hashing, HTTPS, signed webhooks, rate limiting and technical logging. No system can guarantee zero risk. This policy is updated when processing or providers change."
          ]
        }
      ]
    },
    "cookies": {
      "metaTitle": "Cookie Policy — AQWELIA",
      "metaDescription": "Necessary trackers, optional analytics and consent management in AQWELIA.",
      "eyebrow": "COOKIES",
      "title": "Cookie and tracker policy",
      "intro": "AQWELIA activates audience-measurement trackers only after a positive choice. Rejecting is as easy as accepting, and choices can be changed at any time.",
      "necessaryTitle": "Necessary trackers",
      "analyticsTitle": "Optional analytics trackers",
      "manageBody": "Use the button below to reopen preferences. The choice is requested again no later than six months or when purposes change.",
      "tableHeaders": [
        "Name or family",
        "Purpose",
        "Indicative duration",
        "Status"
      ],
      "rows": [
        [
          "next-auth.session-token / __Secure-next-auth.session-token",
          "Authenticated session and account protection",
          "Up to 30 days",
          "Necessary"
        ],
        [
          "next-auth.csrf-token / callback-url",
          "Secure sign-in and redirects",
          "Session or short duration",
          "Necessary"
        ],
        [
          "NEXT_LOCALE",
          "Interface language",
          "1 year",
          "Necessary / preference"
        ],
        [
          "aqwelia_consent_v2",
          "Remember analytics choice",
          "6 months",
          "Necessary"
        ],
        [
          "ph_* (PostHog)",
          "Audience measurement and explicit usage events",
          "According to configuration, limited by AQWELIA policy",
          "Optional — consent"
        ],
        [
          "Cloudflare Turnstile",
          "Automated-registration prevention when enabled",
          "Challenge / security duration",
          "Security necessary"
        ]
      ],
      "thirdParties": "Stripe, Apple, Google or RevenueCat may use their own trackers when you open their authentication or payment flows on their domains."
    },
    "mentions": {
      "metaTitle": "Legal notice — AQWELIA",
      "metaDescription": "Publisher, hosting, publication director and consumer mediation details.",
      "eyebrow": "LEGAL INFORMATION",
      "title": "Legal notice",
      "intro": "Values are read from production configuration. Missing mandatory fields are shown as blockers instead of being invented.",
      "publisher": "Service publisher",
      "director": "Publication director",
      "hosting": "Hosting",
      "consumer": "Consumer mediation",
      "intellectual": "Intellectual property",
      "intellectualBody": "AQWELIA marks, interfaces, text, visuals, calculation engines and software are protected, subject to third-party rights and applicable licences.",
      "fields": {
        "publisherName": "Publisher name",
        "legalForm": "Legal form",
        "capital": "Share capital",
        "registeredAddress": "Registered office",
        "siren": "Registration number",
        "register": "Commercial register",
        "vat": "VAT number",
        "email": "Email",
        "phone": "Phone",
        "hostName": "Hosting provider",
        "hostAddress": "Hosting address",
        "hostContact": "Hosting contact",
        "mediatorName": "Consumer mediator",
        "mediatorUrl": "Mediator address / URL",
        "publicationDirector": "Publication director"
      },
      "missing": "Missing field — commercial launch blocked."
    },
    "processors": {
      "metaTitle": "Processors and providers — AQWELIA",
      "metaDescription": "Transparent list of providers that may process data for AQWELIA.",
      "eyebrow": "PROCESSORS",
      "title": "Providers and recipients",
      "intro": "This list reflects integrations present in the code. A provider processes data only when the related feature is configured or used.",
      "headers": [
        "Prestataire / catégorie",
        "Rôle",
        "Données concernées",
        "Activation"
      ],
      "rows": [
        [
          "Vercel",
          "Hébergement et diffusion de l’application",
          "Requêtes, journaux techniques, données applicatives selon configuration",
          "Actif en déploiement"
        ],
        [
          "Base PostgreSQL configurée",
          "Stockage applicatif",
          "Compte, bassins, historique, données Pro et transactions",
          "Actif selon environnement"
        ],
        [
          "NVIDIA",
          "Analyse IA et génération de réponses",
          "Image normalisée, messages et contexte strictement utile",
          "Lors d’une fonction IA"
        ],
        [
          "Stripe",
          "Paiement web et gestion d’abonnement",
          "Identifiants client/abonnement, statut et événements de facturation",
          "Lors d’un achat web"
        ],
        [
          "RevenueCat / Apple / Google",
          "Achats intégrés mobiles et restauration",
          "Identifiant utilisateur, produit, transaction et statut",
          "Lors d’un achat mobile"
        ],
        [
          "Google et Apple",
          "Authentification sociale",
          "Identité du fournisseur et e-mail lorsqu’il est communiqué",
          "Au choix de l’utilisateur"
        ],
        [
          "Cloudflare Turnstile",
          "Prévention des robots",
          "Jeton de défi, IP et signaux de sécurité traités par Cloudflare",
          "Lorsque configuré"
        ],
        [
          "PostHog",
          "Statistiques produit",
          "Événements d’usage et identifiant utilisateur",
          "Seulement après consentement"
        ],
        [
          "Fournisseur SMTP configuré",
          "E-mails transactionnels et support",
          "Adresse e-mail et contenu du message",
          "Lorsque configuré"
        ],
        [
          "wttr.in / fournisseur météo configuré",
          "Météo et alertes liées au bassin",
          "Localité ou zone demandée",
          "Lors d’une consultation météo"
        ]
      ],
      "note": "La présence d’un SDK ne vaut pas activation. AQWELIA doit maintenir ses contrats de sous-traitance et ses déclarations App Store / Google Play cohérents avec la configuration réellement déployée."
    },
    "ai": {
      "metaTitle": "Artificial intelligence transparency — AQWELIA",
      "metaDescription": "AI features, limits, transferred data and human control in AQWELIA.",
      "eyebrow": "AI TRANSPARENCY",
      "title": "How AQWELIA uses AI",
      "intro": "AQWELIA combines deterministic calculation engines with AI models. Safety-critical dosing and rules must not depend on an unchecked free-form answer.",
      "sections": [
        {
          "title": "Fonctions concernées",
          "items": [
            "Assistant conversationnel Lagoon.",
            "Analyse de photos d’eau, de bandelettes et d’équipements.",
            "Synthèses, explications et recommandations contextualisées.",
            "Fonctions Pro/Growth assistées lorsque leur module est activé."
          ]
        },
        {
          "title": "Information de l’utilisateur",
          "paragraphs": [
            "Les contenus générés ou reformulés par une IA sont accompagnés d’un indicateur visible. Une réponse IA peut être inexacte ou incomplète."
          ]
        },
        {
          "title": "Contrôle humain et sécurité",
          "paragraphs": [
            "AQWELIA n’utilise pas ces fonctions pour prendre une décision produisant un effet juridique à votre place. Vérifiez les mesures, l’étiquette du produit, les incompatibilités chimiques et les délais de baignade. En cas de risque électrique, sanitaire ou chimique, cessez l’action et consultez un professionnel."
          ]
        },
        {
          "title": "Données transmises",
          "paragraphs": [
            "Seules les données utiles à la requête sont envoyées au fournisseur configuré. Pour les photos, AQWELIA normalise le fichier et retire les métadonnées avant transmission. Ne photographiez pas de personnes ni de documents personnels."
          ]
        },
        {
          "title": "Contestation et contact",
          "paragraphs": [
            "Vous pouvez signaler une réponse incorrecte, demander une explication ou exercer vos droits à privacy@aqwelia.app."
          ]
        }
      ]
    },
    "deletion": {
      "metaTitle": "Delete an AQWELIA account",
      "metaDescription": "Public web path to request account and associated data deletion.",
      "eyebrow": "ACCOUNT DELETION",
      "title": "Delete your AQWELIA account",
      "intro": "In the app: Settings → Personal data → Delete my account. This page remains available after uninstalling the app or losing access.",
      "stepsTitle": "Before deletion",
      "steps": [
        "Export your data from settings if you want a copy.",
        "Cancel active subscriptions in Stripe, the App Store or Google Play. Account deletion cannot automatically stop a store-managed subscription.",
        "Data without a retention duty is deleted. Records required for billing, fraud prevention or disputes may be minimised and retained for the legal period."
      ],
      "formTitle": "Request deletion on the web",
      "name": "Name",
      "email": "Account email",
      "message": "Optional details",
      "submit": "Send request",
      "success": "Your request has been recorded. Support will verify the requester’s identity before deletion.",
      "error": "The request could not be sent. Try again or email privacy@aqwelia.app.",
      "signedIn": "Still have access? Use immediate deletion in settings."
    },
    "security": {
      "metaTitle": "Data security — AQWELIA",
      "metaDescription": "Implemented security measures and shared responsibilities.",
      "eyebrow": "SECURITY",
      "title": "Security and reporting",
      "intro": "AQWELIA applies proportionate defence in depth without promising zero risk or claiming unverified certification.",
      "items": [
        "Passwords hashed with scrypt; secrets kept out of source code.",
        "JWT sessions and CSRF protection through NextAuth.",
        "Access controls and user-level filtering on private routes.",
        "Signed Stripe webhooks, RevenueCat secret and idempotent processing.",
        "Rate limiting, optional Turnstile and technical logs.",
        "HTTPS through production deployment infrastructure.",
        "Images normalised and metadata removed before analysis."
      ],
      "contact": "Report a vulnerability without exploiting or disclosing data to security@aqwelia.app. No bounty or response deadline is promised until a public programme exists."
    },
    "accessibility": {
      "metaTitle": "Accessibility — AQWELIA",
      "metaDescription": "Accessibility approach, known limits and reporting channel.",
      "eyebrow": "ACCESSIBILITY",
      "title": "Accessibility approach",
      "intro": "AQWELIA aims for keyboard usability, readability and assistive-technology compatibility. No RGAA/WCAG compliance rate is published before a complete independent audit.",
      "items": [
        "Semantic components and accessible labels are preferred.",
        "Contrast, touch targets and reduced motion are considered in the design system.",
        "Issues may remain in maps, charts, third-party content and mobile flows."
      ],
      "contact": "Report a barrier to accessibility@aqwelia.app or through the contact form, including the page, device and assistive technology used."
    }
  }
} as const

export function getComplianceCopy(locale: string | null | undefined) {
  return COMPLIANCE_COPY[normalizeLocale(locale)]
}

export type ComplianceLocale = Locale

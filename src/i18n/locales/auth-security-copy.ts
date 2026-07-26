export const AUTH_SECURITY_COPY = {
  fr: {
    oauthAccountNotLinked: 'Un compte existe déjà avec cette adresse. Connectez-vous avec votre méthode habituelle avant de lier Google ou Apple depuis les paramètres.',
    turnstileUnavailable: 'La vérification anti-robot est indisponible. Réessayez dans quelques instants.',
    botVerificationFailed: 'La vérification anti-robot a échoué. Actualisez la page puis réessayez.',
  },
  en: {
    oauthAccountNotLinked: 'An account already exists with this address. Sign in with your usual method before linking Google or Apple from settings.',
    turnstileUnavailable: 'The anti-bot check is unavailable. Please try again shortly.',
    botVerificationFailed: 'The anti-bot check failed. Refresh the page and try again.',
  },
  es: {
    oauthAccountNotLinked: 'Ya existe una cuenta con esta dirección. Inicia sesión con tu método habitual antes de vincular Google o Apple desde los ajustes.',
    turnstileUnavailable: 'La verificación antirrobot no está disponible. Inténtalo de nuevo en unos instantes.',
    botVerificationFailed: 'La verificación antirrobot ha fallado. Actualiza la página e inténtalo de nuevo.',
  },
  de: {
    oauthAccountNotLinked: 'Für diese Adresse besteht bereits ein Konto. Melden Sie sich zuerst wie gewohnt an und verknüpfen Sie Google oder Apple anschließend in den Einstellungen.',
    turnstileUnavailable: 'Die Bot-Prüfung ist momentan nicht verfügbar. Bitte versuchen Sie es gleich erneut.',
    botVerificationFailed: 'Die Bot-Prüfung ist fehlgeschlagen. Laden Sie die Seite neu und versuchen Sie es erneut.',
  },
  it: {
    oauthAccountNotLinked: 'Esiste già un account con questo indirizzo. Accedi con il metodo abituale prima di collegare Google o Apple dalle impostazioni.',
    turnstileUnavailable: 'La verifica anti-bot non è disponibile. Riprova tra poco.',
    botVerificationFailed: 'La verifica anti-bot non è riuscita. Aggiorna la pagina e riprova.',
  },
  pt: {
    oauthAccountNotLinked: 'Já existe uma conta com este endereço. Inicie sessão pelo método habitual antes de associar Google ou Apple nas definições.',
    turnstileUnavailable: 'A verificação anti-robô está indisponível. Tente novamente dentro de instantes.',
    botVerificationFailed: 'A verificação anti-robô falhou. Atualize a página e tente novamente.',
  },
  nl: {
    oauthAccountNotLinked: 'Er bestaat al een account met dit adres. Meld u eerst op de gebruikelijke manier aan en koppel Google of Apple daarna via de instellingen.',
    turnstileUnavailable: 'De ant botcontrole is niet beschikbaar. Probeer het over enkele ogenblikken opnieuw.',
    botVerificationFailed: 'De ant botcontrole is mislukt. Vernieuw de pagina en probeer het opnieuw.',
  },
} as const

export type AuthSecurityLocale = keyof typeof AUTH_SECURITY_COPY

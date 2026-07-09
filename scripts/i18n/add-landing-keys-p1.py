#!/usr/bin/env python3
"""
Batch-add the 41 new landing-page keys (P1-LANDING phase) to ES/DE/IT/PT/NL
locale files, plus update the 2 existing finalCta* keys.

Per-locale translations are defined below. The script is idempotent: re-running
it overwrites the new keys with the same values.

Keys (43 operations per locale = 41 new + 2 updates):
- 14 FAQ keys (faqProReplace / faqProReplaceA ... faqProVersion / faqProVersionA)
- 14 ProPreview keys (proPreviewEyebrow ... proPreviewCta)
- 13 CarePreview keys (carePreviewEyebrow ... carePreviewCta)
- 2 FinalCta updates (finalCtaTitle, finalCtaStart)
"""

import json
import os
import sys

LOCALES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'src', 'i18n', 'locales',
)

TARGET_LANGS = ['es', 'de', 'it', 'pt', 'nl']

# ----------------------------------------------------------------------------
# Per-language translation tables
# ----------------------------------------------------------------------------

TRANSLATIONS = {
    # =========================== ES (Spanish) ===========================
    'es': {
        # FAQ
        'faqProReplace': '¿AQWELIA sustituye a un piscinista?',
        'faqProReplaceA': 'No — lo complementa. El piscinista viene 1 vez por semana; AQWELIA cubre los otros 6 días, gestiona las urgencias y le ayuda a entender su agua. Muchos usuarios conservan a su piscinista y usan AQWELIA en paralelo.',
        'faqHowIA': '¿Cómo funciona el análisis por IA?',
        'faqHowIAA': 'La IA analiza sus fotos de tiras, agua y piscina, combina estos datos con su historial químico y el clima, y luego ofrece un diagnóstico con un nivel de confianza. Los cálculos críticos de dosificación los realiza un motor determinista, no la IA.',
        'faqSpaManage': '¿Puedo gestionar un spa?',
        'faqSpaManageA': 'Sí. AQWELIA gestiona spas con características dedicadas: tratamiento con bromo u oxígeno activo, supervisión de temperatura, recordatorios de vaciado y programas de filtración adaptados. Disponible a partir del plan Lagoon.',
        'faqSellProducts': '¿La aplicación vende productos?',
        'faqSellProductsA': 'AQWELIA no vende productos directamente. Cuando se detecta una necesidad, la app le recomienda el producto adecuado, en la dosis correcta, y le indica dónde comprarlo cerca de usted. AQWELIA Care, disponible pronto, automatizará estas recomendaciones.',
        'faqGreenWater': '¿Qué pasa si mi agua se vuelve verde?',
        'faqGreenWaterA': 'AQWELIA detecta los signos de algas, identifica la causa probable (cloro insuficiente, pH desequilibrado, filtración demasiado corta) y le ofrece un plan de acción paso a paso: tratamiento de choque, limpieza, ajuste del pH y duración de filtración adaptada.',
        'faqAllYear': '¿AQWELIA funciona todo el año?',
        'faqAllYearA': 'Sí. En temporada, la app gestiona los análisis y dosificaciones. Durante la hibernación, le indica cuándo y cómo hibernar, supervisa la cubierta y le prepara la reapertura en primavera con un plan de relleno.',
        'faqProVersion': '¿Existe una versión para profesionales?',
        'faqProVersionA': 'Sí — AQWELIA Pro, disponible pronto, está diseñada para piscinistas: gestión de clientes y piscinas, planificación optimizada, justificantes de paso, informes PDF personalizados y estadísticas. Inscríbase para un acceso anticipado.',
        # ProPreview
        'proPreviewEyebrow': '13 — AQWELIA Pro',
        'proPreviewTitle': '¿Mantiene las piscinas de sus clientes?',
        'proPreviewSubtitle': 'AQWELIA Pro: gestione sus clientes, intervenciones y piscinas desde una única plataforma inteligente.',
        'proPreviewBadge': 'Early Access',
        'proPreviewBadgeText': 'Disponible pronto',
        'proPreviewCard1Title': 'Gestión de clientes',
        'proPreviewCard1Text': 'Fichas de clientes, piscinas, historial químico',
        'proPreviewCard2Title': 'Planificación e intervenciones',
        'proPreviewCard2Text': 'Rutas optimizadas, justificantes de paso, fotos antes/después',
        'proPreviewCard3Title': 'Informes y actas',
        'proPreviewCard3Text': 'Informes PDF personalizados, estadísticas, exportaciones',
        'proPreviewCard4Title': 'Recomendaciones Care',
        'proPreviewCard4Text': 'Ingresos adicionales a través de AQWELIA Care',
        'proPreviewCta': 'Descubrir AQWELIA Pro',
        # CarePreview
        'carePreviewEyebrow': '14 — AQWELIA Care',
        'carePreviewTitle': 'El producto adecuado, en el momento adecuado, en la cantidad correcta.',
        'carePreviewSubtitle': 'AQWELIA Care no se limita a listar un catálogo: le guía en cada paso, desde la necesidad detectada hasta la cesta.',
        'carePreviewBadge': 'Disponible pronto',
        'carePreviewStep1': 'AQWELIA detecta la necesidad',
        'carePreviewStep1Text': 'A partir de su último análisis, del historial y del clima, la app identifica el producto necesario.',
        'carePreviewStep2': 'AQWELIA calcula la cantidad',
        'carePreviewStep2Text': 'El motor determinista calcula la dosis exacta según su volumen de agua y sus parámetros actuales.',
        'carePreviewStep3': 'AQWELIA verifica la compatibilidad',
        'carePreviewStep3Text': 'La app comprueba que el producto sea compatible con su tratamiento, su equipo y sus otros productos.',
        'carePreviewStep4': 'El producto se puede añadir a la cesta',
        'carePreviewStep4Text': 'Una vez validado, añada el producto a la cesta con un clic y cómprelo donde quiera.',
        'carePreviewCta': 'Descubrir AQWELIA Care',
        # FinalCta (update existing)
        'finalCtaTitle': 'Tome por fin el control del mantenimiento de su piscina.',
        'finalCtaStart': 'Empezar gratis',
    },
    # =========================== DE (German) ===========================
    'de': {
        'faqProReplace': 'Ersetzt AQWELIA einen Poolfachmann?',
        'faqProReplaceA': 'Nein — es ergänzt ihn. Der Poolfachmann kommt einmal pro Woche; AQWELIA deckt die anderen 6 Tage ab, kümmert sich um Notfälle und hilft Ihnen, Ihr Wasser zu verstehen. Viele Nutzer behalten ihren Poolfachmann und nutzen AQWELIA parallel.',
        'faqHowIA': 'Wie funktioniert die KI-Analyse?',
        'faqHowIAA': 'Die KI analysiert Ihre Fotos von Teststreifen, Wasser und Pool, kombiniert diese Daten mit Ihrem chemischen Verlauf und dem Wetter und liefert dann eine Diagnose mit Konfidenzniveau. Kritische Dosierungsberechnungen werden von einer deterministischen Engine durchgeführt, nicht von der KI.',
        'faqSpaManage': 'Kann ich einen Spa verwalten?',
        'faqSpaManageA': 'Ja. AQWELIA verwaltet Spas mit speziellen Funktionen: Brom- oder Aktivsauerstoff-Behandlung, Temperaturüberwachung, Erinnerungen an Wasserwechsel und angepasste Filterprogramme. Verfügbar ab dem Lagoon-Tarif.',
        'faqSellProducts': 'Verkauft die App Produkte?',
        'faqSellProductsA': 'AQWELIA verkauft keine Produkte direkt. Wenn ein Bedarf erkannt wird, empfiehlt die App das richtige Produkt in der richtigen Dosierung und zeigt Ihnen, wo Sie es in Ihrer Nähe kaufen können. AQWELIA Care, bald verfügbar, wird diese Empfehlungen automatisieren.',
        'faqGreenWater': 'Was passiert, wenn mein Wasser grün wird?',
        'faqGreenWaterA': 'AQWELIA erkennt Algenzeichen, identifiziert die wahrscheinliche Ursache (zu wenig Chlor, unausgeglichener pH-Wert, zu kurze Filterlaufzeit) und bietet Ihnen einen Schritt-für-Schritt-Aktionsplan: Stoßbehandlung, Reinigung, pH-Anpassung und angepasste Filterlaufzeit.',
        'faqAllYear': 'Funktioniert AQWELIA das ganze Jahr über?',
        'faqAllYearA': 'Ja. In der Saison übernimmt die App Analysen und Dosierungen. Während der Überwinterung sagt sie Ihnen, wann und wie Sie das Winterfestmachen durchführen, überwacht die Abdeckung und bereitet die Wiedereröffnung im Frühling mit einem Wiederbefüllungsplan vor.',
        'faqProVersion': 'Gibt es eine Version für Profis?',
        'faqProVersionA': 'Ja — AQWELIA Pro, bald verfügbar, ist für Poolfachleute konzipiert: Kunden- und Poolverwaltung, optimierte Planung, Besuchsnachweise, individuelle PDF-Berichte und Statistiken. Melden Sie sich für frühen Zugang an.',
        'proPreviewEyebrow': '13 — AQWELIA Pro',
        'proPreviewTitle': 'Pflegen Sie die Pools Ihrer Kunden?',
        'proPreviewSubtitle': 'AQWELIA Pro: Verwalten Sie Kunden, Einsätze und Pools von einer einzigen intelligenten Plattform aus.',
        'proPreviewBadge': 'Early Access',
        'proPreviewBadgeText': 'Bald verfügbar',
        'proPreviewCard1Title': 'Kundenverwaltung',
        'proPreviewCard1Text': 'Kundenakten, Pools, chemischer Verlauf',
        'proPreviewCard2Title': 'Planung & Einsätze',
        'proPreviewCard2Text': 'Optimierte Touren, Besuchsnachweise, Vorher-/Nachher-Fotos',
        'proPreviewCard3Title': 'Berichte & Protokolle',
        'proPreviewCard3Text': 'Individuelle PDF-Berichte, Statistiken, Exporte',
        'proPreviewCard4Title': 'Care-Empfehlungen',
        'proPreviewCard4Text': 'Zusätzliche Einnahmen durch AQWELIA Care',
        'proPreviewCta': 'AQWELIA Pro entdecken',
        'carePreviewEyebrow': '14 — AQWELIA Care',
        'carePreviewTitle': 'Das richtige Produkt, zur richtigen Zeit, in der richtigen Menge.',
        'carePreviewSubtitle': 'AQWELIA Care listet nicht einfach einen Katalog auf: Es begleitet Sie bei jedem Schritt — vom erkannten Bedarf bis zum Warenkorb.',
        'carePreviewBadge': 'Bald verfügbar',
        'carePreviewStep1': 'AQWELIA erkennt den Bedarf',
        'carePreviewStep1Text': 'Aus Ihrer letzten Analyse, dem Verlauf und dem Wetter identifiziert die App das benötigte Produkt.',
        'carePreviewStep2': 'AQWELIA berechnet die Menge',
        'carePreviewStep2Text': 'Die deterministische Engine berechnet die exakte Dosis basierend auf Ihrem Wasservolumen und den aktuellen Parametern.',
        'carePreviewStep3': 'AQWELIA prüft die Kompatibilität',
        'carePreviewStep3Text': 'Die App überprüft, ob das Produkt mit Ihrer Behandlung, Ihrer Ausrüstung und Ihren anderen Produkten kompatibel ist.',
        'carePreviewStep4': 'Das Produkt kann in den Warenkorb',
        'carePreviewStep4Text': 'Sobald validiert, legen Sie das Produkt mit einem Klick in den Warenkorb und kaufen es, wo Sie möchten.',
        'carePreviewCta': 'AQWELIA Care entdecken',
        'finalCtaTitle': 'Übernehmen Sie endlich die Kontrolle über Ihre Poolpflege.',
        'finalCtaStart': 'Kostenlos starten',
    },
    # =========================== IT (Italian) ===========================
    'it': {
        'faqProReplace': 'AQWELIA sostituisce un piscinaiolo?',
        'faqProReplaceA': "No — lo completa. Il piscinaiolo viene 1 volta a settimana; AQWELIA copre gli altri 6 giorni, gestisce le urgenze e ti aiuta a capire la tua acqua. Molti utenti tengono il loro piscinaiolo e usano AQWELIA in parallelo.",
        'faqHowIA': "Come funziona l'analisi con IA?",
        'faqHowIAA': "L'IA analizza le tue foto di strisce, acqua e piscina, combina questi dati con lo storico chimico e il meteo, quindi fornisce una diagnosi con un livello di confidenza. I calcoli critici di dosaggio sono eseguiti da un motore deterministico, non dall'IA.",
        'faqSpaManage': 'Posso gestire una spa?',
        'faqSpaManageA': 'Sì. AQWELIA gestisce le spa con funzioni dedicate: trattamento a bromo o ossigeno attivo, monitoraggio della temperatura, promemoria di svuotamento e programmi di filtrazione adattati. Disponibile dal piano Lagoon.',
        'faqSellProducts': "L'app vende prodotti?",
        'faqSellProductsA': "AQWELIA non vende prodotti direttamente. Quando viene rilevato un bisogno, l'app ti consiglia il prodotto giusto, al dosaggio giusto, e ti indica dove acquistarlo vicino a te. AQWELIA Care, in arrivo, automatizzerà questi consigli.",
        'faqGreenWater': 'Cosa succede se la mia acqua diventa verde?',
        'faqGreenWaterA': 'AQWELIA rileva i segni di alghe, identifica la causa probabile (cloro insufficiente, pH squilibrato, filtrazione troppo breve) e ti offre un piano d\'azione passo per passo: trattamento shock, pulizia, regolazione del pH e durata di filtrazione adattata.',
        'faqAllYear': 'AQWELIA funziona tutto l\'anno?',
        'faqAllYearA': "Sì. In stagione, l'app gestisce analisi e dosaggi. Durante lo svernamento, ti indica quando e come svernare, sorveglia la copertura e ti prepara la riapertura in primavera con un piano di rabbocco.",
        'faqProVersion': 'Esiste una versione per professionisti?',
        'faqProVersionA': 'Sì — AQWELIA Pro, in arrivo, è pensata per i piscinaioli: gestione clienti e piscine, pianificazione ottimizzata, prove di passaggio, report PDF personalizzati e statistiche. Iscriviti per un accesso anticipato.',
        'proPreviewEyebrow': '13 — AQWELIA Pro',
        'proPreviewTitle': 'Dài manutenzione alle piscine dei tuoi clienti?',
        'proPreviewSubtitle': 'AQWELIA Pro: gestisci clienti, interventi e piscine da un\'unica piattaforma intelligente.',
        'proPreviewBadge': 'Early Access',
        'proPreviewBadgeText': 'In arrivo',
        'proPreviewCard1Title': 'Gestione clienti',
        'proPreviewCard1Text': 'Schede clienti, piscine, storico chimico',
        'proPreviewCard2Title': 'Pianificazione e interventi',
        'proPreviewCard2Text': 'Percorsi ottimizzati, prove di passaggio, foto prima/dopo',
        'proPreviewCard3Title': 'Report e verbali',
        'proPreviewCard3Text': 'Report PDF personalizzati, statistiche, export',
        'proPreviewCard4Title': 'Consigli Care',
        'proPreviewCard4Text': 'Ricavi aggiuntivi tramite AQWELIA Care',
        'proPreviewCta': 'Scopri AQWELIA Pro',
        'carePreviewEyebrow': '14 — AQWELIA Care',
        'carePreviewTitle': 'Il prodotto giusto, al momento giusto, nella giusta quantità.',
        'carePreviewSubtitle': 'AQWELIA Care non si limita a elencare un catalogo: ti guida a ogni passo, dal bisogno rilevato al carrello.',
        'carePreviewBadge': 'In arrivo',
        'carePreviewStep1': 'AQWELIA rileva il bisogno',
        'carePreviewStep1Text': "A partire dall'ultima analisi, dallo storico e dal meteo, l'app identifica il prodotto necessario.",
        'carePreviewStep2': 'AQWELIA calcola la quantità',
        'carePreviewStep2Text': 'Il motore deterministico calcola la dose esatta in base al tuo volume d\'acqua e ai parametri attuali.',
        'carePreviewStep3': 'AQWELIA verifica la compatibilità',
        'carePreviewStep3Text': "L'app controlla che il prodotto sia compatibile con il tuo trattamento, la tua attrezzatura e gli altri tuoi prodotti.",
        'carePreviewStep4': 'Il prodotto può essere aggiunto al carrello',
        'carePreviewStep4Text': 'Una volta convalidato, aggiungi il prodotto al carrello con un clic e acquistalo dove vuoi.',
        'carePreviewCta': 'Scopri AQWELIA Care',
        'finalCtaTitle': 'Prendi finalmente il controllo della manutenzione della tua piscina.',
        'finalCtaStart': 'Inizia gratis',
    },
    # =========================== PT (Portuguese) ===========================
    'pt': {
        'faqProReplace': 'A AQWELIA substitui um piscinastra?',
        'faqProReplaceA': 'Não — ela complementa. O piscinastra vem 1 vez por semana; a AQWELIA cobre os outros 6 dias, gere as urgências e ajuda-o a compreender a sua água. Muitos utilizadores mantêm o seu piscinastra e usam a AQWELIA em paralelo.',
        'faqHowIA': 'Como funciona a análise por IA?',
        'faqHowIAA': 'A IA analisa as suas fotos de fitas, água e piscina, combina estes dados com o seu histórico químico e o clima e, em seguida, oferece um diagnóstico com um nível de confiança. Os cálculos críticos de dosagem são efetuados por um motor determinístico, não pela IA.',
        'faqSpaManage': 'Posso gerir um spa?',
        'faqSpaManageA': 'Sim. A AQWELIA gere spas com funcionalidades dedicadas: tratamento com bromo ou oxigénio ativo, monitorização da temperatura, lembretes de drenagem e programas de filtração adaptados. Disponível a partir do plano Lagoon.',
        'faqSellProducts': 'A app vende produtos?',
        'faqSellProductsA': 'A AQWELIA não vende produtos diretamente. Quando é detetada uma necessidade, a app recomenda o produto certo, na dose certa, e indica onde o comprar perto de si. A AQWELIA Care, em breve, automatizará estas recomendações.',
        'faqGreenWater': 'O que acontece se a minha água ficar verde?',
        'faqGreenWaterA': 'A AQWELIA deteta sinais de algas, identifica a causa provável (cloro insuficiente, pH desequilibrado, filtração demasiado curta) e oferece-lhe um plano de ação passo a passo: tratamento de choque, limpeza, ajuste do pH e duração de filtração adaptada.',
        'faqAllYear': 'A AQWELIA funciona o ano todo?',
        'faqAllYearA': 'Sim. Na época, a app gere as análises e dosagens. Durante o invernagem, indica quando e como invernar, vigia a cobertura e prepara a reabertura na primavera com um plano de reabastecimento.',
        'faqProVersion': 'Existe uma versão para profissionais?',
        'faqProVersionA': 'Sim — a AQWELIA Pro, em breve, foi concebida para piscinastras: gestão de clientes e piscinas, planeamento otimizado, comprovativos de passagem, relatórios PDF personalizados e estatísticas. Inscreva-se para um acesso antecipado.',
        'proPreviewEyebrow': '13 — AQWELIA Pro',
        'proPreviewTitle': 'Faz a manutenção das piscinas dos seus clientes?',
        'proPreviewSubtitle': 'AQWELIA Pro: faça a gestão dos seus clientes, intervenções e piscinas a partir de uma única plataforma inteligente.',
        'proPreviewBadge': 'Early Access',
        'proPreviewBadgeText': 'Em breve',
        'proPreviewCard1Title': 'Gestão de clientes',
        'proPreviewCard1Text': 'Fichas de clientes, piscinas, histórico químico',
        'proPreviewCard2Title': 'Planeamento e intervenções',
        'proPreviewCard2Text': 'Rotas otimizadas, comprovativos de passagem, fotos antes/depois',
        'proPreviewCard3Title': 'Relatórios e atas',
        'proPreviewCard3Text': 'Relatórios PDF personalizados, estatísticas, exportações',
        'proPreviewCard4Title': 'Recomendações Care',
        'proPreviewCard4Text': 'Receitas adicionais através da AQWELIA Care',
        'proPreviewCta': 'Descobrir a AQWELIA Pro',
        'carePreviewEyebrow': '14 — AQWELIA Care',
        'carePreviewTitle': 'O produto certo, no momento certo, na quantidade certa.',
        'carePreviewSubtitle': 'A AQWELIA Care não se limita a listar um catálogo: guia-o em cada passo, desde a necessidade detetada até ao carrinho.',
        'carePreviewBadge': 'Em breve',
        'carePreviewStep1': 'A AQWELIA deteta a necessidade',
        'carePreviewStep1Text': 'A partir da sua última análise, do histórico e do clima, a app identifica o produto necessário.',
        'carePreviewStep2': 'A AQWELIA calcula a quantidade',
        'carePreviewStep2Text': 'O motor determinístico calcula a dose exata consoante o seu volume de água e os parâmetros atuais.',
        'carePreviewStep3': 'A AQWELIA verifica a compatibilidade',
        'carePreviewStep3Text': 'A app verifica se o produto é compatível com o seu tratamento, o seu equipamento e os seus outros produtos.',
        'carePreviewStep4': 'O produto pode ser adicionado ao carrinho',
        'carePreviewStep4Text': 'Após validação, adicione o produto ao carrinho com um clique e compre-o onde quiser.',
        'carePreviewCta': 'Descobrir a AQWELIA Care',
        'finalCtaTitle': 'Tome finalmente o controlo da manutenção da sua piscina.',
        'finalCtaStart': 'Começar grátis',
    },
    # =========================== NL (Dutch) ===========================
    'nl': {
        'faqProReplace': 'Vervangt AQWELIA een poolprofessional?',
        'faqProReplaceA': 'Nee — het vult hem aan. De poolprofessional komt 1 keer per week; AQWELIA dekt de andere 6 dagen, handelt noodsituaties af en helpt u uw water te begrijpen. Veel gebruikers houden hun poolprofessional en gebruiken AQWELIA parallel.',
        'faqHowIA': 'Hoe werkt de AI-analyse?',
        'faqHowIAA': 'De AI analyseert uw foto\'s van teststrips, water en zwembad, combineert deze gegevens met uw chemische geschiedenis en het weer, en geeft vervolgens een diagnose met een betrouwbaarheidsniveau. Kritische doseringsberekeningen worden uitgevoerd door een deterministische engine, niet door de AI.',
        'faqSpaManage': 'Kan ik een spa beheren?',
        'faqSpaManageA': 'Ja. AQWELIA beheert spa\'s met speciale functies: behandeling met broom of actieve zuurstof, temperatuurbewaking, herinneringen voor waterverversing en aangepaste filtratieprogramma\'s. Beschikbaar vanaf het Lagoon-abonnement.',
        'faqSellProducts': 'Verkoopt de app producten?',
        'faqSellProductsA': 'AQWELIA verkoopt geen producten direct. Wanneer een behoefte wordt gedetecteerd, beveelt de app het juiste product in de juiste dosering aan en vertelt u waar u het in de buurt kunt kopen. AQWELIA Care, binnenkort beschikbaar, zal deze aanbevelingen automatiseren.',
        'faqGreenWater': 'Wat gebeurt er als mijn water groen wordt?',
        'faqGreenWaterA': 'AQWELIA detecteert algentekens, identificeert de waarschijnlijke oorzaak (onvoldoende chloor, onevenwichtige pH, te korte filtratie) en biedt u een stapsgewijs actieplan: schokbehandeling, reiniging, pH-aanpassing en aangepaste filtratieduur.',
        'faqAllYear': 'Werkt AQWELIA het hele jaar door?',
        'faqAllYearA': 'Ja. In het seizoen verzorgt de app analyses en doseringen. Tijdens overwintering vertelt de app u wanneer en hoe u moet overwinteren, bewaakt de afdekking en bereidt de heropening in de lente voor met een bijvulplan.',
        'faqProVersion': 'Bestaat er een versie voor professionals?',
        'faqProVersionA': 'Ja — AQWELIA Pro, binnenkort beschikbaar, is ontworpen voor poolprofessionals: klant- en zwembadbeheer, geoptimaliseerde planning, bewijzen van bezoek, gepersonaliseerde PDF-rapporten en statistieken. Schrijf u in voor vroege toegang.',
        'proPreviewEyebrow': '13 — AQWELIA Pro',
        'proPreviewTitle': 'Onderhoudt u de zwembaden van uw klanten?',
        'proPreviewSubtitle': 'AQWELIA Pro: beheer uw klanten, interventies en zwembaden vanuit één intelligent platform.',
        'proPreviewBadge': 'Early Access',
        'proPreviewBadgeText': 'Binnenkort beschikbaar',
        'proPreviewCard1Title': 'Klantenbeheer',
        'proPreviewCard1Text': 'Klantendossiers, zwembaden, chemische geschiedenis',
        'proPreviewCard2Title': 'Planning & interventies',
        'proPreviewCard2Text': "Geoptimaliseerde routes, bewijzen van bezoek, foto's voor/na",
        'proPreviewCard3Title': 'Rapporten & verslagen',
        'proPreviewCard3Text': 'Gepersonaliseerde PDF-rapporten, statistieken, exports',
        'proPreviewCard4Title': 'Care-aanbevelingen',
        'proPreviewCard4Text': 'Extra inkomsten via AQWELIA Care',
        'proPreviewCta': 'AQWELIA Pro ontdekken',
        'carePreviewEyebrow': '14 — AQWELIA Care',
        'carePreviewTitle': 'Het juiste product, op het juiste moment, in de juiste hoeveelheid.',
        'carePreviewSubtitle': 'AQWELIA Care beperkt zich niet tot een catalogus: het begeleidt u bij elke stap, van gedetecteerde behoefte tot winkelmandje.',
        'carePreviewBadge': 'Binnenkort beschikbaar',
        'carePreviewStep1': 'AQWELIA detecteert de behoefte',
        'carePreviewStep1Text': 'Op basis van uw laatste analyse, geschiedenis en het weer identificeert de app het benodigde product.',
        'carePreviewStep2': 'AQWELIA berekent de hoeveelheid',
        'carePreviewStep2Text': 'De deterministische engine berekent de exacte dosering op basis van uw watervolume en huidige parameters.',
        'carePreviewStep3': 'AQWELIA controleert de compatibiliteit',
        'carePreviewStep3Text': 'De app verifieert dat het product compatibel is met uw behandeling, uw apparatuur en uw andere producten.',
        'carePreviewStep4': 'Het product kan aan het winkelmandje worden toegevoegd',
        'carePreviewStep4Text': 'Eenmaal gevalideerd, voegt u het product met één klik toe aan het winkelmandje en koopt u het waar u wilt.',
        'carePreviewCta': 'AQWELIA Care ontdekken',
        'finalCtaTitle': 'Krijg eindelijk de controle over het onderhoud van uw zwembad.',
        'finalCtaStart': 'Gratis starten',
    },
}

# Sanity check: all 5 langs have the same number of keys
_n = {lang: len(table) for lang, table in TRANSLATIONS.items()}
assert len(set(_n.values())) == 1, f'Inconsistent key counts: {_n}'
assert _n['es'] == 43, f'Expected 43 keys per lang (41 new + 2 updates), got {_n["es"]}'


def update_locale(lang: str, table: dict) -> tuple[int, int]:
    """Update a locale file. Returns (added_count, updated_count)."""
    path = os.path.join(LOCALES_DIR, f'{lang}.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    landing = data.setdefault('landing', {})
    added = 0
    updated = 0
    for key, value in table.items():
        if key in landing:
            if landing[key] != value:
                updated += 1
                landing[key] = value
        else:
            added += 1
            landing[key] = value
    data['landing'] = landing

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

    return added, updated


def main():
    total_added = 0
    total_updated = 0
    for lang in TARGET_LANGS:
        added, updated = update_locale(lang, TRANSLATIONS[lang])
        total_added += added
        total_updated += updated
        print(f'{lang}: +{added} new, ~{updated} updated')

    print(f'\nTotal: +{total_added} new keys, ~{total_updated} updated keys')
    print(f'Across {len(TARGET_LANGS)} locales: '
          f'{total_added} new + {total_updated} updates = '
          f'{total_added + total_updated} operations')

    # Verify JSON validity of all locale files
    for lang in TARGET_LANGS:
        path = os.path.join(LOCALES_DIR, f'{lang}.json')
        with open(path, 'r', encoding='utf-8') as f:
            json.load(f)
    print('\nAll 5 target locale files are valid JSON ✓')


if __name__ == '__main__':
    main()

from __future__ import annotations

import json
from pathlib import Path

VALUES = {
  'fr': {
    'crmReportSaved': 'Compte rendu enregistré', 'crmWaterTestSaved': 'Analyse enregistrée',
    'crmInterventionNotFound': 'Intervention introuvable.', 'crmBackInterventions': 'Retour aux interventions',
    'crmDownloadReport': 'Télécharger le rapport PDF', 'crmStartIntervention': 'Démarrer',
    'crmCompleteIntervention': 'Terminer', 'crmStartedAt': 'Début réel', 'crmCompletedAt': 'Fin réelle',
    'crmFieldReport': 'Compte rendu terrain', 'crmFieldActions': 'Actions réalisées, une par ligne',
    'crmFieldProducts': 'Produits utilisés, un par ligne', 'crmSaveReport': 'Enregistrer le rapport',
    'crmPhotos': 'Photos horodatées', 'crmPhotosHint': 'Jusqu’à 6 photos compressées par intervention.',
    'crmAddPhoto': 'Prendre ou ajouter une photo', 'crmPhotoAlt': 'Photo terrain {number}',
    'crmDeletePhoto': 'Supprimer la photo', 'crmWaterTest': 'Analyse d’eau',
    'crmFreeChlorine': 'Chlore libre', 'crmTemperature': 'Température', 'crmSaveWaterTest': 'Enregistrer l’analyse',
    'crmBackPools': 'Retour aux bassins', 'crmPoolReport': 'Rapport du bassin', 'crmPoolNotFound': 'Bassin introuvable.',
    'crmPoolVolume': 'Volume', 'crmPoolTreatment': 'Traitement', 'crmPoolFilter': 'Filtration',
    'crmPoolAnalyses': 'Analyses', 'crmPoolTechnicalFile': 'Fiche technique et entretien',
    'crmPoolSaved': 'Fiche bassin mise à jour', 'crmSavePool': 'Enregistrer la fiche',
    'crmNewWaterTest': 'Nouvelle analyse d’eau', 'crmObservations': 'Observations',
    'crmWaterHistory': 'Historique des analyses', 'crmNoAnalysis': 'Aucune analyse enregistrée.',
    'crmInterventionHistory': 'Historique des interventions', 'crmNoIntervention': 'Aucune intervention enregistrée.'
  },
  'en': {
    'crmReportSaved': 'Service report saved', 'crmWaterTestSaved': 'Water test saved',
    'crmInterventionNotFound': 'Service visit not found.', 'crmBackInterventions': 'Back to service visits',
    'crmDownloadReport': 'Download PDF report', 'crmStartIntervention': 'Start', 'crmCompleteIntervention': 'Complete',
    'crmStartedAt': 'Actual start', 'crmCompletedAt': 'Actual completion', 'crmFieldReport': 'Field service report',
    'crmFieldActions': 'Actions completed, one per line', 'crmFieldProducts': 'Products used, one per line',
    'crmSaveReport': 'Save report', 'crmPhotos': 'Timestamped photos', 'crmPhotosHint': 'Up to 6 compressed photos per service visit.',
    'crmAddPhoto': 'Take or add a photo', 'crmPhotoAlt': 'Field photo {number}', 'crmDeletePhoto': 'Delete photo',
    'crmWaterTest': 'Water test', 'crmFreeChlorine': 'Free chlorine', 'crmTemperature': 'Temperature', 'crmSaveWaterTest': 'Save water test',
    'crmBackPools': 'Back to pools', 'crmPoolReport': 'Pool report', 'crmPoolNotFound': 'Pool not found.',
    'crmPoolVolume': 'Volume', 'crmPoolTreatment': 'Treatment', 'crmPoolFilter': 'Filtration', 'crmPoolAnalyses': 'Tests',
    'crmPoolTechnicalFile': 'Technical and service record', 'crmPoolSaved': 'Pool record updated', 'crmSavePool': 'Save pool record',
    'crmNewWaterTest': 'New water test', 'crmObservations': 'Observations', 'crmWaterHistory': 'Water test history',
    'crmNoAnalysis': 'No water test recorded.', 'crmInterventionHistory': 'Service visit history', 'crmNoIntervention': 'No service visit recorded.'
  },
  'es': {
    'crmReportSaved': 'Informe guardado', 'crmWaterTestSaved': 'Análisis guardado',
    'crmInterventionNotFound': 'Intervención no encontrada.', 'crmBackInterventions': 'Volver a las intervenciones',
    'crmDownloadReport': 'Descargar informe PDF', 'crmStartIntervention': 'Iniciar', 'crmCompleteIntervention': 'Finalizar',
    'crmStartedAt': 'Inicio real', 'crmCompletedAt': 'Fin real', 'crmFieldReport': 'Informe de campo',
    'crmFieldActions': 'Acciones realizadas, una por línea', 'crmFieldProducts': 'Productos utilizados, uno por línea',
    'crmSaveReport': 'Guardar informe', 'crmPhotos': 'Fotos con fecha y hora', 'crmPhotosHint': 'Hasta 6 fotos comprimidas por intervención.',
    'crmAddPhoto': 'Tomar o añadir una foto', 'crmPhotoAlt': 'Foto de campo {number}', 'crmDeletePhoto': 'Eliminar foto',
    'crmWaterTest': 'Análisis de agua', 'crmFreeChlorine': 'Cloro libre', 'crmTemperature': 'Temperatura', 'crmSaveWaterTest': 'Guardar análisis',
    'crmBackPools': 'Volver a las piscinas', 'crmPoolReport': 'Informe de la piscina', 'crmPoolNotFound': 'Piscina no encontrada.',
    'crmPoolVolume': 'Volumen', 'crmPoolTreatment': 'Tratamiento', 'crmPoolFilter': 'Filtración', 'crmPoolAnalyses': 'Análisis',
    'crmPoolTechnicalFile': 'Ficha técnica y mantenimiento', 'crmPoolSaved': 'Ficha de piscina actualizada', 'crmSavePool': 'Guardar ficha',
    'crmNewWaterTest': 'Nuevo análisis de agua', 'crmObservations': 'Observaciones', 'crmWaterHistory': 'Historial de análisis',
    'crmNoAnalysis': 'No hay análisis registrados.', 'crmInterventionHistory': 'Historial de intervenciones', 'crmNoIntervention': 'No hay intervenciones registradas.'
  },
  'de': {
    'crmReportSaved': 'Einsatzbericht gespeichert', 'crmWaterTestSaved': 'Wasseranalyse gespeichert',
    'crmInterventionNotFound': 'Einsatz nicht gefunden.', 'crmBackInterventions': 'Zurück zu den Einsätzen',
    'crmDownloadReport': 'PDF-Bericht herunterladen', 'crmStartIntervention': 'Starten', 'crmCompleteIntervention': 'Abschließen',
    'crmStartedAt': 'Tatsächlicher Beginn', 'crmCompletedAt': 'Tatsächliches Ende', 'crmFieldReport': 'Außendienstbericht',
    'crmFieldActions': 'Durchgeführte Arbeiten, eine pro Zeile', 'crmFieldProducts': 'Verwendete Produkte, eines pro Zeile',
    'crmSaveReport': 'Bericht speichern', 'crmPhotos': 'Fotos mit Zeitstempel', 'crmPhotosHint': 'Bis zu 6 komprimierte Fotos pro Einsatz.',
    'crmAddPhoto': 'Foto aufnehmen oder hinzufügen', 'crmPhotoAlt': 'Einsatzfoto {number}', 'crmDeletePhoto': 'Foto löschen',
    'crmWaterTest': 'Wasseranalyse', 'crmFreeChlorine': 'Freies Chlor', 'crmTemperature': 'Temperatur', 'crmSaveWaterTest': 'Analyse speichern',
    'crmBackPools': 'Zurück zu den Becken', 'crmPoolReport': 'Beckenbericht', 'crmPoolNotFound': 'Becken nicht gefunden.',
    'crmPoolVolume': 'Volumen', 'crmPoolTreatment': 'Aufbereitung', 'crmPoolFilter': 'Filterung', 'crmPoolAnalyses': 'Analysen',
    'crmPoolTechnicalFile': 'Technische und Wartungsakte', 'crmPoolSaved': 'Beckenakte aktualisiert', 'crmSavePool': 'Beckenakte speichern',
    'crmNewWaterTest': 'Neue Wasseranalyse', 'crmObservations': 'Beobachtungen', 'crmWaterHistory': 'Analyseverlauf',
    'crmNoAnalysis': 'Keine Analyse erfasst.', 'crmInterventionHistory': 'Einsatzverlauf', 'crmNoIntervention': 'Kein Einsatz erfasst.'
  },
  'it': {
    'crmReportSaved': 'Rapporto salvato', 'crmWaterTestSaved': 'Analisi salvata',
    'crmInterventionNotFound': 'Intervento non trovato.', 'crmBackInterventions': 'Torna agli interventi',
    'crmDownloadReport': 'Scarica rapporto PDF', 'crmStartIntervention': 'Avvia', 'crmCompleteIntervention': 'Completa',
    'crmStartedAt': 'Inizio effettivo', 'crmCompletedAt': 'Fine effettiva', 'crmFieldReport': 'Rapporto sul campo',
    'crmFieldActions': 'Azioni eseguite, una per riga', 'crmFieldProducts': 'Prodotti utilizzati, uno per riga',
    'crmSaveReport': 'Salva rapporto', 'crmPhotos': 'Foto con data e ora', 'crmPhotosHint': 'Fino a 6 foto compresse per intervento.',
    'crmAddPhoto': 'Scatta o aggiungi una foto', 'crmPhotoAlt': 'Foto sul campo {number}', 'crmDeletePhoto': 'Elimina foto',
    'crmWaterTest': 'Analisi acqua', 'crmFreeChlorine': 'Cloro libero', 'crmTemperature': 'Temperatura', 'crmSaveWaterTest': 'Salva analisi',
    'crmBackPools': 'Torna alle piscine', 'crmPoolReport': 'Rapporto piscina', 'crmPoolNotFound': 'Piscina non trovata.',
    'crmPoolVolume': 'Volume', 'crmPoolTreatment': 'Trattamento', 'crmPoolFilter': 'Filtrazione', 'crmPoolAnalyses': 'Analisi',
    'crmPoolTechnicalFile': 'Scheda tecnica e manutenzione', 'crmPoolSaved': 'Scheda piscina aggiornata', 'crmSavePool': 'Salva scheda',
    'crmNewWaterTest': 'Nuova analisi acqua', 'crmObservations': 'Osservazioni', 'crmWaterHistory': 'Storico analisi',
    'crmNoAnalysis': 'Nessuna analisi registrata.', 'crmInterventionHistory': 'Storico interventi', 'crmNoIntervention': 'Nessun intervento registrato.'
  },
  'pt': {
    'crmReportSaved': 'Relatório guardado', 'crmWaterTestSaved': 'Análise guardada',
    'crmInterventionNotFound': 'Intervenção não encontrada.', 'crmBackInterventions': 'Voltar às intervenções',
    'crmDownloadReport': 'Descarregar relatório PDF', 'crmStartIntervention': 'Iniciar', 'crmCompleteIntervention': 'Concluir',
    'crmStartedAt': 'Início real', 'crmCompletedAt': 'Fim real', 'crmFieldReport': 'Relatório de campo',
    'crmFieldActions': 'Ações realizadas, uma por linha', 'crmFieldProducts': 'Produtos utilizados, um por linha',
    'crmSaveReport': 'Guardar relatório', 'crmPhotos': 'Fotos com data e hora', 'crmPhotosHint': 'Até 6 fotos comprimidas por intervenção.',
    'crmAddPhoto': 'Tirar ou adicionar foto', 'crmPhotoAlt': 'Foto de campo {number}', 'crmDeletePhoto': 'Eliminar foto',
    'crmWaterTest': 'Análise da água', 'crmFreeChlorine': 'Cloro livre', 'crmTemperature': 'Temperatura', 'crmSaveWaterTest': 'Guardar análise',
    'crmBackPools': 'Voltar às piscinas', 'crmPoolReport': 'Relatório da piscina', 'crmPoolNotFound': 'Piscina não encontrada.',
    'crmPoolVolume': 'Volume', 'crmPoolTreatment': 'Tratamento', 'crmPoolFilter': 'Filtração', 'crmPoolAnalyses': 'Análises',
    'crmPoolTechnicalFile': 'Ficha técnica e manutenção', 'crmPoolSaved': 'Ficha da piscina atualizada', 'crmSavePool': 'Guardar ficha',
    'crmNewWaterTest': 'Nova análise da água', 'crmObservations': 'Observações', 'crmWaterHistory': 'Histórico de análises',
    'crmNoAnalysis': 'Nenhuma análise registada.', 'crmInterventionHistory': 'Histórico de intervenções', 'crmNoIntervention': 'Nenhuma intervenção registada.'
  },
  'nl': {
    'crmReportSaved': 'Interventieverslag opgeslagen', 'crmWaterTestSaved': 'Wateranalyse opgeslagen',
    'crmInterventionNotFound': 'Interventie niet gevonden.', 'crmBackInterventions': 'Terug naar interventies',
    'crmDownloadReport': 'PDF-rapport downloaden', 'crmStartIntervention': 'Starten', 'crmCompleteIntervention': 'Voltooien',
    'crmStartedAt': 'Werkelijke start', 'crmCompletedAt': 'Werkelijke afronding', 'crmFieldReport': 'Terreinverslag',
    'crmFieldActions': 'Uitgevoerde acties, één per regel', 'crmFieldProducts': 'Gebruikte producten, één per regel',
    'crmSaveReport': 'Rapport opslaan', 'crmPhotos': 'Foto’s met tijdstempel', 'crmPhotosHint': 'Maximaal 6 gecomprimeerde foto’s per interventie.',
    'crmAddPhoto': 'Foto maken of toevoegen', 'crmPhotoAlt': 'Terreinfoto {number}', 'crmDeletePhoto': 'Foto verwijderen',
    'crmWaterTest': 'Wateranalyse', 'crmFreeChlorine': 'Vrij chloor', 'crmTemperature': 'Temperatuur', 'crmSaveWaterTest': 'Analyse opslaan',
    'crmBackPools': 'Terug naar zwembaden', 'crmPoolReport': 'Zwembadrapport', 'crmPoolNotFound': 'Zwembad niet gevonden.',
    'crmPoolVolume': 'Volume', 'crmPoolTreatment': 'Behandeling', 'crmPoolFilter': 'Filtratie', 'crmPoolAnalyses': 'Analyses',
    'crmPoolTechnicalFile': 'Technisch en onderhoudsdossier', 'crmPoolSaved': 'Zwembaddossier bijgewerkt', 'crmSavePool': 'Dossier opslaan',
    'crmNewWaterTest': 'Nieuwe wateranalyse', 'crmObservations': 'Observaties', 'crmWaterHistory': 'Analysegeschiedenis',
    'crmNoAnalysis': 'Geen analyse geregistreerd.', 'crmInterventionHistory': 'Interventiegeschiedenis', 'crmNoIntervention': 'Geen interventie geregistreerd.'
  },
}

for locale, additions in VALUES.items():
    path = Path('src/i18n/locales') / f'{locale}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    data['proApp'].update(additions)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('P1-A detail translations applied')

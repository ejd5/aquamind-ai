from __future__ import annotations

import json
from pathlib import Path

VALUES = {
  'fr': {
    'crmPoolStatus': 'Statut du bassin', 'crmPoolBrand': 'Marque', 'crmPoolModel': 'Modèle',
    'crmPoolSerial': 'Numéro de série', 'crmPoolInstalledAt': 'Date d’installation',
    'crmPoolAccessInstructions': 'Consignes d’accès', 'crmPoolEquipmentNotes': 'Notes équipements',
    'crmLastService': 'Dernier entretien', 'crmInterventionPriority': 'Priorité',
    'crmRecurrence': 'Récurrence', 'crmRecurrenceNone': 'Visite unique',
    'crmRecurrenceWeekly': 'Chaque semaine', 'crmRecurrenceBiweekly': 'Toutes les 2 semaines',
    'crmRecurrenceMonthly': 'Chaque mois', 'crmOccurrences': 'Nombre de visites',
    'crmInterventionSummary': 'Résumé de l’intervention', 'crmCustomerNotes': 'Compte rendu client',
    'crmInternalNotes': 'Notes internes', 'crmBillable': 'Intervention facturable', 'crmAmount': 'Montant estimé (€)'
  },
  'en': {
    'crmPoolStatus': 'Pool status', 'crmPoolBrand': 'Brand', 'crmPoolModel': 'Model',
    'crmPoolSerial': 'Serial number', 'crmPoolInstalledAt': 'Installation date',
    'crmPoolAccessInstructions': 'Access instructions', 'crmPoolEquipmentNotes': 'Equipment notes',
    'crmLastService': 'Last service', 'crmInterventionPriority': 'Priority',
    'crmRecurrence': 'Recurrence', 'crmRecurrenceNone': 'One-time visit',
    'crmRecurrenceWeekly': 'Every week', 'crmRecurrenceBiweekly': 'Every 2 weeks',
    'crmRecurrenceMonthly': 'Every month', 'crmOccurrences': 'Number of visits',
    'crmInterventionSummary': 'Service summary', 'crmCustomerNotes': 'Customer report',
    'crmInternalNotes': 'Internal notes', 'crmBillable': 'Billable service', 'crmAmount': 'Estimated amount (€)'
  },
  'es': {
    'crmPoolStatus': 'Estado de la piscina', 'crmPoolBrand': 'Marca', 'crmPoolModel': 'Modelo',
    'crmPoolSerial': 'Número de serie', 'crmPoolInstalledAt': 'Fecha de instalación',
    'crmPoolAccessInstructions': 'Instrucciones de acceso', 'crmPoolEquipmentNotes': 'Notas de equipos',
    'crmLastService': 'Último mantenimiento', 'crmInterventionPriority': 'Prioridad',
    'crmRecurrence': 'Recurrencia', 'crmRecurrenceNone': 'Visita única',
    'crmRecurrenceWeekly': 'Cada semana', 'crmRecurrenceBiweekly': 'Cada 2 semanas',
    'crmRecurrenceMonthly': 'Cada mes', 'crmOccurrences': 'Número de visitas',
    'crmInterventionSummary': 'Resumen de la intervención', 'crmCustomerNotes': 'Informe para el cliente',
    'crmInternalNotes': 'Notas internas', 'crmBillable': 'Intervención facturable', 'crmAmount': 'Importe estimado (€)'
  },
  'de': {
    'crmPoolStatus': 'Beckenstatus', 'crmPoolBrand': 'Marke', 'crmPoolModel': 'Modell',
    'crmPoolSerial': 'Seriennummer', 'crmPoolInstalledAt': 'Installationsdatum',
    'crmPoolAccessInstructions': 'Zugangshinweise', 'crmPoolEquipmentNotes': 'Gerätenotizen',
    'crmLastService': 'Letzter Service', 'crmInterventionPriority': 'Priorität',
    'crmRecurrence': 'Wiederholung', 'crmRecurrenceNone': 'Einmaliger Besuch',
    'crmRecurrenceWeekly': 'Jede Woche', 'crmRecurrenceBiweekly': 'Alle 2 Wochen',
    'crmRecurrenceMonthly': 'Jeden Monat', 'crmOccurrences': 'Anzahl der Besuche',
    'crmInterventionSummary': 'Einsatzzusammenfassung', 'crmCustomerNotes': 'Kundenbericht',
    'crmInternalNotes': 'Interne Notizen', 'crmBillable': 'Abrechenbarer Einsatz', 'crmAmount': 'Geschätzter Betrag (€)'
  },
  'it': {
    'crmPoolStatus': 'Stato piscina', 'crmPoolBrand': 'Marca', 'crmPoolModel': 'Modello',
    'crmPoolSerial': 'Numero di serie', 'crmPoolInstalledAt': 'Data di installazione',
    'crmPoolAccessInstructions': 'Istruzioni di accesso', 'crmPoolEquipmentNotes': 'Note attrezzature',
    'crmLastService': 'Ultima manutenzione', 'crmInterventionPriority': 'Priorità',
    'crmRecurrence': 'Ricorrenza', 'crmRecurrenceNone': 'Visita singola',
    'crmRecurrenceWeekly': 'Ogni settimana', 'crmRecurrenceBiweekly': 'Ogni 2 settimane',
    'crmRecurrenceMonthly': 'Ogni mese', 'crmOccurrences': 'Numero di visite',
    'crmInterventionSummary': 'Riepilogo intervento', 'crmCustomerNotes': 'Rapporto cliente',
    'crmInternalNotes': 'Note interne', 'crmBillable': 'Intervento fatturabile', 'crmAmount': 'Importo stimato (€)'
  },
  'pt': {
    'crmPoolStatus': 'Estado da piscina', 'crmPoolBrand': 'Marca', 'crmPoolModel': 'Modelo',
    'crmPoolSerial': 'Número de série', 'crmPoolInstalledAt': 'Data de instalação',
    'crmPoolAccessInstructions': 'Instruções de acesso', 'crmPoolEquipmentNotes': 'Notas dos equipamentos',
    'crmLastService': 'Última manutenção', 'crmInterventionPriority': 'Prioridade',
    'crmRecurrence': 'Recorrência', 'crmRecurrenceNone': 'Visita única',
    'crmRecurrenceWeekly': 'Todas as semanas', 'crmRecurrenceBiweekly': 'A cada 2 semanas',
    'crmRecurrenceMonthly': 'Todos os meses', 'crmOccurrences': 'Número de visitas',
    'crmInterventionSummary': 'Resumo da intervenção', 'crmCustomerNotes': 'Relatório do cliente',
    'crmInternalNotes': 'Notas internas', 'crmBillable': 'Intervenção faturável', 'crmAmount': 'Valor estimado (€)'
  },
  'nl': {
    'crmPoolStatus': 'Zwembadstatus', 'crmPoolBrand': 'Merk', 'crmPoolModel': 'Model',
    'crmPoolSerial': 'Serienummer', 'crmPoolInstalledAt': 'Installatiedatum',
    'crmPoolAccessInstructions': 'Toegangsinstructies', 'crmPoolEquipmentNotes': 'Apparaatnotities',
    'crmLastService': 'Laatste service', 'crmInterventionPriority': 'Prioriteit',
    'crmRecurrence': 'Herhaling', 'crmRecurrenceNone': 'Eenmalig bezoek',
    'crmRecurrenceWeekly': 'Elke week', 'crmRecurrenceBiweekly': 'Elke 2 weken',
    'crmRecurrenceMonthly': 'Elke maand', 'crmOccurrences': 'Aantal bezoeken',
    'crmInterventionSummary': 'Samenvatting interventie', 'crmCustomerNotes': 'Klantverslag',
    'crmInternalNotes': 'Interne notities', 'crmBillable': 'Factureerbare interventie', 'crmAmount': 'Geschat bedrag (€)'
  },
}

for locale, additions in VALUES.items():
    path = Path('src/i18n/locales') / f'{locale}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    data['proApp'].update(additions)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('P1-A pool and intervention translations applied')

# AQWELIA — Contrat de Données de Démonstration

> Phase 2 du Masterplan Visuel — Données cohérentes pour maquettes
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## 1. OBJECTIF

Définir un jeu de données de démonstration cohérent pour toutes les maquettes AQWELIA. L'objectif est d'éviter que les données changent arbitrairement d'un visuel à l'autre.

---

## 2. PROPRIÉTAIRE DÉMO

| Champ | Valeur |
|-------|--------|
| **Nom** | Julie Dupont |
| **Email** | julie.dupont@aqwelia.test |
| **Plan** | Complete (10.99€/mois) |
| **Piscine** | 1 piscine rectangulaire 40m² |
| **Spa** | 1 spa 6 personnes |
| **Localisation** | Lyon, France (45.7640° N, 4.8357° E) |
| **Statut** | Actif, abonnement en cours |

---

## 3. PISCINE DÉMO

| Champ | Valeur |
|-------|--------|
| **Nom** | "Ma Piscine" |
| **Type** | Rectangulaire |
| **Forme** | Rectangle |
| **Dimensions** | 8m × 5m × 1.5m |
| **Volume** | 60 m³ |
| **Surface** | 40 m² |
| **Traitement** | Chlore |
| **Équipements** | Filtre sable, pompe, chauffage, robot |
| **État** | Bon état |

---

## 4. ANALYSES DÉMO

### 4.1 Dernier test (aujourd'hui)

| Paramètre | Valeur | Unité | Statut |
|-----------|--------|-------|--------|
| pH | 7.2 | — | ✅ Normal |
| Chlore libre | 1.5 | mg/L | ✅ Normal |
| Chlore total | 2.0 | mg/L | ✅ Normal |
| Alcalinité | 120 | mg/L | ✅ Normal |
| Température | 26 | °C | ✅ Normal |
| TAC | 3.5 | — | ✅ Normal |
| LSI | 0.1 | — | ✅ Normal |
| Clear Water Index | 95 | /100 | ✅ Excellent |

### 4.2 Test précédent (hier)

| Paramètre | Valeur | Unité | Statut |
|-----------|--------|-------|--------|
| pH | 7.0 | — | ✅ Normal |
| Chlore libre | 1.2 | mg/L | ✅ Normal |
| Chlore total | 1.8 | mg/L | ✅ Normal |
| Alcalinité | 115 | mg/L | ✅ Normal |
| Température | 25 | °C | ✅ Normal |
| TAC | 3.4 | — | ✅ Normal |
| LSI | 0.0 | — | ✅ Normal |
| Clear Water Index | 92 | /100 | ✅ Très bien |

### 4.3 Test il y a 3 jours

| Paramètre | Valeur | Unité | Statut |
|-----------|--------|-------|--------|
| pH | 6.8 | — | ⚠️ Légèrement bas |
| Chlore libre | 0.8 | mg/L | ⚠️ Légèrement bas |
| Chlore total | 1.5 | mg/L | ✅ Normal |
| Alcalinité | 100 | mg/L | ✅ Normal |
| Température | 24 | °C | ✅ Normal |
| TAC | 3.2 | — | ✅ Normal |
| LSI | -0.2 | — | ⚠️ Légèrement bas |
| Clear Water Index | 85 | /100 | ✅ Bien |

---

## 5. MÉTÉO DÉMO

| Champ | Valeur |
|-------|--------|
| **Lieu** | Lyon, France |
| **Température** | 28°C |
| **Condition** | Ensoleillé |
| **Humidité** | 45% |
| **Vent** | 12 km/h |
| **Prévisions 5 jours** | Ensoleillé → Partiellement nuageux → Ensoleillé → Pluie légère → Ensoleillé |
| **Alertes** | Aucune |

---

## 6. ÉQUIPEMENTS DÉMO

| Équipement | Marque | Modèle | Âge | État | Prochain entretien |
|-----------|--------|--------|-----|------|-------------------|
| Filtre sable | Zodiac | ZFS 500 | 2 ans | Bon | Dans 3 mois |
| Pompe | Zodiac | ZCP 75 | 2 ans | Bon | Dans 6 mois |
| Chauffage | Astral | Hi-Star 150 | 1 an | Excellent | Dans 12 mois |
| Robot | Dolphin | M600 | 6 mois | Excellent | Dans 6 mois |
| Réserve chlore | — | — | — | 60% | Réassort dans 2 semaines |
| pH- | — | — | — | 40% | Réassort dans 1 mois |

---

## 7. RAPPELS DÉMO

| Rappel | Fréquence | Prochaine date | Statut |
|--------|-----------|----------------|--------|
| Test pH/chlore | 2×/semaine | Demain | Actif |
| Nettoyage filtre | Hebdomadaire | Samedi | Actif |
| Curage robot | Mensuel | 15 août | Actif |
| Contrôle professionnel | Trimestriel | 15 septembre | Actif |
| Hivernage | Annuel | 15 octobre | Actif |

---

## 8. HISTORIQUE DÉMO (30 derniers jours)

| Date | pH | Chlore | CWI | Action |
|------|-----|--------|-----|--------|
| Aujourd'hui | 7.2 | 1.5 | 95 | — |
| Hier | 7.0 | 1.2 | 92 | — |
| Il y a 3 jours | 6.8 | 0.8 | 85 | Ajout pH- |
| Il y a 5 jours | 7.1 | 1.4 | 93 | — |
| Il y a 7 jours | 7.3 | 1.6 | 96 | — |
| Il y a 10 jours | 6.9 | 1.0 | 88 | Ajout chlore |
| Il y a 14 jours | 7.2 | 1.5 | 94 | — |
| Il y a 21 jours | 7.4 | 1.8 | 97 | — |
| Il y a 30 jours | 7.0 | 1.3 | 91 | — |

---

## 9. ACTIONS BRAIN DÉMO

| Action | Statut | Sévérité | Confiance |
|--------|--------|----------|-----------|
| "Ajouter 200g de pH-" | Complétée | Basse | 0.95 |
| "Nettoyer le filtre" | En attente | Basse | 0.90 |
| "Vérifier le robot" | Reportée | Basse | 0.85 |

---

## 10. DONNÉES PRO DÉMO

### 10.1 Technicien

| Champ | Valeur |
|-------|--------|
| **Nom** | Thomas Martin |
| **Email** | thomas.martin@pooltech.test |
| **Entreprise** | PoolTech Lyon |
| **Rôle** | Technicien senior |
| **Interventions cette semaine** | 8 |

### 10.2 Clients Pro (5)

| Client | Piscine | Dernière intervention | Prochaine intervention |
|--------|---------|----------------------|----------------------|
| Julie Dupont | Rectangulaire 40m² | Il y a 5 jours | Dans 9 jours |
| Marc Leroy | Ovale 55m² | Il y a 3 jours | Dans 11 jours |
| Sophie Martin | Rectangulaire 30m² | Il y a 7 jours | Dans 7 jours |
| Pierre Durand | Rectangulaire 60m² | Il y a 2 jours | Dans 12 jours |
| Marie Bernard | Ovale 45m² | Il y a 4 jours | Dans 10 jours |

### 10.3 Interventions Pro (8 cette semaine)

| Date | Client | Type | Statut |
|------|--------|------|--------|
| Lundi 9h | Julie Dupont | Contrôle routine | Complétée |
| Lundi 14h | Marc Leroy | Nettoyage filtre | Complétée |
| Mardi 9h | Sophie Martin | Ajout produit | Complétée |
| Mardi 14h | Pierre Durand | Réparation robot | Complétée |
| Mercredi 9h | Marie Bernard | Contrôle routine | Complétée |
| Mercredi 14h | Julie Dupont | — | Planifiée |
| Jeudi 9h | Marc Leroy | — | Planifiée |
| Jeudi 14h | Sophie Martin | — | Planifiée |

---

## 11. DONNÉES GROWTH DÉMO

### 11.1 Leads (10)

| Lead | Source | Statut | Pipeline |
|------|--------|--------|----------|
| "Piscine paradis" | Site web | Qualifié | RDV planifié |
| "Aqua deluxe" | Réseau | Prospect | Contact initial |
| "Spa bien-être" | Site web | Qualifié | Devis envoyé |
| "Horizon bleu" | Réseau | Client | Signé |
| "Oasis verts" | Site web | Qualifié | RDV planifié |
| "Pool master" | Réseau | Prospect | Contact initial |
| "Aqua vita" | Site web | Abandonné | — |
| "Blue lagoon" | Réseau | Qualifié | Devis envoyé |
| "Crystal clear" | Site web | Prospect | Contact initial |
| "Nage idyllique" | Réseau | Client | Signé |

### 11.2 Statistiques Growth

| Métrique | Valeur |
|----------|--------|
| Leads total | 42 |
| Leads ce mois | 18 |
| Conversions | 12 |
| Taux conversion | 28.6% |
| Revenus | 15 600€ |
| Panier moyen | 1 300€ |

---

## 12. DONNÉES CARE DÉMO

| Produit | Catégorie | Prix | Stock |
|---------|-----------|------|-------|
| Chlore granulés 5kg | Traitement | 24.99€ | En stock |
| pH- liquide 5L | Traitement | 19.99€ | En stock |
| Anti-algue 5L | Traitement | 22.99€ | En stock |
| Filtre sable 25kg | Équipement | 34.99€ | En stock |
| Gants nettoyage | Accessoire | 12.99€ | En stock |

---

## 13. RÈGLES DE COHÉRENCE

| Règle | Description |
|-------|-------------|
| R1 | Le propriétaire est toujours Julie Dupont |
| R2 | La piscine est toujours 40m² rectangulaire |
| R3 | Le dernier test est toujours pH 7.2, CWI 95 |
| R4 | La météo est toujours 28°C, ensoleillé, Lyon |
| R5 | Le technicien est toujours Thomas Martin |
| R6 | Les clients Pro sont toujours les mêmes 5 |
| R7 | Les leads Growth sont toujours les mêmes 10 |
| R8 | Les produits Care sont toujours les mêmes 5 |
| R9 | Les dates sont relatives (aujourd'hui, hier, etc.) |
| R10 | Les valeurs sont réalistes et cohérentes entre elles |

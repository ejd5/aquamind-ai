#!/usr/bin/env python3
"""Build new-keys-pt.json with European Portuguese translations for 108 keys."""
import json

# 90 actionPlan.* + 18 diagnostic.* keys
TRANSLATIONS = {
    # ─── Action titles (13) ────────────────────────────────────────────────
    "actionPlan.iaAdjustTac": "Ajustar a alcalinidade (TAC)",
    "actionPlan.iaLowerPh": "Baixar o pH",
    "actionPlan.iaRaisePh": "Subir o pH",
    "actionPlan.iaPhOk": "pH correto",
    "actionPlan.iaChlorineShock": "Cloração choc",
    "actionPlan.iaAddSlowChlorine": "Adicionar cloro lento",
    "actionPlan.iaTreatChloramines": "Tratamento de cloraminas",
    "actionPlan.iaAddStabilizer": "Adicionar estabilizante",
    "actionPlan.iaDiluteWater": "Diluir a água (CYA demasiado alto)",
    "actionPlan.iaAddSalt": "Adicionar sal",
    "actionPlan.iaTreatPhosphates": "Tratar os fosfatos",
    "actionPlan.iaMaintainFiltration": "Manter a filtração",
    "actionPlan.iaRetest": "Voltar a testar a água",

    # ─── Action details with ICU params (15) ───────────────────────────────
    "actionPlan.iaAdjustTacDetail": "TAC {current} mg/L objetivo {target} mg/L. Fazer ANTES do pH.",
    "actionPlan.iaLowerPhDetail": "pH {current} objetivo {target}. Indispensável antes de qualquer tratamento com cloro.",
    "actionPlan.iaRaisePhDetail": "pH {current} objetivo {target}.",
    "actionPlan.iaPhOkDetail": "pH {ph} na faixa ideal. Não mexer.",
    "actionPlan.iaChlorineShockDetail": "Cloro livre {chlorine} mg/L demasiado baixo. Fazer um choque (após pH equilibrado).",
    "actionPlan.iaAddSlowChlorineDetail": "Cloro livre {chlorine} mg/L um pouco baixo. Completar com cloro lento.",
    "actionPlan.iaTreatChloraminesDetail": "Cloro combinado {combined} mg/L elevado. Cloração choc para quebrar as cloraminas (cheiro, irritação).",
    "actionPlan.iaAddStabilizerDetail": "CYA {current} mg/L objetivo {target} mg/L.",
    "actionPlan.iaDiluteWaterDetail": "CYA {cya} mg/L bloqueia o cloro. Renovar 20-30% da água.",
    "actionPlan.iaAddSaltDetail": "Sal {salt} g/L demasiado baixo para o eletrolisador.",
    "actionPlan.iaTreatPhosphatesDetail": "Fosfatos {phosphates} mg/L: alimentam as algas. Usar um redutor de fosfatos.",
    "actionPlan.iaMaintainFiltrationHours": "Filtrar pelo menos {hours}h para distribuir bem os produtos.",
    "actionPlan.iaMaintainFiltrationNormal": "Filtração normal (metade da temperatura da água em horas).",
    "actionPlan.iaRetestHours": "Refazer um teste em {hours}h para verificar o efeito.",
    "actionPlan.iaRetestDefault": "Refazer um teste em 24-48h.",

    # ─── Products (5) ──────────────────────────────────────────────────────
    "actionPlan.iaAdjustTacProduct": "TAC+",
    "actionPlan.iaLowerPhProduct": "pH-",
    "actionPlan.iaRaisePhProduct": "pH+",
    "actionPlan.iaChlorineShockProduct": "Cloro choc",
    "actionPlan.iaAddSlowChlorineProduct": "Cloro lento",

    # ─── Forbidden actions / Dangers (10) ──────────────────────────────────
    "actionPlan.dndNoMixChemicals": "Nunca misturar dois produtos químicos diferentes (cloro + ácido = gás tóxico).",
    "actionPlan.dndNoPurePour": "Nunca deitar produto puro diretamente na piscina sem diluição (exceto sal).",
    "actionPlan.dndWaterIntoAcid": "Nunca adicionar água a um produto ácido: adicionar sempre o produto à água.",
    "actionPlan.dndNoShockWithoutPh": "Nunca fazer uma cloração choc sem ter verificado o pH previamente.",
    "actionPlan.dndNoBathAfterShock": "Nunca nadar durante ou logo após um tratamento choc.",
    "actionPlan.dndNoStoreChlorineAcid": "Nunca armazenar cloro e ácido lado a lado.",
    "actionPlan.dndNoCyaOver50": "Não exceder 50 mg/L de estabilizante (CYA): o cloro torna-se ineficaz.",
    "actionPlan.dndNoBath8h": "Não nadar durante pelo menos 8h após o choque.",
    "actionPlan.dndNoMaskChlorineSmell": "Não mascarar o cheiro a cloro com perfume: é um sinal de cloraminas.",
    "actionPlan.dndNoAddStabilizer": "Não adicionar estabilizante: o nível já está demasiado elevado.",

    # ─── Diagnosis (2) ─────────────────────────────────────────────────────
    "actionPlan.diagBalanced": "A sua água está globalmente equilibrada (índice {cwi}/100). Mantenha o ritmo de testes e de filtração. Banho: {swim}.",
    "actionPlan.diagIssues": "Diagnóstico ({sevLabel}) índice de água clara {cwi}/100. Pontos a tratar: {issues}. Siga o plano de ação ordenado abaixo. Banho: {swim}.",

    # ─── Severity labels (3) ───────────────────────────────────────────────
    "actionPlan.sevLabelUrgent": "URGENTE",
    "actionPlan.sevLabelHigh": "Ação recomendada",
    "actionPlan.sevLabelMedium": "A vigiar",

    # ─── Swim labels (4) ───────────────────────────────────────────────────
    "actionPlan.swimLabelAllowed": "autorizado",
    "actionPlan.swimLabelAvoid": "desaconselhado",
    "actionPlan.swimLabelForbidden": "proibido",
    "actionPlan.swimLabelUnknown": "a confirmar após medições",

    # ─── Issues (4) ────────────────────────────────────────────────────────
    "actionPlan.issuePh": "pH {ph}",
    "actionPlan.issueFreeChlorine": "cloro livre {chlorine} mg/L",
    "actionPlan.issueCombinedChlorine": "cloraminas elevadas",
    "actionPlan.issueTac": "TAC {tac}",

    # ─── Professional advice (3) ───────────────────────────────────────────
    "actionPlan.proPhExtreme": "pH extremo: um profissional pode ajudar a reequilibrar sem risco.",
    "actionPlan.proOverChlorination": "Sobredosagem massiva de cloro: considere uma diluição parcial ou um profissional.",
    "actionPlan.proHighChloramines": "Cloraminas muito elevadas: choque necessário, um profissional pode gerir a operação.",

    # ─── Dosing products/methods/warnings (34) ─────────────────────────────
    "actionPlan.dosePhMinusProduct": "pH- (ácido)",
    "actionPlan.dosePhMinusMethod": "Diluir num balde de água da piscina, distribuir à frente das bocas de retorno, filtração em funcionamento.",
    "actionPlan.dosePhMinusWarningGap": "Diferença demasiado grande: tratamento limitado a -{delta} pH. Refazer um teste após filtração.",
    "actionPlan.dosePhPlusProduct": "pH+ (carbonato de sódio)",
    "actionPlan.dosePhPlusMethod": "Diluir num balde, distribuir à frente das bocas de retorno, filtração em funcionamento.",
    "actionPlan.dosePhPlusWarningGap": "Diferença demasiado grande: tratamento limitado a +{delta} pH.",
    "actionPlan.doseChlorineShockProduct": "Cloro choc (65% ativo)",
    "actionPlan.doseChlorineShockMethod": "Dissolver num balde de água, deitar à frente das bocas de retorno. Preferir à noite, sem banhistas.",
    "actionPlan.doseChlorineShockWarningBath": "ATENÇÃO: cloração choc. Nenhum banho durante pelo menos 8h.",
    "actionPlan.doseChlorineShockWarningMix": "Nunca misturar cloro choc e pH-.",
    "actionPlan.doseChlorineShockWarningPh": "Verificar o pH ANTES do choque (ideal 7.2-7.4).",
    "actionPlan.doseChlorineSlowProduct": "Cloro lento (pastilhas 20g)",
    "actionPlan.doseChlorineSlowMethod": "Colocar no skimmer ou difusor. Renovar conforme o consumo.",
    "actionPlan.doseChlorineSlowWarningSkimmer": "Não colocar no skimmer se tratamento anti-algas simultâneo.",
    "actionPlan.doseAlkalinityPlusProduct": "TAC+ (bicarbonato de sódio)",
    "actionPlan.doseAlkalinityPlusMethod": "Diluir, distribuir, filtração em funcionamento. Aguardar antes de ajustar o pH.",
    "actionPlan.doseAlkalinityPlusWarningOrder": "Ajustar o TAC ANTES do pH.",
    "actionPlan.doseCalciumPlusProduct": "Cálcio+ (cloreto de cálcio)",
    "actionPlan.doseCalciumPlusMethod": "Diluir num balde, deitar lentamente à frente das bocas de retorno.",
    "actionPlan.doseStabilizerPlusProduct": "Estabilizante (ácido ciânurico)",
    "actionPlan.doseStabilizerPlusMethod": "Deitar lentamente no skimmer, filtração em funcionamento. Dissolução lenta (24-48h).",
    "actionPlan.doseStabilizerPlusWarningMax": "Não exceder 50 mg/L. Excesso de estabilizante bloqueia o cloro.",
    "actionPlan.doseSaltPlusProduct": "Sal para piscina (NaCl)",
    "actionPlan.doseSaltPlusMethod": "Deitar o sal diretamente na piscina, filtração em funcionamento até dissolução completa.",
    "actionPlan.doseSaltPlusWarningCheck": "Verificar o sal necessário para o seu eletrolisador antes de adicionar.",
    "actionPlan.doseAntiAlgaeProduct": "Anti-algas (curativo)",
    "actionPlan.doseAntiAlgaeMethod": "Deitar à frente das bocas de retorno, filtração em funcionamento. Escovar as paredes.",
    "actionPlan.doseAntiAlgaeWarningPh": "O pH deve estar equilibrado ANTES. Eficaz sobretudo em prevenção.",
    "actionPlan.doseFlocculantProduct": "Floculante",
    "actionPlan.doseFlocculantMethod": "Deitar à frente das bocas de retorno, filtração 1h depois paragem 12h para decantação, depois aspiração.",
    "actionPlan.doseFlocculantWarningFilter": "Compatível apenas com filtro de areia. Não usar com filtro de cartucho.",

    # ─── diagnostic.* (18) ─────────────────────────────────────────────────
    # Swim reasons (8)
    "diagnostic.swimReasonPhCriticalAcidic": "pH {ph} fora da faixa de segurança (demasiado ácido).",
    "diagnostic.swimReasonPhCriticalBasic": "pH {ph} fora da faixa de segurança (demasiado básico).",
    "diagnostic.swimReasonPhWarning": "pH {ph} ligeiramente fora da faixa ideal.",
    "diagnostic.swimReasonChlorineInsufficient": "Cloro livre insuficiente: desinfeção não assegurada.",
    "diagnostic.swimReasonChlorineTooHigh": "Cloro livre {chlorine} mg/L demasiado elevado: irritação, sobredosagem.",
    "diagnostic.swimReasonChlorineHighLimit": "Cloro livre no limite superior.",
    "diagnostic.swimReasonChlorineNotMeasured": "Cloro livre não medido.",
    "diagnostic.swimReasonCombinedChlorine": "Cloro combinado {combined} mg/L: cloraminas irritantes, cheiro forte.",
    # LSI labels (6)
    "diagnostic.lsiBalancedLabel": "Equilibrada",
    "diagnostic.lsiSlightlyScalingLabel": "Ligeiramente incrustante",
    "diagnostic.lsiScalingLabel": "Incrustante",
    "diagnostic.lsiSlightlyAgressiveLabel": "Ligeiramente agressiva",
    "diagnostic.lsiAgressiveLabel": "Água agressiva",
    "diagnostic.lsiMissingLabel": "-",
    # Clarity labels (4)
    "diagnostic.clarityPerfect": "Água perfeita",
    "diagnostic.clarityWatch": "A vigiar",
    "diagnostic.clarityAction": "Ação recomendada",
    "diagnostic.clarityUrgent": "Urgência",
}

assert len(TRANSLATIONS) == 108, f"Expected 108 keys, got {len(TRANSLATIONS)}"

OUT = "/home/z/my-project/.tmp/translated/new-keys-pt.json"
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(TRANSLATIONS, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"Wrote {len(TRANSLATIONS)} keys to {OUT}")

# Quick self-check: ICU params preserved vs worksheet
import re
with open("/home/z/my-project/.tmp/worksheets/new-keys-worksheet.json") as f:
    ws = json.load(f)

mismatch = 0
for k, v in TRANSLATIONS.items():
    ws_params = set(re.findall(r"\{(\w+)\}", ws[k]["fr"]))
    tr_params = set(re.findall(r"\{(\w+)\}", v))
    if ws_params != tr_params:
        print(f"ICU MISMATCH {k}: ws={ws_params} tr={tr_params}")
        mismatch += 1
print(f"ICU mismatches: {mismatch}")

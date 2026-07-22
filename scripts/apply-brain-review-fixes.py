from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected exactly one match in {path}, found {count}: {old[:120]!r}"
        )
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/components/aquamind/app-shell.tsx",
    "          {activeTab === 'diagnostic' && <ModuleDiagnostic />}",
    "          {activeTab === 'diagnostic' && (\n"
    "            <ModuleDiagnostic activePoolId={activePoolId} />\n"
    "          )}",
)
replace_once(
    "src/components/aquamind/app-shell.tsx",
    "          {activeTab === 'water' && <ModuleWaterTest onNavigate={navigate} />}",
    "          {activeTab === 'water' && (\n"
    "            <ModuleWaterTest\n"
    "              onNavigate={navigate}\n"
    "              activePoolId={activePoolId}\n"
    "            />\n"
    "          )}",
)

replace_once(
    "src/components/aquamind/module-water-test.tsx",
    "interface Props {\n  onNavigate: (tab: TabId) => void\n}",
    "interface Props {\n"
    "  onNavigate: (tab: TabId) => void\n"
    "  activePoolId?: string | null\n"
    "}",
)
replace_once(
    "src/components/aquamind/module-water-test.tsx",
    "export function ModuleWaterTest({ onNavigate }: Props) {",
    "export function ModuleWaterTest({ onNavigate, activePoolId }: Props) {",
)
replace_once(
    "src/components/aquamind/module-water-test.tsx",
    "      const { data, stale } = await offlineApi.waterTests()",
    "      const { data, stale } = await offlineApi.waterTests(activePoolId)",
)
replace_once(
    "src/components/aquamind/module-water-test.tsx",
    "  }, [])\n\n  useEffect(() => {\n    loadHistory()\n  }, [loadHistory])",
    "  }, [activePoolId])\n\n"
    "  useEffect(() => {\n"
    "    loadHistory()\n"
    "  }, [loadHistory])",
)
replace_once(
    "src/components/aquamind/module-water-test.tsx",
    "    const body: Record<string, unknown> = { ph, source, note: note.trim() || undefined }",
    "    const body: Record<string, unknown> = {\n"
    "      ph,\n"
    "      source,\n"
    "      note: note.trim() || undefined,\n"
    "      ...(activePoolId ? { poolId: activePoolId } : {}),\n"
    "    }",
)

replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "export function ModuleDiagnostic() {",
    "interface ModuleDiagnosticProps {\n"
    "  activePoolId?: string | null\n"
    "}\n\n"
    "export function ModuleDiagnostic({ activePoolId }: ModuleDiagnosticProps) {",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "      const { data } = await offlineApi.photoDiagnostic()",
    "      const { data } = await offlineApi.photoDiagnostic(activePoolId)",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "  }, [])\n\n  useEffect(() => {\n    loadHistory()\n  }, [loadHistory])",
    "  }, [activePoolId])\n\n"
    "  useEffect(() => {\n"
    "    loadHistory()\n"
    "  }, [loadHistory])",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "      const data = await api.post<{ diagnostic: DiagnosticResult }>('/api/pool/photo-diagnostic', { image, typeHint })",
    "      const data = await api.post<{ diagnostic: DiagnosticResult }>(\n"
    "        '/api/pool/photo-diagnostic',\n"
    "        { image, typeHint, poolId: activePoolId || undefined },\n"
    "      )",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "        <DiagnosticActionPlan\n          diagnostic={result}",
    "        <DiagnosticActionPlan\n"
    "          diagnostic={result}\n"
    "          activePoolId={activePoolId}",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "                { image: newImage, typeHint },",
    "                {\n"
    "                  image: newImage,\n"
    "                  typeHint,\n"
    "                  poolId: activePoolId || undefined,\n"
    "                },",
)
replace_once(
    "src/components/aquamind/module-diagnostic.tsx",
    "          const body: Record<string, unknown> = { ph: Number(values.ph), source: 'strip_photo' }",
    "          const body: Record<string, unknown> = {\n"
    "            ph: Number(values.ph),\n"
    "            source: 'strip_photo',\n"
    "            ...(activePoolId ? { poolId: activePoolId } : {}),\n"
    "          }",
)

replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "interface DiagnosticActionPlanProps {\n"
    "  diagnostic: DiagnosticResult\n"
    "  onRecheck?: (newImage: string) => Promise<DiagnosticResult | null>\n"
    "}",
    "interface DiagnosticActionPlanProps {\n"
    "  diagnostic: DiagnosticResult\n"
    "  activePoolId?: string | null\n"
    "  onRecheck?: (newImage: string) => Promise<DiagnosticResult | null>\n"
    "}",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "export function DiagnosticActionPlan({\n"
    "  diagnostic,\n"
    "  onRecheck,\n"
    "}: DiagnosticActionPlanProps) {",
    "export function DiagnosticActionPlan({\n"
    "  diagnostic,\n"
    "  activePoolId,\n"
    "  onRecheck,\n"
    "}: DiagnosticActionPlanProps) {",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "      .get<{ profile: { volume?: number } | null }>('/api/pool/profile')",
    "      .get<{ profile: { volume?: number } | null }>(\n"
    "        `/api/pool/profile${activePoolId ? `?id=${encodeURIComponent(activePoolId)}` : ''}`,\n"
    "      )",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "      .get<{ tests: WaterTestRow[] }>('/api/pool/water-test')",
    "      .get<{ tests: WaterTestRow[] }>(\n"
    "        `/api/pool/water-test${activePoolId ? `?poolId=${encodeURIComponent(activePoolId)}` : ''}`,\n"
    "      )",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "  }, [])\n\n  // Regenerate steps when diagnostic or poolVolume changes",
    "  }, [activePoolId])\n\n"
    "  // Regenerate steps when diagnostic or poolVolume changes",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "        await api.post('/api/pool/water-test', {\n          ...payload,",
    "        await api.post('/api/pool/water-test', {\n"
    "          ...payload,\n"
    "          ...(activePoolId ? { poolId: activePoolId } : {}),",
)
replace_once(
    "src/components/aquamind/diagnostic-action-plan.tsx",
    "    [stepForms, latestWaterTest, markStepDone, t],",
    "    [stepForms, latestWaterTest, markStepDone, activePoolId, t],",
)

assertions = {
    "src/components/aquamind/app-shell.tsx": [
        "<ModuleDiagnostic activePoolId={activePoolId} />",
        "activePoolId={activePoolId}",
    ],
    "src/components/aquamind/module-water-test.tsx": [
        "offlineApi.waterTests(activePoolId)",
        "...(activePoolId ? { poolId: activePoolId } : {})",
    ],
    "src/components/aquamind/module-diagnostic.tsx": [
        "offlineApi.photoDiagnostic(activePoolId)",
        "poolId: activePoolId || undefined",
    ],
    "src/components/aquamind/diagnostic-action-plan.tsx": [
        "?poolId=${encodeURIComponent(activePoolId)}",
        "...(activePoolId ? { poolId: activePoolId } : {})",
    ],
}

for path, needles in assertions.items():
    text = Path(path).read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"Missing expected active-pool propagation in {path}: {needle}")

print("AQWELIA Brain active-pool fixes applied successfully")

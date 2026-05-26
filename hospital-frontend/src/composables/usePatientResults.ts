import { ref, computed } from 'vue'
import type { PatientResult, QueuedFile, UploadApiResponse } from '../types/ehr'
import { extractPatientLabel } from '../utils/fhir'
import { riskLevel } from '../utils/format'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export function usePatientResults() {
  const patients = ref<PatientResult[]>([])
  const selectedId = ref<string | null>(null)
  const isUploading = ref(false)
  const uploadErrors = ref<string[]>([])
  const successMessage = ref('')

  const selectedPatient = computed(() =>
    patients.value.find((p) => p.id === selectedId.value) ?? null
  )

  const summary = computed(() => {
    const all = patients.value
    if (all.length === 0) return null
    const withProb = all.filter((p) => p.heart_disease_probability != null)
    const avgRisk =
      withProb.length > 0
        ? withProb.reduce((sum, p) => sum + (p.heart_disease_probability ?? 0), 0) / withProb.length
        : null
    const highRiskCount = all.filter((p) => riskLevel(p.heart_disease_probability) === 'high').length
    const moderateCount = all.filter((p) => riskLevel(p.heart_disease_probability) === 'moderate').length
    return { total: all.length, avgRisk, highRiskCount, moderateCount }
  })

  function selectPatient(id: string) {
    selectedId.value = id
  }

  async function processFiles(queue: QueuedFile[]) {
    const valid = queue.filter((q) => q.parsed !== null && q.error === null)
    if (valid.length === 0) return

    isUploading.value = true
    uploadErrors.value = []
    successMessage.value = ''
    patients.value = []
    selectedId.value = null

    try {
      const response = await fetch(`${API_BASE}/api/v1/ehr_imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: 'local_demo_hospital',
          fhir_payload: valid.map((q) => q.parsed),
        }),
      })

      const data: UploadApiResponse = await response.json()

      patients.value = (data.patients ?? []).map((p, i) => ({
        ...p,
        label: extractPatientLabel(valid[i]?.parsed, valid[i]?.file.name ?? `Patient ${i + 1}`),
        batchIndex: i,
      }))

      uploadErrors.value = data.errors ?? []
      successMessage.value = data.message ?? 'Upload complete!'

      if (patients.value.length > 0) {
        selectedId.value = patients.value[0].id
      }
    } catch {
      uploadErrors.value = ['Could not connect to the API. Make sure localhost:3000 is running.']
    } finally {
      isUploading.value = false
    }
  }

  return {
    patients,
    selectedId,
    selectedPatient,
    summary,
    isUploading,
    uploadErrors,
    successMessage,
    selectPatient,
    processFiles,
  }
}

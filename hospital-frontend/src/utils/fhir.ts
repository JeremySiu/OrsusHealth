/** Extract a human-readable label from a FHIR bundle and filename fallback. */
export function extractPatientLabel(parsed: unknown, fileName: string): string {
  try {
    const bundle = parsed as {
      resourceType?: string
      entry?: Array<{ resource?: { resourceType?: string; name?: unknown[]; gender?: string; birthDate?: string } }>
    }

    const resources =
      bundle?.resourceType === 'Bundle' && Array.isArray(bundle.entry)
        ? bundle.entry.map((e) => e?.resource).filter(Boolean)
        : []

    const patient = resources.find((r) => r?.resourceType === 'Patient')

    if (patient) {
      const nameEntry = Array.isArray(patient.name) ? patient.name[0] : null
      if (nameEntry) {
        const family = (nameEntry as { family?: string }).family ?? ''
        const given = Array.isArray((nameEntry as { given?: string[] }).given)
          ? (nameEntry as { given: string[] }).given.join(' ')
          : ''
        const full = [given, family].filter(Boolean).join(' ')
        if (full.trim()) return full.trim()
      }

      if (patient.gender && patient.birthDate) {
        const year = patient.birthDate.slice(0, 4)
        const age = new Date().getFullYear() - parseInt(year, 10)
        const sex = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender
        return `Patient ${sex}, age ${age}`
      }
    }
  } catch {
    // fall through to filename
  }

  return fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' ')
}

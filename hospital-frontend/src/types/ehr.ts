export type FeatureSource = 'coded' | 'embedding' | null

export interface FeatureProvenance {
  source: FeatureSource
  className: string
  codeSystem?: 'LOINC' | 'SNOMED' | 'FHIR'
  code?: string
  display?: string
  matchedSnippet?: string | null
  cosineSimilarity?: number | null
}

export interface ShapFeature {
  feature: string
  shap_value: number
}

export type FeatureKey =
  | 'Age'
  | 'Sex'
  | 'ChestPainType'
  | 'RestingBP'
  | 'Cholesterol'
  | 'FastingBS'
  | 'RestingECG'
  | 'MaxHR'
  | 'ExerciseAngina'
  | 'Oldpeak'
  | 'ST_Slope'

export type FeatureMap = Record<FeatureKey, string | number | null>
export type ProvenanceMap = Record<FeatureKey, FeatureProvenance>

export interface PatientResult {
  id: string
  status: string
  features: FeatureMap
  feature_provenance: ProvenanceMap
  heart_disease_probability: number | null
  top_influencing_features: ShapFeature[]
  /** Client-side label derived from filename or FHIR Patient resource */
  label: string
  /** Index within the upload batch */
  batchIndex: number
}

export interface UploadApiResponse {
  message: string
  patients: Omit<PatientResult, 'label' | 'batchIndex'>[]
  errors: string[]
}

export interface QueuedFile {
  file: File
  /** Parsed FHIR JSON if valid, null if not yet parsed or invalid */
  parsed: unknown | null
  error: string | null
}

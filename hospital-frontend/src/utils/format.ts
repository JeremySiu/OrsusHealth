import type { FeatureKey } from '../types/ehr'

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  Age: 'Age',
  Sex: 'Sex',
  ChestPainType: 'Chest Pain Type',
  RestingBP: 'Resting BP (mmHg)',
  Cholesterol: 'Cholesterol (mg/dL)',
  FastingBS: 'Fasting Blood Sugar',
  RestingECG: 'Resting ECG',
  MaxHR: 'Max Heart Rate',
  ExerciseAngina: 'Exercise Angina',
  Oldpeak: 'ST Depression (Oldpeak)',
  ST_Slope: 'ST Slope',
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatFeatureValue(key: FeatureKey, value: string | number | null): string {
  if (value == null) return '—'
  if (key === 'FastingBS') return value === 1 || value === '1' ? 'Yes (>120 mg/dL)' : 'No'
  return String(value)
}

export function riskLevel(probability: number | null): 'low' | 'moderate' | 'high' {
  if (probability == null) return 'low'
  if (probability < 35) return 'low'
  if (probability < 65) return 'moderate'
  return 'high'
}

export function riskLabel(probability: number | null): string {
  if (probability == null) return 'Unknown'
  const level = riskLevel(probability)
  if (level === 'low') return 'Low Risk'
  if (level === 'moderate') return 'Moderate Risk'
  return 'High Risk'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

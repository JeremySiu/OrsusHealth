import { supabase } from './supabaseClient';

const ASSESSMENT_RECORD_TYPE = 'cardiovascular_assessment';

function toNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatShortDate(dateInput) {
  if (!dateInput) return 'Unknown date';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function fetchAssessmentRecords(userId, options = {}) {
  const { ascending = false } = options;

  const { data, error } = await supabase
    .from('health_records')
    .select('id, value, recorded_at, created_at')
    .eq('user_id', userId)
    .eq('record_type', ASSESSMENT_RECORD_TYPE)
    .order('recorded_at', { ascending });

  if (error) throw error;

  return data || [];
}

export function normalizeAssessmentRecord(record) {
  const formData = record?.value?.form_data || {};
  const prediction = record?.value?.prediction || {};
  const reportPath = record?.value?.report_path || null;

  return {
    ...record,
    formData,
    prediction,
    reportPath,
    recordedAt: record?.recorded_at ?? null,
    createdAt: record?.created_at ?? null,
    dateLabel: formatShortDate(record?.recorded_at),
    riskProbability: toNumber(prediction?.heart_disease_probability),
    restingBP: toNumber(formData?.RestingBP),
    cholesterol: toNumber(formData?.Cholesterol),
    maxHR: toNumber(formData?.MaxHR),
    raw: record,
  };
}

export function normalizeAssessmentHistory(records) {
  return (records || []).map(normalizeAssessmentRecord);
}

export { ASSESSMENT_RECORD_TYPE };

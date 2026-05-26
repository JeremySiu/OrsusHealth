<template>
  <section class="patient-detail">
    <!-- Header -->
    <div class="detail-header">
      <div>
        <h2 class="detail-name">{{ patient.label }}</h2>
        <p class="detail-status">Status: {{ patient.status }}</p>
      </div>
      <div class="risk-badge" :class="`risk-${riskLevel(patient.heart_disease_probability)}`">
        <span class="risk-pct">{{ formatPercent(patient.heart_disease_probability) }}</span>
        <span class="risk-lbl">{{ riskLabel(patient.heart_disease_probability) }}</span>
      </div>
    </div>

    <!-- Risk meter -->
    <div class="risk-meter-wrap">
      <div class="risk-meter-track">
        <div
          class="risk-meter-fill"
          :class="`risk-${riskLevel(patient.heart_disease_probability)}`"
          :style="{ width: meterWidth }"
        />
      </div>
      <div class="risk-meter-labels">
        <span>0%</span><span>35%</span><span>65%</span><span>100%</span>
      </div>
    </div>

    <!-- Top influencing features (SHAP) -->
    <div v-if="patient.top_influencing_features.length > 0" class="section">
      <h3 class="section-title">Top influencing features</h3>
      <ul class="shap-list">
        <li v-for="item in sortedShap" :key="item.feature" class="shap-item">
          <span class="shap-label">{{ featureLabel(item.feature) }}</span>
          <div class="shap-bar-wrap">
            <div
              class="shap-bar"
              :style="{ width: shapBarWidth(item.shap_value) }"
              :class="item.shap_value >= 0 ? 'positive' : 'negative'"
            />
          </div>
          <span class="shap-val">{{ item.shap_value >= 0 ? '+' : '' }}{{ item.shap_value.toFixed(3) }}</span>
        </li>
      </ul>
    </div>

    <!-- Feature grid -->
    <div class="section">
      <h3 class="section-title">Extracted features</h3>
      <table class="feature-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Value</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in FEATURE_KEYS" :key="key">
            <td class="feature-name">{{ FEATURE_LABELS[key] }}</td>
            <td class="feature-value">{{ formatFeatureValue(key, patient.features?.[key] ?? null) }}</td>
            <td>
              <StatusChip
                v-if="patient.feature_provenance?.[key]"
                :label="provenanceLabel(patient.feature_provenance[key])"
                :variant="provenanceVariant(patient.feature_provenance[key])"
              />
              <StatusChip v-else label="Missing" variant="missing" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusChip from './ui/StatusChip.vue'
import type { PatientResult, FeatureKey, FeatureProvenance } from '../types/ehr'
import { FEATURE_LABELS, formatPercent, formatFeatureValue, riskLevel, riskLabel } from '../utils/format'

const FEATURE_KEYS: FeatureKey[] = [
  'Age', 'Sex', 'ChestPainType', 'RestingBP', 'Cholesterol',
  'FastingBS', 'RestingECG', 'MaxHR', 'ExerciseAngina', 'Oldpeak', 'ST_Slope',
]

const props = defineProps<{ patient: PatientResult }>()

const meterWidth = computed(() => {
  const p = props.patient.heart_disease_probability
  if (p == null) return '0%'
  return `${Math.min(100, Math.max(0, p))}%`
})

const sortedShap = computed(() =>
  [...props.patient.top_influencing_features].sort(
    (a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value)
  )
)

const maxShap = computed(() =>
  Math.max(...props.patient.top_influencing_features.map((f) => Math.abs(f.shap_value)), 0.001)
)

function shapBarWidth(value: number): string {
  return `${Math.round((Math.abs(value) / maxShap.value) * 100)}%`
}

function featureLabel(key: string): string {
  return FEATURE_LABELS[key as FeatureKey] ?? key
}

function provenanceLabel(prov: FeatureProvenance): string {
  if (prov.source === 'coded') {
    const sys = prov.codeSystem ?? 'coded'
    return prov.code ? `${sys} ${prov.code}` : sys
  }
  if (prov.source === 'embedding') {
    const sim = prov.cosineSimilarity != null ? ` (${(prov.cosineSimilarity * 100).toFixed(0)}%)` : ''
    return `Embedding${sim}`
  }
  return 'Missing'
}

function provenanceVariant(prov: FeatureProvenance): 'coded' | 'embedding' | 'missing' {
  if (prov.source === 'coded') return 'coded'
  if (prov.source === 'embedding') return 'embedding'
  return 'missing'
}
</script>

<style scoped>
.patient-detail {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.detail-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-h);
  margin-bottom: 4px;
}

.detail-status {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.risk-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  border-radius: var(--radius);
  min-width: 80px;
  text-align: center;
}

.risk-badge.risk-low      { background: var(--risk-low-bg);      color: var(--risk-low); }
.risk-badge.risk-moderate { background: var(--risk-moderate-bg); color: var(--risk-moderate); }
.risk-badge.risk-high     { background: var(--risk-high-bg);     color: var(--risk-high); }

.risk-pct {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.risk-lbl {
  font-size: 0.72rem;
  font-weight: 600;
  margin-top: 4px;
}

/* Risk meter */
.risk-meter-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.risk-meter-track {
  height: 10px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.risk-meter-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.risk-meter-fill.risk-low      { background: var(--risk-low); }
.risk-meter-fill.risk-moderate { background: var(--risk-moderate); }
.risk-meter-fill.risk-high     { background: var(--risk-high); }

.risk-meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Sections */
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
}

/* SHAP bars */
.shap-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shap-item {
  display: grid;
  grid-template-columns: 160px 1fr 56px;
  align-items: center;
  gap: 10px;
}

.shap-label {
  font-size: 0.8rem;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shap-bar-wrap {
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.shap-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.shap-bar.positive { background: var(--risk-high); }
.shap-bar.negative { background: var(--risk-low); }

.shap-val {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Feature table */
.feature-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.feature-table th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 6px 12px;
  border-bottom: 2px solid var(--border);
}

.feature-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.feature-table tr:last-child td {
  border-bottom: none;
}

.feature-table tr:hover td {
  background: var(--accent-bg);
}

.feature-name {
  font-weight: 500;
  color: var(--text-h);
  white-space: nowrap;
}

.feature-value {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
</style>

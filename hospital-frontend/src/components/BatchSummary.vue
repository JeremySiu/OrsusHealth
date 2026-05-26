<template>
  <div class="summary-row">
    <div class="summary-card">
      <p class="summary-value">{{ summary.total }}</p>
      <p class="summary-label">Patient{{ summary.total !== 1 ? 's' : '' }} processed</p>
    </div>
    <div class="summary-card">
      <p class="summary-value" :class="avgRiskClass">
        {{ summary.avgRisk != null ? formatPercent(summary.avgRisk) : '—' }}
      </p>
      <p class="summary-label">Average risk score</p>
    </div>
    <div class="summary-card">
      <p class="summary-value risk-high">{{ summary.highRiskCount }}</p>
      <p class="summary-label">High risk (&ge;65%)</p>
    </div>
    <div class="summary-card">
      <p class="summary-value risk-moderate">{{ summary.moderateCount }}</p>
      <p class="summary-label">Moderate risk (35–65%)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent, riskLevel } from '../utils/format'

const props = defineProps<{
  summary: {
    total: number
    avgRisk: number | null
    highRiskCount: number
    moderateCount: number
  }
}>()

const avgRiskClass = computed(() => {
  const level = riskLevel(props.summary.avgRisk)
  return `risk-${level}`
})
</script>

<style scoped>
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.summary-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  box-shadow: var(--shadow);
}

.summary-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-h);
  line-height: 1;
  margin-bottom: 6px;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.risk-low      { color: var(--risk-low); }
.risk-moderate { color: var(--risk-moderate); }
.risk-high     { color: var(--risk-high); }

@media (max-width: 600px) {
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

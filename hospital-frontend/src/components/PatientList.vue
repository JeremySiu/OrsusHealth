<template>
  <aside class="patient-list">
    <p class="list-heading">Patients</p>
    <TransitionGroup tag="ul" name="list" class="list">
      <li
        v-for="patient in patients"
        :key="patient.id"
        class="list-item"
        :class="{ selected: patient.id === selectedId }"
        @click="$emit('select', patient.id)"
      >
        <div class="item-row">
          <span class="item-label">{{ patient.label }}</span>
          <StatusChip :label="riskLabel(patient.heart_disease_probability)" :variant="riskLevel(patient.heart_disease_probability)" />
        </div>
        <p class="item-prob">
          {{ patient.heart_disease_probability != null ? formatPercent(patient.heart_disease_probability) : '—' }}
          <span class="item-prob-sub">risk score</span>
        </p>
      </li>
    </TransitionGroup>
  </aside>
</template>

<script setup lang="ts">
import StatusChip from './ui/StatusChip.vue'
import type { PatientResult } from '../types/ehr'
import { formatPercent, riskLevel, riskLabel } from '../utils/format'

defineProps<{
  patients: PatientResult[]
  selectedId: string | null
}>()

defineEmits<{ select: [id: string] }>()
</script>

<style scoped>
.patient-list {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.list-heading {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--accent-bg);
}

.list-item.selected {
  background: var(--accent-bg);
  border-left: 3px solid var(--accent);
  padding-left: 13px;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.item-prob {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.item-prob-sub {
  font-size: 0.72rem;
  margin-left: 3px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>

<template>
  <div class="dashboard">
    <AppHeader />

    <main class="dashboard-main">
      <UploadZone
        :queue="queue"
        :is-uploading="isUploading"
        :is-dragging="isDragging"
        @drag-over="onDragOver"
        @drag-leave="onDragLeave"
        @drop="onDrop"
        @input-change="onInputChange"
        @remove-file="removeFile"
        @process="handleProcess"
      />

      <Transition name="fade">
        <div v-if="uploadErrors.length > 0" class="error-banner" role="alert">
          <strong>Errors encountered:</strong>
          <ul>
            <li v-for="(err, i) in uploadErrors" :key="i">{{ err }}</li>
          </ul>
        </div>
      </Transition>

      <Transition name="fade">
        <BatchSummary v-if="summary" :summary="summary" />
      </Transition>

      <Transition name="fade">
        <div v-if="patients.length > 0" class="results-grid">
          <PatientList
            :patients="patients"
            :selected-id="selectedId"
            @select="selectPatient"
          />
          <PatientDetail
            v-if="selectedPatient"
            :patient="selectedPatient"
          />
        </div>
        <div v-else-if="!isUploading && successMessage === ''" class="empty-state">
          <p class="empty-heading">No data yet</p>
          <p class="empty-sub">Upload one or more FHIR JSON files to see patient summaries and risk analysis.</p>
        </div>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import UploadZone from './components/UploadZone.vue'
import BatchSummary from './components/BatchSummary.vue'
import PatientList from './components/PatientList.vue'
import PatientDetail from './components/PatientDetail.vue'
import { useFileUpload } from './composables/useFileUpload'
import { usePatientResults } from './composables/usePatientResults'

const { queue, isDragging, removeFile, clearQueue, onDragOver, onDragLeave, onDrop, onInputChange } = useFileUpload()
const { patients, selectedId, selectedPatient, summary, isUploading, uploadErrors, successMessage, selectPatient, processFiles } = usePatientResults()

async function handleProcess() {
  await processFiles(queue.value)
  clearQueue()
}
</script>

<style scoped>
.dashboard {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.dashboard-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;
}

.error-banner {
  background: var(--risk-high-bg);
  border: 1px solid var(--risk-high);
  color: var(--risk-high);
  border-radius: var(--radius);
  padding: 14px 18px;
  font-size: 0.875rem;
}

.error-banner strong {
  display: block;
  margin-bottom: 6px;
}

.error-banner ul {
  margin: 0;
  padding-left: 18px;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: var(--text-muted);
}

.empty-heading {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-h);
  margin-bottom: 8px;
}

.empty-sub {
  font-size: 0.9rem;
  max-width: 380px;
  margin: 0 auto;
  line-height: 1.6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>

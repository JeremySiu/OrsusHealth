<template>
  <div
    class="upload-zone"
    :class="{ 'is-dragging': isDragging, 'is-uploading': isUploading }"
    @dragover="$emit('drag-over', $event)"
    @dragleave="$emit('drag-leave')"
    @drop="$emit('drop', $event)"
  >
    <div v-if="isUploading" class="uploading-overlay">
      <span class="spinner" aria-hidden="true" />
      <p>Processing files through the AI pipeline…</p>
    </div>

    <template v-else>
      <!-- Drop prompt -->
      <div class="drop-area">
        <div class="cloud-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M48 26.5C47.3 18.4 40.4 12 32 12C25.3 12 19.5 16 16.8 21.7C11.7 22.6 8 27.1 8 32.5C8 38.3 12.7 43 18.5 43H47C51.9 43 56 38.9 56 34C56 29.4 52.4 25.6 48 25.5V26.5Z"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M32 52V30"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <path
              d="M25 37L32 30L39 37"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <p class="drop-heading">Drag &amp; Drop Your Files Here</p>
        <p class="drop-or">Or</p>

        <label class="btn btn-primary file-label">
          Browse Files
          <input
            type="file"
            multiple
            accept=".json"
            class="hidden-input"
            @change="$emit('input-change', $event)"
          />
        </label>
      </div>

      <!-- File queue -->
      <TransitionGroup v-if="queue.length > 0" tag="ul" name="file-list" class="file-queue">
        <li v-for="(item, i) in queue" :key="item.file.name + item.file.size" class="file-item">
          <span class="file-type-badge" aria-hidden="true">JSON</span>
          <div class="file-info">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
            <span v-if="item.error" class="file-error">{{ item.error }}</span>
          </div>
          <div class="file-actions">
            <span v-if="!item.error" class="file-check" aria-label="Valid">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
            <button class="remove-btn" @click="$emit('remove-file', i)" aria-label="Remove file">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </li>
      </TransitionGroup>

      <!-- Process action -->
      <div v-if="queue.length > 0" class="queue-actions">
        <span class="queue-count">{{ validCount }} file{{ validCount !== 1 ? 's' : '' }} ready to process</span>
        <button class="btn btn-primary" :disabled="validCount === 0" @click="$emit('process')">
          Process {{ validCount }} file{{ validCount !== 1 ? 's' : '' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueuedFile } from '../types/ehr'
import { formatFileSize } from '../utils/format'

const props = defineProps<{
  queue: QueuedFile[]
  isUploading: boolean
  isDragging: boolean
}>()

defineEmits<{
  'drag-over': [e: DragEvent]
  'drag-leave': []
  'drop': [e: DragEvent]
  'input-change': [e: Event]
  'remove-file': [index: number]
  'process': []
}>()

const validCount = computed(() => props.queue.filter((q) => q.error === null && q.parsed !== null).length)
</script>

<style scoped>
.upload-zone {
  background: var(--bg-card);
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  transition: border-color 0.2s, background 0.2s;
  position: relative;
  overflow: hidden;
}

.upload-zone.is-dragging {
  border-color: var(--accent);
  background: var(--accent-bg);
}

/* Drop area */
.drop-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 24px 32px;
  text-align: center;
}

.cloud-icon {
  width: 72px;
  height: 72px;
  color: var(--accent);
  margin-bottom: 8px;
}

.cloud-icon svg {
  width: 100%;
  height: 100%;
}

.drop-heading {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.drop-or {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 2px 0 8px;
}

.hidden-input {
  display: none;
}

.file-label {
  cursor: pointer;
}

/* File queue */
.file-queue {
  list-style: none;
  margin: 0;
  padding: 0 20px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.file-type-badge {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  padding: 3px 5px;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-weight: 500;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.file-error {
  font-size: 0.78rem;
  color: var(--risk-high);
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.file-check {
  color: var(--risk-low);
  display: flex;
  align-items: center;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 3px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}

.remove-btn:hover {
  color: var(--risk-high);
  background: var(--risk-high-bg);
}

/* Queue actions */
.queue-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}

.queue-count {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Uploading */
.uploading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 24px;
  color: var(--text);
  font-size: 0.9rem;
}

.spinner {
  display: block;
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  transition: opacity 0.15s, background 0.15s;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
}

.btn-primary:not(:disabled):hover {
  opacity: 0.88;
}

/* TransitionGroup */
.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.2s ease;
}

.file-list-enter-from,
.file-list-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>

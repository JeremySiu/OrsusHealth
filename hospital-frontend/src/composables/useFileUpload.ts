import { ref } from 'vue'
import type { QueuedFile } from '../types/ehr'

export function useFileUpload() {
  const queue = ref<QueuedFile[]>([])
  const isDragging = ref(false)

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files)
    for (const file of incoming) {
      if (!file.name.endsWith('.json')) continue
      if (queue.value.some((q) => q.file.name === file.name && q.file.size === file.size)) continue
      queue.value.push({ file, parsed: null, error: null })
    }
    parseQueue()
  }

  function removeFile(index: number) {
    queue.value.splice(index, 1)
  }

  function clearQueue() {
    queue.value = []
  }

  async function parseQueue() {
    for (const item of queue.value) {
      if (item.parsed !== null || item.error !== null) continue
      try {
        const text = await item.file.text()
        item.parsed = JSON.parse(text)
        item.error = null
      } catch {
        item.error = 'Invalid JSON — could not parse this file'
        item.parsed = null
      }
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging.value = true
  }

  function onDragLeave() {
    isDragging.value = false
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragging.value = false
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
  }

  function onInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files) addFiles(input.files)
    input.value = ''
  }

  return { queue, isDragging, addFiles, removeFile, clearQueue, onDragOver, onDragLeave, onDrop, onInputChange }
}

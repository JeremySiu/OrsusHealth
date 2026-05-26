<template>
  <span class="chip" :class="variant">{{ label }}</span>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  variant: 'low' | 'moderate' | 'high' | 'coded' | 'embedding' | 'missing' | 'neutral'
}>()
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.low    { background: var(--risk-low-bg);      color: var(--risk-low); }
.moderate { background: var(--risk-moderate-bg); color: var(--risk-moderate); }
.high   { background: var(--risk-high-bg);     color: var(--risk-high); }
.coded  { background: var(--accent-bg);        color: var(--accent); border: 1px solid var(--accent-border); }
.embedding { background: #eff6ff; color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
.missing { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
.neutral { background: var(--bg); color: var(--text); border: 1px solid var(--border); }

@media (prefers-color-scheme: dark) {
  .embedding { background: rgba(59,130,246,0.12); color: #93c5fd; border-color: rgba(147,197,253,0.3); }
}
</style>

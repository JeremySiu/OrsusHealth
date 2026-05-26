<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="brand">
        <img src="/BooHooLogo.png" alt="BooHoo Health logo" class="brand-logo" />
        <div>
          <h1 class="brand-title">EHR Pipeline</h1>
          <p class="brand-sub">Semantic Normalization Dashboard</p>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
}

.brand-title {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-h);
}

.brand-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 1px;
}
</style>

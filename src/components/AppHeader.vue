<script setup>
defineProps({
  currentTime: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <header class="desktop-header glass-panel panel card-lift desktop-only">
    <div class="desktop-header__brand">
      <div class="desktop-header__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="26" height="26">
          <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />
          <path d="M9.5 11.5l1.8 1.8 3.7-4.2" />
        </svg>
      </div>
      <div>
        <h1 class="desktop-header__title">SmartLab IoT Dashboard - 智能终端管控平台</h1>
        <p class="desktop-header__subtitle">Dual Authentication · Relay Control · Edge Sensing</p>
      </div>
    </div>

    <div class="desktop-header__meta">
      <div class="desktop-header__time">{{ currentTime }}</div>
      <div class="desktop-header__server">
        <span class="desktop-header__server-dot" />
        <span>Edge Server Online</span>
      </div>
    </div>
  </header>
</template>

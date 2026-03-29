<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  environment: {
    type: Object,
    required: true,
  },
  logs: {
    type: Array,
    required: true,
  },
  logEventCount: {
    type: Number,
    required: true,
  },
});

const logContainer = ref(null);

watch(
  () => props.logs.length,
  async () => {
    await nextTick();
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  },
);
</script>

<template>
  <section class="ops-panel">
    <div class="panel glass-panel card-lift ops-panel__env">
      <div class="ops-panel__header">
        <div>
          <h2 class="section-title">环境感知</h2>
          <p class="section-subtitle">Environment Monitoring</p>
        </div>
      </div>

      <div class="sensor-grid">
        <article class="panel-card sensor-card">
          <div class="sensor-card__head">
            <span>温度</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20" class="sensor-card__icon sensor-card__icon--temp">
              <path d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0z" />
            </svg>
          </div>
          <div class="sensor-gauge" :style="{ '--gauge-value': `${props.environment.tempGauge}%`, '--gauge-start': '#fb7185', '--gauge-end': '#22d3ee' }">
            <div class="sensor-gauge__inner">
              <strong>{{ props.environment.temperature.toFixed(1) }}</strong>
              <span>°C</span>
            </div>
          </div>
          <div class="sensor-card__foot">THERMAL SENSOR</div>
        </article>

        <article class="panel-card sensor-card">
          <div class="sensor-card__head">
            <span>湿度</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20" class="sensor-card__icon sensor-card__icon--humid">
              <path d="M12 3C9 7 6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-3-7-6-11z" />
            </svg>
          </div>
          <div class="sensor-gauge" :style="{ '--gauge-value': `${props.environment.humidityGauge}%`, '--gauge-start': '#38bdf8', '--gauge-end': '#34d399' }">
            <div class="sensor-gauge__inner">
              <strong>{{ props.environment.humidity.toFixed(1) }}</strong>
              <span>%</span>
            </div>
          </div>
          <div class="sensor-card__foot">HUMIDITY SENSOR</div>
        </article>
      </div>
    </div>

    <div class="panel glass-panel card-lift ops-panel__logs">
      <div class="logs-card">
        <div class="logs-card__head">
          <div>
            <h2 class="section-title">实时日志流</h2>
            <p class="section-subtitle">System Logs</p>
          </div>
          <span class="logs-card__count">{{ props.logEventCount }} events</span>
        </div>

        <div ref="logContainer" class="logs-card__list">
          <div v-for="(log, index) in props.logs" :key="`${log.time}-${index}`" class="logs-card__item">
            <span class="logs-card__time">[{{ log.time }}]</span>
            <span class="logs-card__tag" :class="log.colorClass">[{{ log.type }}]</span>
            <span class="logs-card__message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ops-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.ops-panel__env,
.ops-panel__logs {
  min-width: 0;
}

.ops-panel__env {
  padding: 18px;
}

.ops-panel__header {
  margin-bottom: 14px;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sensor-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  min-height: 224px;
}

.sensor-card__head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.sensor-card__icon--temp {
  color: var(--danger);
}

.sensor-card__icon--humid {
  color: var(--text-accent);
}

.sensor-gauge {
  position: relative;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, rgba(15, 23, 42, 0.96) 56%, transparent 57%),
    conic-gradient(from -90deg, var(--gauge-start), var(--gauge-end) var(--gauge-value), rgba(51, 65, 85, 0.92) var(--gauge-value), rgba(51, 65, 85, 0.92));
}

.sensor-gauge::after {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(51, 65, 85, 0.76);
}

.sensor-gauge__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sensor-gauge__inner strong {
  font-size: 1.75rem;
}

.sensor-gauge__inner span {
  color: var(--text-soft);
  font-size: 0.88rem;
}

.sensor-card__foot {
  color: var(--text-dim);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
}

.ops-panel__logs {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.logs-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.logs-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.logs-card__count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.86);
  background: rgba(15, 23, 42, 0.72);
  color: var(--text-soft);
  font-family:
    ui-monospace,
    "SFMono-Regular",
    Menlo,
    Consolas,
    monospace;
  font-size: 0.78rem;
}

.logs-card__list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(51, 65, 85, 0.72);
  background: rgba(2, 6, 23, 0.58);
  padding: 12px 14px 18px;
  font-family:
    ui-monospace,
    "SFMono-Regular",
    Menlo,
    Consolas,
    monospace;
}

.logs-card__list::-webkit-scrollbar {
  width: 6px;
}

.logs-card__list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.8);
}

.logs-card__item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.38);
}

.logs-card__item:last-child {
  border-bottom: none;
}

.logs-card__time {
  color: #94a3b8;
}

.logs-card__tag {
  font-weight: 700;
}

.logs-card__message {
  word-break: break-word;
  color: var(--text-main);
}

.log-cyan {
  color: #22d3ee;
}

.log-amber {
  color: #f59e0b;
}

.log-blue {
  color: #60a5fa;
}

.log-green {
  color: #34d399;
}

.log-fuchsia {
  color: #e879f9;
}

.log-slate {
  color: #cbd5e1;
}

@media (max-width: 900px) {
  .sensor-grid {
    grid-template-columns: 1fr;
  }

  .logs-card__item {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>

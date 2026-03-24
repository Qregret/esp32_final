<script setup>
const props = defineProps({
  auth: {
    type: Object,
    required: true,
  },
  statusToneClass: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <section class="panel glass-panel card-lift auth-panel">
    <div class="auth-panel__header">
      <div>
        <h2 class="section-title">人脸与 RFID 双重认证</h2>
        <p class="section-subtitle">Identity Authentication</p>
      </div>
      <span class="auth-panel__live status-pill">LIVE</span>
    </div>

    <div class="auth-panel__shell">
      <div class="auth-camera scan-overlay panel-card">
        <span class="auth-camera__badge">{{ props.auth.cameraStatus }}</span>

        <div class="auth-camera__center">
          <div class="auth-camera__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="70" height="70">
              <path d="M4 8a2 2 0 0 1 2-2h2l1.2-2h5.6L16 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </div>
          <div class="auth-camera__placeholder">
            <div class="auth-camera__placeholder-title">摄像头画面预览</div>
            <div class="auth-camera__placeholder-subtitle">边缘摄像头 / 实时识别</div>
          </div>
        </div>

        <div class="auth-camera__status">
          <span class="auth-camera__status-label">当前状态</span>
          <strong :class="props.statusToneClass(props.auth.flowState)" class="auth-camera__status-value">
            {{ props.auth.statusText }}
          </strong>
        </div>
      </div>

      <div class="auth-panel__info-row">
        <div class="panel-card auth-info-card">
          <div class="auth-info-card__head">
            <span>RFID 卡号</span>
            <span>UID</span>
          </div>
          <div class="auth-info-card__mono" :class="{ 'is-empty': !props.auth.rfidUid }">
            {{ props.auth.rfidUid || "-- -- -- --" }}
          </div>
        </div>

        <div class="panel-card auth-info-card">
          <div class="auth-info-card__head">
            <span>人脸比对相似度</span>
            <span
              :class="{
                'tone-success': props.auth.similarity >= 90,
                'tone-processing': props.auth.similarity >= 60 && props.auth.similarity < 90,
                'tone-error': props.auth.similarity < 60,
              }"
            >
              {{ props.auth.similarity.toFixed(1) }}%
            </span>
          </div>
          <div class="auth-progress">
            <div
              class="auth-progress__bar"
              :class="{
                'is-success': props.auth.similarity >= 90,
                'is-processing': props.auth.similarity >= 60 && props.auth.similarity < 90,
                'is-error': props.auth.similarity < 60,
              }"
              :style="{ width: `${props.auth.similarity}%` }"
            />
          </div>
        </div>
      </div>

      <div class="panel-card auth-result-card">
        <div class="auth-result-card__copy">
          <span class="auth-result-card__label">最终判定</span>
          <strong class="auth-result-card__value">{{ props.auth.resultLabel }}</strong>
        </div>

        <span
          class="auth-result-card__badge"
          :class="{
            'is-success': props.auth.result === 'granted',
            'is-error': props.auth.result === 'denied',
            'is-idle': props.auth.result === 'standby',
          }"
        >
          {{ props.auth.result === "granted" ? "Access Granted" : props.auth.result === "denied" ? "Access Denied" : "Standby" }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-panel {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.auth-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.auth-panel__live {
  min-width: 88px;
  padding: 10px 18px;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  line-height: 1;
}

.auth-panel__shell {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(51, 65, 85, 0.78);
  background: rgba(2, 6, 23, 0.42);
}

.auth-camera {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  flex: 1 1 auto;
  min-height: 320px;
  padding: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(56, 189, 248, 0.12), transparent 42%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92));
}

.scan-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(148, 163, 184, 0.03),
      rgba(148, 163, 184, 0.03) 2px,
      transparent 2px,
      transparent 5px
    );
  pointer-events: none;
}

.scan-overlay::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 32%;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0), rgba(56, 189, 248, 0.14), rgba(16, 185, 129, 0));
  animation: auth-scan 3s linear infinite;
  filter: blur(2px);
  pointer-events: none;
}

.auth-camera__badge {
  position: relative;
  z-index: 1;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  font-size: 0.94rem;
}

.auth-camera__center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.auth-camera__icon {
  width: 148px;
  height: 148px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  background: rgba(34, 211, 238, 0.08);
  color: var(--text-accent);
}

.auth-camera__placeholder {
  text-align: center;
}

.auth-camera__placeholder-title {
  color: rgba(148, 163, 184, 0.82);
  letter-spacing: 0.08em;
  font-size: 0.96rem;
}

.auth-camera__placeholder-subtitle {
  margin-top: 8px;
  color: rgba(100, 116, 139, 0.94);
  font-size: 0.78rem;
}

.auth-camera__status {
  position: relative;
  z-index: 1;
  border-radius: var(--radius-md);
  border: 1px solid rgba(34, 211, 238, 0.1);
  background: rgba(15, 23, 42, 0.74);
  padding: 14px 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.auth-camera__status-label {
  display: block;
  color: var(--text-soft);
  font-size: 0.88rem;
}

.auth-camera__status-value {
  display: block;
  margin-top: 6px;
  font-size: 1.12rem;
  line-height: 1.36;
}

.auth-panel__info-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.auth-info-card {
  padding: 14px 16px;
}

.auth-info-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-soft);
  font-size: 0.88rem;
}

.auth-info-card__mono {
  margin-top: 12px;
  font-family:
    ui-monospace,
    "SFMono-Regular",
    Menlo,
    Consolas,
    monospace;
  color: var(--text-accent);
  font-size: 1.32rem;
  letter-spacing: 0.18em;
}

.auth-info-card__mono.is-empty {
  color: var(--text-dim);
}

.auth-progress {
  margin-top: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.92);
  overflow: hidden;
}

.auth-progress__bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.45s ease;
}

.auth-progress__bar.is-success {
  background: linear-gradient(90deg, #10b981, #22d3ee);
}

.auth-progress__bar.is-processing {
  background: linear-gradient(90deg, #3b82f6, #22d3ee);
}

.auth-progress__bar.is-error {
  background: linear-gradient(90deg, #fb7185, #fb923c);
}

.auth-result-card {
  margin-top: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth-result-card__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-result-card__label {
  color: var(--text-soft);
  font-size: 0.88rem;
}

.auth-result-card__value {
  font-size: 1.18rem;
  line-height: 1.38;
}

.auth-result-card__badge {
  flex-shrink: 0;
  min-width: 126px;
  text-align: center;
  padding: 14px 18px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.88);
  background: rgba(15, 23, 42, 0.72);
  color: var(--text-soft);
}

.auth-result-card__badge.is-success {
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.12);
}

.auth-result-card__badge.is-error {
  color: #fda4af;
  border-color: rgba(244, 63, 94, 0.26);
  background: rgba(244, 63, 94, 0.1);
}

.auth-result-card__badge.is-idle {
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.26);
  background: rgba(59, 130, 246, 0.1);
}

.status-success,
.tone-success {
  color: #6ee7b7;
}

.status-processing,
.tone-processing {
  color: #60a5fa;
}

.status-error,
.tone-error {
  color: #fda4af;
}

.status-idle {
  color: #cbd5e1;
}

@keyframes auth-scan {
  0% {
    transform: translateY(-100%);
  }

  100% {
    transform: translateY(300%);
  }
}

@media (max-width: 767px) {
  .auth-panel {
    height: 100%;
    padding: 18px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .auth-panel__header {
    align-items: center;
    min-height: 56px;
    margin-bottom: 12px;
  }

  .auth-panel__header .section-title {
    font-size: 1.05rem;
    line-height: 1.2;
    font-weight: 700;
  }

  .auth-panel__header .section-subtitle {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.88);
  }

  .auth-panel__live {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    min-width: 88px;
    padding: 10px 14px;
    font-size: 0.74rem;
    line-height: 1;
    text-align: center;
  }

  .auth-panel__shell {
    flex: 1 1 auto;
    min-height: fit-content;
    padding: 12px 10px 10px;
    background: rgba(2, 6, 23, 0.42);
  }

  .auth-camera {
    min-height: 0;
    padding: 18px 18px 18px;
  }

  .auth-camera__badge {
    min-height: 38px;
    padding: 0 14px;
    font-size: 0.82rem;
  }

  .auth-camera__center {
    gap: 14px;
  }

  .auth-camera__icon {
    width: 124px;
    height: 124px;
  }

  .auth-camera__icon svg {
    width: 58px;
    height: 58px;
  }

  .auth-camera__placeholder-title {
    font-size: 0.76rem;
    letter-spacing: 0.08em;
  }

  .auth-camera__placeholder-subtitle {
    margin-top: 6px;
    font-size: 0.64rem;
  }

  .auth-camera__status {
    padding: 14px;
  }

  .auth-camera__status-label {
    font-size: 0.76rem;
  }

  .auth-camera__status-value {
    font-size: 0.98rem;
  }

  .auth-panel__info-row {
    margin-top: 12px;
    gap: 10px;
  }

  .auth-info-card {
    padding: 12px;
    border-radius: var(--radius-md);
  }

  .auth-info-card__head {
    font-size: 0.8rem;
  }

  .auth-info-card__mono {
    font-size: 0.96rem;
    letter-spacing: 0.12em;
  }

  .auth-result-card {
    margin-top: 12px;
    padding: 12px;
    gap: 10px;
  }

  .auth-result-card__label {
    font-size: 0.8rem;
  }

  .auth-result-card__value {
    font-size: 1rem;
  }

  .auth-result-card__badge {
    min-width: 112px;
    padding: 12px 14px;
    font-size: 0.82rem;
  }
}
</style>

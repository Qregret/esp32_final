<script setup>
import AppHeader from "./components/AppHeader.vue";
import AuthPanel from "./components/AuthPanel.vue";
import MonitorPanel from "./components/MonitorPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import SeatsPanel from "./components/SeatsPanel.vue";
import { useDashboard } from "./composables/useDashboard";

const {
  currentTime,
  auth,
  seats,
  environment,
  logs,
  logEventCount,
  mobileTab,
  isMobileView,
  activeSeatCount,
  seatLabel,
  seatStatusText,
  seatChargeText,
  seatChargePercent,
  statusToneClass,
  seatActionError,
  seatActionNotice,
  isSeatPending,
  toggleSeat,
} = useDashboard();

const showPanel = (tab) => !isMobileView.value || mobileTab.value === tab;
</script>

<template>
  <div class="dashboard-shell grid-bg">
    <div class="dashboard-inner">
      <AppHeader :current-time="currentTime" />

      <main class="dashboard-main">
        <AuthPanel
          v-show="showPanel('auth')"
          class="dashboard-panel"
          :auth="auth"
          :status-tone-class="statusToneClass"
        />

        <SeatsPanel
          v-show="showPanel('seats')"
          class="dashboard-panel"
          :seats="seats"
          :active-seat-count="activeSeatCount"
          :seat-label="seatLabel"
          :seat-status-text="seatStatusText"
          :seat-charge-text="seatChargeText"
          :seat-charge-percent="seatChargePercent"
          :seat-action-error="seatActionError"
          :is-seat-pending="isSeatPending"
          @toggle-seat="toggleSeat"
        />

        <MonitorPanel
          v-show="showPanel('ops')"
          class="dashboard-panel"
          :environment="environment"
          :logs="logs"
          :log-event-count="logEventCount"
        />
      </main>
    </div>

    <transition name="seat-action-toast">
      <div
        v-if="seatActionNotice.visible"
        class="seat-action-toast"
        :class="`is-${seatActionNotice.tone}`"
      >
        {{ seatActionNotice.message }}
      </div>
    </transition>

    <MobileTabBar v-if="isMobileView" v-model="mobileTab" />
  </div>
</template>

<style scoped>
.seat-action-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 1200;
  transform: translateX(-50%);
  min-width: 220px;
  max-width: min(88vw, 420px);
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.88);
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  box-shadow: 0 18px 45px rgba(2, 6, 23, 0.34);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  text-align: center;
  font-size: 0.92rem;
  line-height: 1.4;
}

.seat-action-toast.is-processing {
  border-color: rgba(34, 211, 238, 0.2);
  color: #d1fae5;
}

.seat-action-toast.is-success {
  border-color: rgba(16, 185, 129, 0.22);
  color: #a7f3d0;
}

.seat-action-toast.is-error {
  border-color: rgba(248, 113, 113, 0.24);
  color: #fecaca;
}

.seat-action-toast-enter-active,
.seat-action-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.seat-action-toast-enter-from,
.seat-action-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

@media (max-width: 767px) {
  .seat-action-toast {
    top: 18px;
    min-width: 0;
    max-width: calc(100vw - 32px);
    padding: 11px 14px;
    border-radius: 14px;
    font-size: 0.84rem;
  }
}
</style>

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

    <MobileTabBar v-if="isMobileView" v-model="mobileTab" />
  </div>
</template>

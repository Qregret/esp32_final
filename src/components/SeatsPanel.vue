<script setup>
const props = defineProps({
  seats: {
    type: Array,
    required: true,
  },
  activeSeatCount: {
    type: Number,
    required: true,
  },
  seatLabel: {
    type: Function,
    required: true,
  },
  seatStatusText: {
    type: Function,
    required: true,
  },
  seatChargeText: {
    type: Function,
    required: true,
  },
  seatChargePercent: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["toggle-seat"]);

const toggleSeat = (seat) => {
  emit("toggle-seat", seat);
};

const formatDuration = (seconds) => {
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const remain = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remain}`;
};
</script>

<template>
  <section class="panel glass-panel card-lift seats-panel">
    <div class="seats-panel__header">
      <div>
        <h2 class="section-title">座位 / 设备继电器控制</h2>
        <p class="section-subtitle">Resource Management</p>
      </div>
      <div class="seats-panel__summary">
        启用座位: <span>{{ props.activeSeatCount }}</span> / {{ props.seats.length }}
      </div>
    </div>

    <div class="seats-grid">
      <article
        v-for="seat in props.seats"
        :key="seat.id"
        class="panel-card card-lift seat-card"
        :class="{ 'is-active': seat.occupied }"
      >
        <div class="seat-card__head">
          <div class="seat-card__title-group">
            <h3 class="seat-card__title">{{ props.seatLabel(seat.id) }}</h3>
            <p class="seat-card__status" :class="{ 'is-active': seat.occupied }">
              {{ props.seatStatusText(seat) }}
            </p>
          </div>
          <span class="seat-card__relay" :class="{ 'is-on': seat.power }">
            {{ seat.power ? "继电器开启" : "继电器关闭" }}
          </span>
        </div>

        <div class="seat-card__meta">
          <div class="seat-card__meta-row">
            <span class="seat-card__meta-label">使用者</span>
            <strong class="seat-card__meta-value">{{ seat.user || "无人" }}</strong>
          </div>
          <div class="seat-card__meta-row">
            <span class="seat-card__meta-label">已使用时长</span>
            <strong class="seat-card__meta-value seat-card__mono">
              {{ seat.occupied ? formatDuration(seat.seconds) : "00:00:00" }}
            </strong>
          </div>
        </div>

        <div class="seat-card__power">
          <span class="seat-card__power-label">台灯 / 电源</span>
          <button class="seat-card__switch" :class="{ 'is-on': seat.power }" type="button" @click="toggleSeat(seat)">
            {{ seat.power ? "电源开" : "电源关" }}
          </button>
        </div>

        <div class="seat-card__charge">
          <div class="seat-card__charge-row">
            <span class="seat-card__charge-label">消费金额</span>
            <strong class="seat-card__mono">{{ props.seatChargeText(seat) }}</strong>
          </div>
          <div class="seat-card__charge-track">
            <div class="seat-card__charge-bar" :style="{ width: `${props.seatChargePercent(seat)}%` }" />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.seats-panel {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.seats-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.seats-panel__summary {
  color: var(--text-soft);
  font-size: 0.98rem;
  text-align: right;
}

.seats-panel__summary span {
  color: #6ee7b7;
  font-weight: 700;
}

.seats-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  overflow: visible;
  padding-top: 8px;
}

.seat-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 14px 12px;
  border-radius: var(--radius-lg);
}

.seat-card.is-active {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(16, 185, 129, 0.05);
}

.seat-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.seat-card__title-group {
  min-width: 0;
}

.seat-card__title {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.12;
}

.seat-card__status {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-soft);
}

.seat-card__status.is-active {
  color: #34d399;
}

.seat-card__relay {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.86);
  background: rgba(30, 41, 59, 0.82);
  color: var(--text-soft);
  font-size: 0.72rem;
}

.seat-card__relay.is-on {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
}

.seat-card__meta {
  display: grid;
  gap: 8px;
}

.seat-card__meta-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.seat-card__meta-label {
  color: var(--text-soft);
  font-size: 0.86rem;
  white-space: nowrap;
}

.seat-card__meta-value {
  min-width: 0;
  color: var(--text-main);
  font-weight: 600;
  text-align: right;
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat-card__mono {
  font-family:
    ui-monospace,
    "SFMono-Regular",
    Menlo,
    Consolas,
    monospace;
  color: var(--text-accent) !important;
}

.seat-card__power {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.seat-card__power-label {
  color: var(--text-soft);
  font-size: 0.86rem;
  white-space: nowrap;
}

.seat-card__switch {
  width: 80px;
  min-width: 70px;
  min-height: 34px;
  padding: 0 14px;
  font-size: 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.86);
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
  cursor: pointer;
}

.seat-card__switch.is-on {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(16, 185, 129, 0.14);
  color: #d1fae5;
}

.seat-card__charge {
  margin-top: auto;
  padding-top: 8px;
}

.seat-card__charge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-soft);
  font-size: 0.78rem;
}

.seat-card__charge-label {
  white-space: nowrap;
}

.seat-card__charge-track {
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.92);
  overflow: hidden;
}

.seat-card__charge-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #10b981, #22d3ee);
}

@media (max-width: 767px) {
  .seats-panel {
    height: 100%;
    padding: 18px 14px 16px;
    overflow: hidden;
  }

  .seats-panel__header {
    flex: 0 0 auto;
    margin-bottom: 14px;
  }

  .seats-panel__header .section-title {
    font-size: 1.06rem;
    line-height: 1.2;
  }

  .seats-panel__header .section-subtitle {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.88);
  }

  .seats-panel__summary {
    font-size: 0.9rem;
    line-height: 1.35;
  }

  .seats-grid {
    flex: 1 1 auto;
    min-height: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(228px, auto);
    gap: 14px 10px;
    align-content: start;
    padding-top: 10px;
    padding-bottom: 28px;
    padding-right: 9px;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    scroll-padding-bottom: 28px;
  }

  .seat-card {
    min-height: 228px;
    padding: 16px 14px 14px;
    border-radius: 22px;
    position: relative;
    z-index: 0;
  }

  .seat-card:hover {
    transform: translateY(0);
    z-index: 2;
  }

  .seat-card__head {
    margin-bottom: 12px;
  }

  .seat-card__title {
    font-size: 0.98rem;
    line-height: 1.08;
  }

  .seat-card__status {
    margin-top: 6px;
    font-size: 0.8rem;
  }

  .seat-card__relay {
    display: none;
  }

  .seat-card__meta {
    gap: 10px;
  }

  .seat-card__meta-label,
  .seat-card__meta-value,
  .seat-card__power-label {
    font-size: 0.78rem;
  }

  .seat-card__power {
    margin-top: 12px;
    gap: 8px;
  }

  .seat-card__switch {
    width: 61px;
    min-width: 30px;
    min-height: 36px;
    padding: 0 10px;
    margin-right:-6px;
    font-size: 0.74rem;
  }

  .seat-card__charge {
    margin-top: 8px;
    padding-top: 4px;
  }

  .seat-card__charge-row {
    font-size: 0.76rem;
  }

  .seat-card__charge-track {
    margin-top: 8px;
    height: 6px;
  }
}
</style>

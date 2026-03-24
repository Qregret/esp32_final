<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const tabs = [
  { key: "auth", label: "认证", hint: "RFID" },
  { key: "seats", label: "座位", hint: "Relay" },
  { key: "ops", label: "监控", hint: "Logs" },
];
</script>

<template>
  <nav class="mobile-tabbar mobile-only">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="mobile-tabbar__button"
      :class="{ 'is-active': props.modelValue === tab.key }"
      @click="emit('update:modelValue', tab.key)"
    >
      <span class="mobile-tabbar__label">{{ tab.label }}</span>
      <span class="mobile-tabbar__hint">{{ tab.hint }}</span>
    </button>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 10px;
  border-radius: 24px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.42);
}

.mobile-tabbar__button {
  min-height: 56px;
  border-radius: 18px;
  border: 1px solid rgba(51, 65, 85, 0.86);
  background: rgba(15, 23, 42, 0.68);
  color: rgb(148 163 184);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.25s ease;
}

.mobile-tabbar__button.is-active {
  color: rgb(240 253 250);
  border-color: rgba(45, 212, 191, 0.45);
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.24), rgba(8, 47, 73, 0.92));
  box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.08);
}

.mobile-tabbar__label {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1;
}

.mobile-tabbar__hint {
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  opacity: 0.82;
}
</style>

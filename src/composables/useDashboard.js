import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  getCurrentSeats,
  getDashboardOverview,
  getLatestEnvironment,
  getRecentLogs,
  powerOffSeat,
  powerOnSeat,
  subscribeToDashboardEvents,
} from "../services/dashboardApi";

const LOG_COLORS = {
  MQTT: "log-cyan",
  SERIAL: "log-amber",
  HTTP: "log-blue",
  AI: "log-green",
  GPIO: "log-fuchsia",
  SYS: "log-slate",
};

const CAMERA_STATUS_TEXT = {
  ready: "摄像头就绪",
  camera_ready: "摄像头就绪",
  idle: "监控中",
  monitoring: "监控中",
  listening: "监控中",
  rfid_scanned: "RFID 已触发",
  rfid_triggered: "RFID 已触发",
  image_uploaded: "正在上传画面",
  uploading: "正在上传画面",
  uploaded: "正在上传画面",
  processing: "正在识别",
  analyzing: "正在识别",
  recognized: "识别完成",
  success: "识别完成",
  failed: "识别失败",
  error: "识别失败",
};

const STATUS_TEXT_MAP = {
  "Auth granted. Starting seat linkage.": "认证通过，正在联动座位设备…",
  "Auth granted": "认证通过",
  "Auth denied": "认证失败，请重试",
  "Auth processing": "正在进行身份比对…",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function translateCameraStatus(value) {
  if (!value) return "监控中";
  const mapped = CAMERA_STATUS_TEXT[String(value).trim().toLowerCase()];
  return mapped || String(value);
}

function translateStatusText(value, fallback) {
  if (!value) return fallback;
  return STATUS_TEXT_MAP[value] || value;
}

function getDefaultAuth() {
  return {
    cameraStatus: "监控中",
    flowState: "idle",
    statusText: "会话已建立，等待下一次认证请求…",
    rfidUid: "",
    similarity: 0,
    result: "standby",
    resultLabel: "系统待机中",
  };
}

function getDefaultEnvironment() {
  return {
    temperature: 25.0,
    humidity: 45.0,
    tempGauge: 63,
    humidityGauge: 45,
  };
}

function normalizeAuth(authSource) {
  if (!authSource) {
    return getDefaultAuth();
  }

  const result = authSource.authResult || authSource.result || "standby";
  const userName = authSource.userName || "";
  const similarity = Number(authSource.similarity ?? 0);

  let resultLabel = "系统待机中";
  if (result === "granted") {
    resultLabel = userName ? `${userName} 身份确认成功` : "认证通过";
  } else if (result === "denied") {
    resultLabel = userName ? `${userName} 身份认证失败` : "认证未通过";
  }

  return {
    cameraStatus: translateCameraStatus(authSource.cameraStatus),
    flowState: authSource.flowState || "idle",
    statusText: translateStatusText(authSource.statusText, "会话已建立，等待下一次认证请求…"),
    rfidUid: authSource.rfidUid || "",
    similarity: Number.isFinite(similarity) ? similarity : 0,
    result,
    resultLabel,
  };
}

function normalizeEnvironment(source) {
  if (!source) {
    return getDefaultEnvironment();
  }

  const temperature = Number(source.temperatureC ?? source.temperature ?? 25);
  const humidity = Number(source.humidityPercent ?? source.humidity ?? 45);
  const tempGauge = Number(source.tempGauge ?? Math.round((temperature / 40) * 100));
  const humidityGauge = Number(source.humidityGauge ?? Math.round(humidity));

  return {
    temperature: Number.isFinite(temperature) ? temperature : 25,
    humidity: Number.isFinite(humidity) ? humidity : 45,
    tempGauge: Number.isFinite(tempGauge) ? Math.max(0, Math.min(100, tempGauge)) : 63,
    humidityGauge: Number.isFinite(humidityGauge) ? Math.max(0, Math.min(100, humidityGauge)) : 45,
  };
}

function mapSeatStatus(value, hasUser, powerOn) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "fault") return "fault";
  if (normalized === "occupied") return "occupied";
  if (normalized === "idle" && powerOn && hasUser) return "occupied";
  if (normalized === "idle" && powerOn) return "standby";
  if (normalized === "idle") return "idle";
  if (hasUser && powerOn) return "occupied";
  return powerOn ? "standby" : "idle";
}

function normalizeSeats(list, clockDate, localSeatStartTimes) {
  const now = clockDate || new Date();

  return (Array.isArray(list) ? list : []).map((item) => {
    const seatId = item.seatId ?? item.id;
    const seatCode = item.seatCode || item.seatName || `Seat-${pad(seatId || 0)}`;
    const power = String(item.powerStatus || item.power || "off").toLowerCase() === "on" || item.power === true;
    const user = item.currentUserName || item.userName || item.user || "";
    const startedAt = parseDateTime(item.currentSessionStartedAt || item.startedAt);
    const rememberedStartedAt = seatId && power ? localSeatStartTimes.get(seatId) ?? null : null;
    const effectiveStartedAt = startedAt || rememberedStartedAt;
    const durationSeconds = effectiveStartedAt
      ? Math.max(0, Math.floor((now.getTime() - effectiveStartedAt.getTime()) / 1000))
      : Number(item.durationSeconds || item.seconds || 0);
    const normalizedStatus = mapSeatStatus(item.seatStatus, Boolean(user), power);

    if (seatId) {
      if (startedAt) {
        localSeatStartTimes.set(seatId, startedAt);
      } else if (!power) {
        localSeatStartTimes.delete(seatId);
      }
    }

    return {
      seatId,
      id: seatCode,
      occupied: normalizedStatus === "occupied",
      power,
      user,
      seconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      tracking: power && (Boolean(effectiveStartedAt) || Number(durationSeconds) > 0),
      currentUserId: item.currentUserId ?? item.userId ?? null,
      seatStatus: normalizedStatus,
      currentSessionStartedAt: effectiveStartedAt,
    };
  });
}

function normalizeLogs(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const type = String(item.logType || item.type || "SYS").toUpperCase();
    const createdAt = parseDateTime(item.createdAt);

    return {
      time: createdAt ? formatTime(createdAt) : item.time || "--:--:--",
      type,
      message: item.message || "",
      colorClass: LOG_COLORS[type] ?? "log-slate",
    };
  });
}

function formatSeatActionError(error) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const normalized = raw.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "座位电源操作失败，请检查后端接口。";
  }

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

export function useDashboard() {
  const serverClock = ref(new Date());
  const currentTime = ref(formatDateTime(serverClock.value));
  const mobileTab = ref("auth");
  const isMobileView = ref(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const auth = reactive(getDefaultAuth());
  const seats = ref([]);
  const environment = reactive(getDefaultEnvironment());
  const logs = ref([]);
  const logEventCount = ref(0);
  const seatActionError = ref("");
  const seatActionNotice = reactive({
    visible: false,
    message: "",
    tone: "processing",
  });
  const refreshTimers = [];
  const pendingSeatIds = reactive(new Set());
  const localSeatStartTimes = new Map();
  let streamSource = null;
  let scheduledRefresh = null;
  let seatActionNoticeTimer = null;

  const activeSeatCount = computed(() => seats.value.filter((seat) => seat.occupied).length);

  const seatLabel = (id) => {
    const match = String(id).match(/(\d+)/);
    return match ? `座位${pad(Number(match[1]))}` : String(id);
  };

  const seatStatusText = (seat) => {
    if (seat.seatStatus === "fault") return "故障";
    if (seat.seatStatus === "occupied") return "使用中";
    if (seat.seatStatus === "standby") return "待机中";
    return "空闲";
  };

  const seatCharge = (seat) => {
    if (!seat.tracking) return 0;
    const billableHours = Math.ceil(Math.max(0, seat.seconds) / 3600);
    return Math.min(20, billableHours * 2);
  };

  const seatChargeText = (seat) => `$${seatCharge(seat)}`;
  const seatChargePercent = (seat) => Math.min(100, Math.round((seatCharge(seat) / 20) * 100));

  const statusToneClass = (state) => {
    if (state === "success") return "status-success";
    if (state === "processing") return "status-processing";
    if (state === "error") return "status-error";
    return "status-idle";
  };

  function updateViewport() {
    isMobileView.value = window.innerWidth < 768;
  }

  function tickClock() {
    serverClock.value = new Date(serverClock.value.getTime() + 1000);
    currentTime.value = formatDateTime(serverClock.value);
    seats.value.forEach((seat) => {
      if (seat.tracking) {
        seat.seconds += 1;
      }
    });
  }

  function applyOverviewData(overview) {
    if (!overview) return;

    const clock = parseDateTime(overview.serverTime);
    if (clock) {
      serverClock.value = clock;
      currentTime.value = formatDateTime(clock);
    }

    Object.assign(auth, normalizeAuth(overview.currentAuth || overview.auth));
    Object.assign(environment, normalizeEnvironment(overview.latestEnvironment || overview.environment));

    const seatList = normalizeSeats(overview.currentSeats || overview.seats, serverClock.value, localSeatStartTimes);
    if (seatList.length) {
      seats.value = seatList;
    }

    const logList = normalizeLogs(overview.recentLogs || overview.logs);
    if (logList.length) {
      logs.value = logList;
      logEventCount.value = Math.max(logEventCount.value, logList.length);
    }
  }

  function applySeatsData(seatList) {
    const normalized = normalizeSeats(seatList, serverClock.value, localSeatStartTimes);
    if (normalized.length) {
      seats.value = normalized;
    }
  }

  function applyEnvironmentData(data) {
    Object.assign(environment, normalizeEnvironment(data));
  }

  function applyLogsData(list) {
    const normalized = normalizeLogs(list);
    if (normalized.length || Array.isArray(list)) {
      logs.value = normalized;
      logEventCount.value = Math.max(logEventCount.value, normalized.length);
    }
  }

  function clearSeatActionNoticeTimer() {
    if (seatActionNoticeTimer) {
      clearTimeout(seatActionNoticeTimer);
      seatActionNoticeTimer = null;
    }
  }

  function showSeatActionNotice(message, tone = "processing", duration = 0) {
    clearSeatActionNoticeTimer();
    seatActionNotice.message = message;
    seatActionNotice.tone = tone;
    seatActionNotice.visible = true;

    if (duration > 0) {
      seatActionNoticeTimer = setTimeout(() => {
        seatActionNotice.visible = false;
        seatActionNoticeTimer = null;
      }, duration);
    }
  }

  function buildSeatActionLabel(seat) {
    return seatLabel(seat?.id ?? seat?.seatId ?? "");
  }

  function applySeatPowerResponse(seatId, updatedSeat) {
    if (!seatId || !updatedSeat) {
      return;
    }

    seats.value = seats.value.map((seat) => {
      if (seat.seatId !== seatId) {
        return seat;
      }

      const power = String(updatedSeat.powerStatus || "").toLowerCase() === "on";
      const currentUserId = updatedSeat.currentUserId ?? null;
      const hasUser = currentUserId !== null;
      const seatStatus = mapSeatStatus(updatedSeat.seatStatus, hasUser, power);
      const startedAt = parseDateTime(updatedSeat.currentSessionStartedAt) || (power ? new Date() : null);

      if (power && startedAt) {
        localSeatStartTimes.set(seatId, startedAt);
      } else {
        localSeatStartTimes.delete(seatId);
      }

      return {
        ...seat,
        power,
        occupied: seatStatus === "occupied",
        seatStatus,
        currentUserId,
        user: hasUser ? seat.user : "",
        seconds: power ? seat.seconds : 0,
        tracking: Boolean(power),
        currentSessionStartedAt: startedAt,
      };
    });
  }

  async function refreshDashboardData() {
    const [overviewResult, seatsResult, environmentResult, logsResult] = await Promise.allSettled([
      getDashboardOverview(),
      getCurrentSeats(),
      getLatestEnvironment(),
      getRecentLogs(20),
    ]);

    if (overviewResult.status === "fulfilled") {
      applyOverviewData(overviewResult.value);
    }

    if (seatsResult.status === "fulfilled") {
      applySeatsData(seatsResult.value);
    }

    if (environmentResult.status === "fulfilled") {
      applyEnvironmentData(environmentResult.value);
    }

    if (logsResult.status === "fulfilled") {
      applyLogsData(logsResult.value);
    }

    if (
      overviewResult.status === "rejected" &&
      seatsResult.status === "rejected" &&
      environmentResult.status === "rejected" &&
      logsResult.status === "rejected"
    ) {
      console.error("Failed to load dashboard data", {
        overview: overviewResult.reason,
        seats: seatsResult.reason,
        environment: environmentResult.reason,
        logs: logsResult.reason,
      });
    }
  }

  function scheduleRefresh() {
    if (scheduledRefresh) {
      clearTimeout(scheduledRefresh);
    }

    scheduledRefresh = setTimeout(() => {
      refreshDashboardData().catch((error) => {
        console.error("Failed to refresh dashboard data after stream event", error);
      });
      scheduledRefresh = null;
    }, 180);
  }

  const isSeatPending = (seat) => Boolean(seat?.seatId) && pendingSeatIds.has(seat.seatId);

  async function toggleSeat(seat) {
    if (!seat?.seatId || pendingSeatIds.has(seat.seatId)) {
      return;
    }

    seatActionError.value = "";
    pendingSeatIds.add(seat.seatId);
    showSeatActionNotice(
      `${seat.power ? "正在关闭" : "正在开启"}${buildSeatActionLabel(seat)}`,
      "processing",
    );

    const payload = {
      source: "manual_control",
      remark: seat.power ? "operator power off" : "operator power on",
      ...(seat.currentUserId ? { userId: seat.currentUserId } : {}),
    };

    try {
      let updatedSeat = null;

      if (seat.power) {
        updatedSeat = await powerOffSeat(seat.seatId, payload);
      } else {
        updatedSeat = await powerOnSeat(seat.seatId, payload);
      }

      applySeatPowerResponse(seat.seatId, updatedSeat);
      showSeatActionNotice(
        `${buildSeatActionLabel(seat)}${seat.power ? "已关闭" : "已开启"}`,
        "success",
        1200,
      );
      await refreshDashboardData();
    } catch (error) {
      console.error("Failed to toggle seat power", error);
      seatActionError.value = formatSeatActionError(error);
      showSeatActionNotice(
        `${seat.power ? "关闭" : "开启"}${buildSeatActionLabel(seat)}失败`,
        "error",
        1800,
      );
    } finally {
      pendingSeatIds.delete(seat.seatId);
    }
  }

  function connectStream() {
    try {
      streamSource = subscribeToDashboardEvents(
        () => {
          scheduleRefresh();
        },
        (error) => {
          console.warn("Dashboard SSE stream error", error);
        },
      );
    } catch (error) {
      console.warn("Failed to connect dashboard SSE stream", error);
    }
  }

  onMounted(() => {
    updateViewport();
    window.addEventListener("resize", updateViewport);

    refreshDashboardData().catch((error) => {
      console.error("Initial dashboard load failed", error);
    });

    refreshTimers.push(setInterval(tickClock, 1000));
    connectStream();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateViewport);
    refreshTimers.forEach((timerId) => clearInterval(timerId));

    if (scheduledRefresh) {
      clearTimeout(scheduledRefresh);
    }

    clearSeatActionNoticeTimer();

    if (streamSource) {
      streamSource.close();
    }
  });

  return {
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
  };
}

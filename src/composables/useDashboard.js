import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import {
  getCurrentSeats,
  getDashboardOverview,
  getLatestEnvironment,
  getRecentLogs,
  powerOffSeat,
  powerOnSeat,
  subscribeToDashboardEvents,
  subscribeToDashboardSocket,
} from "../services/dashboardApi";

const LOG_COLORS = {
  MQTT: "log-cyan",
  SERIAL: "log-amber",
  HTTP: "log-blue",
  AI: "log-green",
  GPIO: "log-fuchsia",
  SESSION: "log-green",
  SYS: "log-slate",
};

const MAX_RECENT_LOGS = 20;

const CAMERA_STATUS_TEXT = {
  ready: "摄像头就绪",
  camera_ready: "摄像头就绪",
  idle: "监控中",
  monitoring: "监控中",
  listening: "监控中",
  rfid_scanned: "RFID 已触发",
  rfid_triggered: "RFID 已触发",
  image_uploaded: "姝ｅ湪涓婁紶鐢婚潰",
  uploading: "姝ｅ湪涓婁紶鐢婚潰",
  uploaded: "姝ｅ湪涓婁紶鐢婚潰",
  processing: "姝ｅ湪璇嗗埆",
  analyzing: "姝ｅ湪璇嗗埆",
  recognized: "璇嗗埆瀹屾垚",
  success: "璇嗗埆瀹屾垚",
  failed: "璇嗗埆澶辫触",
  error: "璇嗗埆澶辫触",
};

const STATUS_TEXT_MAP = {
  "Auth granted. Starting seat linkage.": "认证通过，正在联动座位设备",
  "Auth granted": "璁よ瘉閫氳繃",
  "Auth denied": "璁よ瘉澶辫触锛岃閲嶈瘯",
  "Auth processing": "姝ｅ湪杩涜韬唤姣斿",
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

  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, s = 0] = value;
    const next = new Date(y, m - 1, d, h, min, s);
    return Number.isNaN(next.getTime()) ? null : next;
  }

  if (typeof value === "number") {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }

  if (typeof value === "string") {
    const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
    const next = new Date(normalized);
    return Number.isNaN(next.getTime()) ? null : next;
  }

  return null;
}

function translateCameraStatus(value) {
  if (!value) return "监控中";
  return CAMERA_STATUS_TEXT[String(value).trim().toLowerCase()] || String(value);
}

function translateStatusText(value, fallback) {
  if (!value) return fallback;
  return STATUS_TEXT_MAP[value] || value;
}

function getDefaultAuth() {
  return {
    cameraStatus: "监控中",
    flowState: "idle",
    statusText: "会话已建立，等待下一次认证请求",
    rfidUid: "",
    similarity: 0,
    result: "standby",
    resultLabel: "系统待命中",
  };
}

function getDefaultEnvironment() {
  return {
    temperature: 25,
    humidity: 45,
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

  let resultLabel = "系统待命中";
  if (result === "granted") {
    resultLabel = userName ? `${userName} 韬唤纭鎴愬姛` : "璁よ瘉閫氳繃";
  } else if (result === "denied") {
    resultLabel = userName ? `${userName} 韬唤璁よ瘉澶辫触` : "璁よ瘉鏈€氳繃";
  }

  return {
    cameraStatus: translateCameraStatus(authSource.cameraStatus),
    flowState: authSource.flowState || "idle",
    statusText: translateStatusText(authSource.statusText, "会话已建立，等待下一次认证请求"),
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

function mapSeatStatus(value, powerOn) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "fault") return "fault";
  return powerOn ? "occupied" : "idle";
}

function resolveSeatDuration(now, startedAt, fallbackSeconds = 0) {
  if (startedAt) {
    return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  }

  const parsedFallback = Number(fallbackSeconds);
  return Number.isFinite(parsedFallback) ? Math.max(0, parsedFallback) : 0;
}

function resolveSeatStartedAt(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  return parseDateTime(
    source.powerOnAt ??
      source.currentPowerStartedAt ??
      source.powerStartedAt ??
      source.currentSessionStartedAt ??
      source.startedAt,
  );
}

function chooseSeatStartedAt(remoteStartedAt, localStartedAt) {
  if (remoteStartedAt && localStartedAt) {
    return localStartedAt.getTime() >= remoteStartedAt.getTime() ? localStartedAt : remoteStartedAt;
  }

  return localStartedAt || remoteStartedAt || null;
}

function normalizeSeatCodeLabel(value) {
  const match = String(value ?? "").match(/(\d+)/);
  if (!match) return String(value || "Seat");
  return `Seat-${pad(Number(match[1]))}`;
}

function normalizeLogMessage(type, message) {
  const raw = String(message ?? "").trim();
  const upperType = String(type || "").toUpperCase();

  if (!raw) {
    return "";
  }

  const seatCode = normalizeSeatCodeLabel(raw);
  const lower = raw.toLowerCase();

  if (lower === "environment reading received") return "环境数据已接收";
  if (lower.includes("power on")) return `${seatCode}开启`;
  if (lower.includes("power off")) return `${seatCode}关闭`;
  if (lower.includes("session started")) return `${seatCode}开始使用`;
  if (lower.includes("session finished")) return `${seatCode}结束使用`;
  if (lower.includes("synced to occupied")) return `${seatCode}同步开启`;
  if (lower.includes("synced to idle")) return `${seatCode}同步关闭`;
  if (upperType === "GPIO" && /开启|打开|上电/.test(raw)) return `${seatCode}开启`;
  if (upperType === "GPIO" && /关闭|断电|关机/.test(raw)) return `${seatCode}关闭`;

  return raw;
}

function normalizeSeats(list, clockDate, localSeatStartTimes) {
  const now = clockDate || new Date();

  return (Array.isArray(list) ? list : []).map((item) => {
    const seatId = item.seatId ?? item.id;
    const seatCode = item.seatCode || item.seatName || `Seat-${pad(seatId || 0)}`;
    const power = String(item.powerStatus || item.power || "off").toLowerCase() === "on" || item.power === true;
    const remoteStartedAt = power ? resolveSeatStartedAt(item) : null;
    const localStartedAt = seatId ? localSeatStartTimes.get(seatId) ?? null : null;
    const startedAt = power ? chooseSeatStartedAt(remoteStartedAt, localStartedAt) : null;
    const durationSeconds = power ? resolveSeatDuration(now, startedAt, item.durationSeconds ?? item.seconds) : 0;
    const normalizedStatus = mapSeatStatus(item.seatStatus, power);
    const user = power ? (item.currentUserName || item.userName || item.user || "临时使用者") : "";

    if (seatId) {
      if (power && startedAt) {
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
      tracking: power && Boolean(startedAt),
      currentUserId: power ? (item.currentUserId ?? item.userId ?? 0) : null,
      seatStatus: normalizedStatus,
      currentSessionStartedAt: power ? startedAt : null,
      hourlyRate: Number(item.hourlyRate ?? 2),
    };
  });
}

function normalizeLogs(list) {
  return (Array.isArray(list) ? list : [])
    .map((item, index) => {
      const type = String(item.logType || item.type || "SYS").toUpperCase();
      const createdAt = parseDateTime(item.createdAt);

      return {
        time: createdAt ? formatTime(createdAt) : item.time || "--:--:--",
        type,
        message: normalizeLogMessage(type, item.message || ""),
        colorClass: LOG_COLORS[type] ?? "log-slate",
        _sortTime: createdAt ? createdAt.getTime() : null,
        _sortIndex: index,
      };
    })
    .sort((left, right) => {
      if (left._sortTime !== null && right._sortTime !== null) {
        return left._sortTime - right._sortTime || left._sortIndex - right._sortIndex;
      }
      if (left._sortTime !== null) return -1;
      if (right._sortTime !== null) return 1;
      return left._sortIndex - right._sortIndex;
    })
    .map(({ _sortTime, _sortIndex, ...entry }) => entry);
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

function resolveRealtimeEventName(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  return String(
    message.eventType ??
      message.eventName ??
      message.event ??
      message.type ??
      message.topic ??
      message.name ??
      "",
  ).trim();
}

function resolveRealtimePayload(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const payload = message.payload ?? message.data ?? message.body ?? message;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }
  return payload;
}

export function useDashboard() {
  const browserClock = ref(new Date());
  const currentTime = ref(formatDateTime(browserClock.value));
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
  let socketSource = null;
  let streamSource = null;
  let scheduledRefresh = null;
  let seatActionNoticeTimer = null;
  let socketReconnectTimer = null;
  let socketFallbackEnabled = false;
  let socketHasOpened = false;

  const activeSeatCount = computed(() => seats.value.filter((seat) => seat.power).length);

  const seatLabel = (id) => {
    const match = String(id).match(/(\d+)/);
    return match ? `搴т綅${pad(Number(match[1]))}` : String(id);
  };

  const seatStatusText = (seat) => {
    if (seat.seatStatus === "fault") return "鏁呴殰";
    return seat.power ? "使用中" : "空闲";
  };

  const seatCharge = (seat) => {
    if (!seat.power || !seat.tracking) return 0;
    const hourlyRate = Number(seat.hourlyRate ?? 2);
    const billableHours = Math.max(1, Math.ceil(Math.max(0, seat.seconds) / 3600));
    return Number((billableHours * hourlyRate).toFixed(2));
  };

  const seatChargeText = (seat) => `$${seatCharge(seat).toFixed(0)}`;
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
    const nextClock = new Date();
    browserClock.value = nextClock;
    currentTime.value = formatDateTime(nextClock);
    seats.value.forEach((seat) => {
      if (seat.power && seat.currentSessionStartedAt) {
        seat.seconds = resolveSeatDuration(nextClock, seat.currentSessionStartedAt);
      } else {
        seat.seconds = 0;
      }
    });
  }

  function applyOverviewData(overview) {
    if (!overview) return;

    Object.assign(auth, normalizeAuth(overview.currentAuth || overview.auth));
    Object.assign(environment, normalizeEnvironment(overview.latestEnvironment || overview.environment));

    const seatList = normalizeSeats(overview.currentSeats || overview.seats, new Date(), localSeatStartTimes);
    if (seatList.length) {
      seats.value = seatList;
    }

    const logList = normalizeLogs(overview.recentLogs || overview.logs);
    if (logList.length || Array.isArray(overview.recentLogs || overview.logs)) {
      logs.value = logList;
      logEventCount.value = Math.max(logEventCount.value, logList.length);
    }
  }

  function applySeatsData(seatList) {
    const normalized = normalizeSeats(seatList, new Date(), localSeatStartTimes);
    if (normalized.length || Array.isArray(seatList)) {
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

  function appendLocalLog(type, message, createdAt = new Date()) {
    const [entry] = normalizeLogs([
      {
        type,
        message,
        createdAt,
      },
    ]);

    if (!entry) {
      return;
    }

    const alreadyExists = logs.value.some(
      (log) => log.type === entry.type && log.message === entry.message && log.time === entry.time,
    );

    if (!alreadyExists) {
      logs.value = [...logs.value, entry].slice(-MAX_RECENT_LOGS);
    }

    logEventCount.value += 1;
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

    const isPowerOn = String(updatedSeat.powerStatus || "").toLowerCase() === "on";
    if (isPowerOn) {
      localSeatStartTimes.set(seatId, new Date());
    }
    if (!isPowerOn) {
      localSeatStartTimes.delete(seatId);
    }

    const normalizedSeat = normalizeSeats([updatedSeat], new Date(), localSeatStartTimes)[0];
    if (!normalizedSeat) {
      return;
    }

    seats.value = seats.value.map((seat) => (seat.seatId === seatId ? normalizedSeat : seat));
  }

  function applySingleSeatData(seatLike) {
    const incomingSeatId = seatLike?.seatId ?? seatLike?.id;
    const existingSeat = seats.value.find((seat) => seat.seatId === incomingSeatId);
    const incomingPowerOn = String(seatLike?.powerStatus || "").toLowerCase() === "on" || seatLike?.power === true;

    if (incomingSeatId) {
      if (incomingPowerOn && !existingSeat?.power) {
        localSeatStartTimes.set(incomingSeatId, new Date());
      } else if (!incomingPowerOn) {
        localSeatStartTimes.delete(incomingSeatId);
      }
    }

    const normalized = normalizeSeats([seatLike], new Date(), localSeatStartTimes)[0];
    if (!normalized) {
      return;
    }

    const existingIndex = seats.value.findIndex((seat) => seat.seatId === normalized.seatId);
    if (existingIndex === -1) {
      seats.value = [...seats.value, normalized].sort((left, right) => Number(left.seatId ?? 0) - Number(right.seatId ?? 0));
      return;
    }

    seats.value = seats.value.map((seat, index) => (index === existingIndex ? normalized : seat));
  }

  function applyRealtimeLogEntry(entry) {
    const normalized = normalizeLogs([entry]);
    if (!normalized.length) {
      return;
    }

    const [nextLog] = normalized;
    const alreadyExists = logs.value.some(
      (log) => log.type === nextLog.type && log.message === nextLog.message && log.time === nextLog.time,
    );

    if (!alreadyExists) {
      logs.value = [...logs.value, nextLog].slice(-MAX_RECENT_LOGS);
      logEventCount.value += 1;
    }
  }

  function handleRealtimeUpdate(eventName, payload) {
    const name = String(eventName || "").trim();
    const data = payload ?? null;

    if (!name) {
      if (data?.currentSeats || data?.seats) {
        applySeatsData(data.currentSeats || data.seats);
        return;
      }
      if (data?.latestEnvironment || data?.environment) {
        applyEnvironmentData(data.latestEnvironment || data.environment);
        return;
      }
      if (data?.currentAuth || data?.auth) {
        Object.assign(auth, normalizeAuth(data.currentAuth || data.auth));
        return;
      }
    }

    if (name === "environment-updated") {
      applyEnvironmentData(data?.latestEnvironment || data?.environment || data);
      if (data?.log || data?.logEntry) {
        applyRealtimeLogEntry(data.log || data.logEntry);
      }
      return;
    }

    if (
      name === "seat-powered-on" ||
      name === "seat-powered-off" ||
      name === "seat-session-started" ||
      name === "seat-session-finished" ||
      name === "seat-status-updated" ||
      name === "seat-updated"
    ) {
      const seatPayload = data?.seat || data?.currentSeat || data?.seatState || data;
      if (seatPayload) {
        applySingleSeatData(seatPayload);
      } else if (Array.isArray(data?.seats) || Array.isArray(data?.currentSeats)) {
        applySeatsData(data.seats || data.currentSeats);
      }

      if (data?.log || data?.logEntry) {
        applyRealtimeLogEntry(data.log || data.logEntry);
      }
      return;
    }

    if (name === "auth-event-updated") {
      Object.assign(auth, normalizeAuth(data?.currentAuth || data?.auth || data));
      if (data?.seat || data?.currentSeat) {
        applySingleSeatData(data.seat || data.currentSeat);
      }
      if (data?.log || data?.logEntry) {
        applyRealtimeLogEntry(data.log || data.logEntry);
      }
      return;
    }

    if (name === "system-log-created" || name === "log-created") {
      applyRealtimeLogEntry(data?.log || data?.logEntry || data);
      return;
    }

    scheduleRefresh();
  }

  async function refreshDashboardData() {
    const [overviewResult, seatsResult, environmentResult, logsResult] = await Promise.allSettled([
      getDashboardOverview(),
      getCurrentSeats(),
      getLatestEnvironment(),
      getRecentLogs(20),
    ]);

    if (overviewResult.status === "fulfilled") applyOverviewData(overviewResult.value);
    if (seatsResult.status === "fulfilled") applySeatsData(seatsResult.value);
    if (environmentResult.status === "fulfilled") applyEnvironmentData(environmentResult.value);
    if (logsResult.status === "fulfilled") applyLogsData(logsResult.value);

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

  function clearSocketReconnectTimer() {
    if (socketReconnectTimer) {
      clearTimeout(socketReconnectTimer);
      socketReconnectTimer = null;
    }
  }

  function enableSseFallback() {
    if (socketFallbackEnabled || streamSource) {
      return;
    }

    socketFallbackEnabled = true;
    try {
      streamSource = subscribeToDashboardEvents(
        (eventName, payload) => handleRealtimeUpdate(eventName, payload),
        (error) => {
          console.warn("Dashboard SSE stream error", error);
          scheduleRefresh();
        },
      );
    } catch (error) {
      console.warn("Failed to connect dashboard SSE stream", error);
    }
  }

  function scheduleSocketReconnect() {
    if (socketFallbackEnabled || socketReconnectTimer) {
      return;
    }

    socketReconnectTimer = setTimeout(() => {
      socketReconnectTimer = null;
      connectStream();
    }, 1500);
  }

  const isSeatPending = (seat) => Boolean(seat?.seatId) && pendingSeatIds.has(seat.seatId);

  async function toggleSeat(seat) {
    if (!seat?.seatId || pendingSeatIds.has(seat.seatId)) {
      return;
    }

    seatActionError.value = "";
    pendingSeatIds.add(seat.seatId);
    showSeatActionNotice(`${seat.power ? "正在关闭" : "正在开启"}${buildSeatActionLabel(seat)}`, "processing");

    const payload = {
      source: "manual_control",
      remark: seat.power ? "operator power off" : "operator power on",
      ...(seat.currentUserId ? { userId: seat.currentUserId } : {}),
    };

    try {
      const updatedSeat = seat.power
        ? await powerOffSeat(seat.seatId, payload)
        : await powerOnSeat(seat.seatId, payload);

      applySeatPowerResponse(seat.seatId, updatedSeat);
      showSeatActionNotice(`${buildSeatActionLabel(seat)}${seat.power ? "已关闭" : "已开启"}`, "success", 1200);
      await refreshDashboardData().catch((error) => {
        console.warn("Failed to refresh dashboard data after seat toggle", error);
      });
    } catch (error) {
      console.error("Failed to toggle seat power", error);
      seatActionError.value = formatSeatActionError(error);
      showSeatActionNotice(`${seat.power ? "关闭" : "开启"}${buildSeatActionLabel(seat)}失败`, "error", 1800);
    } finally {
      pendingSeatIds.delete(seat.seatId);
    }
  }

  function connectStream() {
    try {
      clearSocketReconnectTimer();
      socketHasOpened = false;
      socketSource = subscribeToDashboardSocket(
        (message) => {
          socketHasOpened = true;
          handleRealtimeUpdate(resolveRealtimeEventName(message), resolveRealtimePayload(message));
        },
        (error) => {
          console.warn("Dashboard WebSocket error", error);
          if (!socketHasOpened) {
            enableSseFallback();
            return;
          }
          scheduleSocketReconnect();
        },
        () => {
          socketHasOpened = true;
          socketFallbackEnabled = false;
          if (streamSource) {
            streamSource.close();
            streamSource = null;
          }
        },
      );
    } catch (error) {
      console.warn("Failed to connect dashboard WebSocket", error);
      enableSseFallback();
    }
  }

  onMounted(() => {
    updateViewport();
    browserClock.value = new Date();
    currentTime.value = formatDateTime(browserClock.value);
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

    if (scheduledRefresh) clearTimeout(scheduledRefresh);
    clearSocketReconnectTimer();
    clearSeatActionNoticeTimer();

    if (socketSource) {
      const socket = socketSource;
      socketSource = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }

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

import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const INITIAL_LOGS = [
  { time: "10:02:15", type: "MQTT", message: "环境数据更新：温度 25.4°C / 湿度 45.0%" },
  { time: "10:05:30", type: "Serial", message: "RFID 卡片 4A B2 19 CF 刷入" },
  { time: "10:05:32", type: "HTTP", message: "收到边缘摄像头实时画面" },
  { time: "10:05:33", type: "AI", message: "人脸匹配成功，相似度 96.2%" },
  { time: "10:05:33", type: "GPIO", message: "Seat-04 继电器闭合，台灯已开启" },
];

const LOG_COLORS = {
  MQTT: "log-cyan",
  Serial: "log-amber",
  HTTP: "log-blue",
  AI: "log-green",
  GPIO: "log-fuchsia",
  SYS: "log-slate",
};

const MOCK_USERS = [
  { name: "陈以安", uid: "4A B2 19 CF", similarity: 98.5, seatId: "Seat-02" },
  { name: "林书昊", uid: "9C 11 D7 A4", similarity: 96.2, seatId: "Seat-04" },
  { name: "周芷若", uid: "E1 7F 33 B8", similarity: 94.8, seatId: "Seat-06" },
];

function createInitialSeats() {
  return [
    { id: "Seat-01", occupied: true, user: "张晨曦", seconds: 5052, power: true },
    { id: "Seat-02", occupied: true, user: "陈以安", seconds: 20, power: true },
    { id: "Seat-03", occupied: true, user: "李思远", seconds: 2919, power: true },
    { id: "Seat-04", occupied: true, user: "林书昊", seconds: 7, power: true },
    { id: "Seat-05", occupied: true, user: "王雨桐", seconds: 7738, power: true },
    { id: "Seat-06", occupied: false, user: "", seconds: 0, power: false },
  ];
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDuration(totalSeconds) {
  const hours = pad(Math.floor(totalSeconds / 3600));
  const minutes = pad(Math.floor((totalSeconds % 3600) / 60));
  const seconds = pad(totalSeconds % 60);
  return `${hours}:${minutes}:${seconds}`;
}

function formatNow() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function nowTimeOnly() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function useDashboard() {
  const currentTime = ref(formatNow());
  const mobileTab = ref("auth");
  const isMobileView = ref(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const logEventCount = ref(INITIAL_LOGS.length);
  const flowIndex = ref(0);
  const timeouts = [];
  const intervals = [];

  const auth = reactive({
    cameraStatus: "监控中",
    flowState: "idle",
    statusText: "会话已建立，等待下一次认证请求…",
    rfidUid: "",
    similarity: 0,
    result: "standby",
    resultLabel: "系统待机中",
  });

  const seats = reactive(createInitialSeats());
  const environment = reactive({
    temperature: 25.4,
    humidity: 45.0,
    tempGauge: 63,
    humidityGauge: 45,
  });
  const logs = ref(
    INITIAL_LOGS.map((item) => ({
      ...item,
      colorClass: LOG_COLORS[item.type] ?? "log-slate",
    })),
  );

  const activeSeatCount = computed(() => seats.filter((seat) => seat.occupied).length);

  const seatLabel = (id) => {
    const match = String(id).match(/(\d+)/);
    return match ? `座位${pad(Number(match[1]))}` : String(id);
  };

  const seatStatusText = (seat) => {
    if (!seat.power) return "空闲";
    return seat.occupied ? "使用中" : "待机中";
  };

  const seatCharge = (seat) => {
    if (!seat.occupied) return 0;
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

  const pushLog = (type, message) => {
    logEventCount.value += 1;
    logs.value.push({
      time: nowTimeOnly(),
      type,
      message,
      colorClass: LOG_COLORS[type] ?? "log-slate",
    });
    if (logs.value.length > 18) {
      logs.value.shift();
    }
  };

  const updateClock = () => {
    currentTime.value = formatNow();
  };

  const updateViewport = () => {
    isMobileView.value = window.innerWidth < 768;
  };

  const updateEnvironment = () => {
    const temperature = Number((24.8 + Math.random() * 1.6).toFixed(1));
    const humidity = Number((43 + Math.random() * 8).toFixed(1));
    environment.temperature = temperature;
    environment.humidity = humidity;
    environment.tempGauge = Math.min(100, Math.max(0, Math.round((temperature / 40) * 100)));
    environment.humidityGauge = Math.min(100, Math.max(0, Math.round(humidity)));
    pushLog("MQTT", `环境数据更新：温度 ${temperature}°C / 湿度 ${humidity}%`);
  };

  const toggleSeat = (seat) => {
    seat.power = !seat.power;

    if (!seat.power) {
      seat.occupied = false;
      seat.user = "";
      seat.seconds = 0;
      pushLog("GPIO", `${seat.id} 继电器手动断开`);
      return;
    }

    if (!seat.occupied) {
      seat.occupied = true;
      seat.user = "临时访客";
      seat.seconds = Math.floor(Math.random() * 180);
      pushLog("GPIO", `${seat.id} 继电器手动闭合`);
    }
  };

  const tickSeatDurations = () => {
    seats.forEach((seat) => {
      if (seat.occupied) {
        seat.seconds += 1;
      }
    });
  };

  const trackTimeout = (timerId) => {
    timeouts.push(timerId);
  };

  const trackInterval = (timerId) => {
    intervals.push(timerId);
  };

  const startAuthLoop = () => {
    const cycle = () => {
      const selected = MOCK_USERS[flowIndex.value % MOCK_USERS.length];
      flowIndex.value += 1;

      auth.flowState = "idle";
      auth.statusText = "会话已建立，等待下一次认证请求…";
      auth.rfidUid = "";
      auth.similarity = 0;
      auth.result = "standby";
      auth.resultLabel = "系统待机中";
      auth.cameraStatus = "摄像头就绪";

      trackTimeout(
        setTimeout(() => {
          auth.flowState = "processing";
          auth.statusText = "RFID 已读取，正在抓拍人脸…";
          auth.rfidUid = selected.uid;
          auth.cameraStatus = "RFID 已触发";
          pushLog("Serial", `RFID 卡片 ${selected.uid} 刷入`);
        }, 1800),
      );

      trackTimeout(
        setTimeout(() => {
          auth.flowState = "processing";
          auth.statusText = "边缘节点正在上传画面…";
          auth.cameraStatus = "正在上传画面";
          auth.similarity = 38.4;
          pushLog("HTTP", "收到边缘摄像头实时画面");
        }, 3600),
      );

      trackTimeout(
        setTimeout(() => {
          auth.flowState = "processing";
          auth.statusText = "AI 正在进行身份比对…";
          auth.cameraStatus = "正在识别";
          auth.similarity = 77.3;
          pushLog("AI", "模型开始执行人脸特征匹配");
        }, 5200),
      );

      trackTimeout(
        setTimeout(() => {
          auth.flowState = "success";
          auth.statusText = "验证通过，正在联动继电器与座位设备…";
          auth.cameraStatus = "识别完成";
          auth.similarity = selected.similarity;
          auth.result = "granted";
          auth.resultLabel = `${selected.name} 身份确认成功`;
          pushLog("AI", `人脸匹配成功，相似度 ${selected.similarity}%`);

          const seat = seats.find((item) => item.id === selected.seatId);
          if (seat) {
            seat.occupied = true;
            seat.user = selected.name;
            seat.power = true;
            seat.seconds = 0;
            pushLog("GPIO", `${seat.id} 继电器闭合，台灯已开启`);
          }
        }, 7000),
      );

      trackTimeout(
        setTimeout(() => {
          auth.flowState = "idle";
          auth.statusText = "会话已建立，等待下一次认证请求…";
          auth.cameraStatus = "监控中";
          auth.result = "standby";
          pushLog("SYS", "认证链路执行完成，系统恢复监听状态");
        }, 9800),
      );

      trackTimeout(setTimeout(cycle, 13500));
    };

    cycle();
  };

  onMounted(() => {
    updateViewport();
    updateClock();
    window.addEventListener("resize", updateViewport);
    trackInterval(setInterval(updateClock, 1000));
    trackInterval(setInterval(tickSeatDurations, 1000));
    trackInterval(setInterval(updateEnvironment, 3200));
    startAuthLoop();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateViewport);
    timeouts.forEach((timerId) => clearTimeout(timerId));
    intervals.forEach((timerId) => clearInterval(timerId));
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
    toggleSeat,
    formatDuration,
  };
}

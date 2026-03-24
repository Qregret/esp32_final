const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const EVENT_NAMES = [
  "auth-event-updated",
  "seat-powered-on",
  "seat-powered-off",
  "seat-session-started",
  "seat-session-finished",
  "environment-updated",
];

function buildUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}${text ? `: ${text}` : ""}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getDashboardOverview() {
  return request("/api/dashboard/overview");
}

export function getCurrentSeats() {
  return request("/api/seats/current");
}

export function getLatestEnvironment() {
  return request("/api/environment/latest");
}

export function getRecentLogs(limit = 20) {
  return request(`/api/system-logs/recent?limit=${encodeURIComponent(limit)}`);
}

export function powerOnSeat(seatId, body = {}) {
  return request(`/api/seats/${seatId}/power-on`, {
    method: "POST",
    body,
  });
}

export function powerOffSeat(seatId, body = {}) {
  return request(`/api/seats/${seatId}/power-off`, {
    method: "POST",
    body,
  });
}

export function subscribeToDashboardEvents(onUpdate, onError) {
  const source = new EventSource(buildUrl("/api/stream/events"));

  EVENT_NAMES.forEach((eventName) => {
    source.addEventListener(eventName, (event) => {
      let payload = null;

      try {
        payload = event.data ? JSON.parse(event.data) : null;
      } catch {
        payload = event.data ?? null;
      }

      onUpdate?.(eventName, payload);
    });
  });

  source.onerror = (error) => {
    onError?.(error);
  };

  return source;
}

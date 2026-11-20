const REFRESH_LOCK = "auth:refresh"

let inFlight: Promise<boolean> | null = null

async function requestRefresh() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
  })
  return response.ok
}

function withCrossTabLock(task: () => Promise<boolean>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, task)
  }
  return task()
}

export function refreshSession(): Promise<boolean> {
  inFlight ??= withCrossTabLock(requestRefresh)
    .catch(() => false)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

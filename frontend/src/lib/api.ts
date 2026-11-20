import { refreshSession } from "./session-refresh"

const NO_REFRESH_PATHS = new Set([
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/refresh",
  "/auth/options",
])

export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]
  readonly sessionExpired: boolean

  constructor(status: number, messages: string[], sessionExpired = false) {
    super(messages[0] ?? "Something went wrong")
    this.status = status
    this.messages = messages
    this.sessionExpired = sessionExpired
  }

  fieldErrors() {
    const errors: Record<string, string> = {}
    for (const message of this.messages) {
      const match = /^(\w+): (.+)$/.exec(message)
      if (match && !errors[match[1]]) errors[match[1]] = match[2]
    }
    return errors
  }
}

const send = (path: string, init: RequestInit) =>
  fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)
  let sessionExpired = false

  if (response.status === 401 && !NO_REFRESH_PATHS.has(path)) {
    if (await refreshSession()) response = await send(path, init)
    sessionExpired = response.status === 401
  }

  if (response.status === 204) return undefined as T

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body?.message ?? response.statusText
    throw new ApiError(
      response.status,
      Array.isArray(message) ? message : [message],
      sessionExpired
    )
  }
  return body as T
}

export const json = (data: unknown) => JSON.stringify(data)

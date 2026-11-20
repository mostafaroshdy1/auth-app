import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "./api"

const respond = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("api", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal("fetch", fetchMock))
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  const calls = () => fetchMock.mock.calls.map(([url]) => String(url))

  it("refreshes once on 401 and retries the request", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(respond(204))
      .mockResolvedValueOnce(respond(200, { ok: true }))

    await expect(api("/sessions")).resolves.toEqual({ ok: true })
    expect(calls()).toEqual([
      "/api/sessions",
      "/api/auth/refresh",
      "/api/sessions",
    ])
  })

  it("marks the error as session expired when the refresh fails", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(respond(401, { message: "Invalid refresh token" }))

    const error = await api("/sessions").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, sessionExpired: true })
  })

  it("shares one refresh between concurrent 401s", async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url) === "/api/auth/refresh") return respond(204)
      const retried =
        fetchMock.mock.calls.filter(([u]) => String(u) === "/api/auth/refresh")
          .length > 0
      return retried ? respond(200, {}) : respond(401, {})
    })

    await Promise.all([api("/sessions"), api("/auth/me")])
    expect(calls().filter((url) => url === "/api/auth/refresh")).toHaveLength(1)
  })

  it("never refreshes for sign-in failures", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(401, { message: "Invalid email or password" })
    )

    const error = await api("/auth/sign-in", {
      method: "POST",
      body: "{}",
    }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 401, sessionExpired: false })
    expect(calls()).toEqual(["/api/auth/sign-in"])
  })
})

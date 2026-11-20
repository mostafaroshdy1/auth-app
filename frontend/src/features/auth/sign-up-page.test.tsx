import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/components/theme-provider"
import { SignUpPage } from "./sign-up-page"

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/sign-up", Component: SignUpPage },
      { path: "/", element: <p>Home</p> },
    ],
    { initialEntries: ["/sign-up"] }
  )
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

describe("SignUpPage", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/auth/options"
        ? jsonResponse(200, { adminSignup: true })
        : jsonResponse(500, {})
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("shows validation errors without calling the API", async () => {
    renderPage()
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" })
    )

    expect(
      await screen.findByText("Name must be at least 3 characters")
    ).toBeInTheDocument()
    expect(screen.getByText("Email is required")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/auth/sign-up",
      expect.anything()
    )
  })

  it("maps server field errors onto the form", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/auth/options")
        return jsonResponse(200, { adminSignup: false })
      return jsonResponse(409, {
        message: ["email: An account with this email already exists"],
      })
    })
    renderPage()

    await userEvent.type(screen.getByLabelText("Name"), "Ada Lovelace")
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd!")
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" })
    )

    expect(
      await screen.findByText("An account with this email already exists")
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Admin account")).not.toBeInTheDocument()
  })
})

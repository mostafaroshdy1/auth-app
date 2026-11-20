import type { QueryClient } from "@tanstack/react-query"
import { createBrowserRouter, redirect } from "react-router"
import { AppShell } from "@/components/app-shell"
import { ErrorPage } from "@/components/error-page"
import { usersQuery } from "@/features/admin/api"
import { hasPermission, meQuery } from "@/features/auth/api"
import { HomePage } from "@/pages/home-page"

export function createRouter(queryClient: QueryClient) {
  const requireUser = async (request: Request) => {
    const user = await queryClient.fetchQuery(meQuery)
    if (!user) {
      const { pathname } = new URL(request.url)
      throw redirect(
        pathname === "/"
          ? "/sign-in"
          : `/sign-in?redirect=${encodeURIComponent(pathname)}`
      )
    }
    return user
  }

  const requireGuest = async () => {
    if (await queryClient.fetchQuery(meQuery)) throw redirect("/")
    return null
  }

  return createBrowserRouter([
    {
      path: "/sign-in",
      loader: requireGuest,
      lazy: async () => ({
        Component: (await import("@/features/auth/sign-in-page")).SignInPage,
      }),
    },
    {
      path: "/sign-up",
      loader: requireGuest,
      lazy: async () => ({
        Component: (await import("@/features/auth/sign-up-page")).SignUpPage,
      }),
    },
    {
      path: "/",
      loader: ({ request }) => requireUser(request),
      Component: AppShell,
      ErrorBoundary: ErrorPage,
      children: [
        { index: true, Component: HomePage },
        {
          path: "admin",
          loader: async ({ request }) => {
            const user = await requireUser(request)
            if (!hasPermission(user, "users:read")) throw redirect("/")
            return queryClient.ensureQueryData(usersQuery)
          },
          lazy: async () => ({
            Component: (await import("@/features/admin/admin-page")).AdminPage,
          }),
        },
      ],
    },
    { path: "*", loader: () => redirect("/") },
  ])
}

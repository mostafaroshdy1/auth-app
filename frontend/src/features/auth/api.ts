import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { api, ApiError, json } from "@/lib/api"
import type { SignInValues, SignUpValues } from "./schemas"

export type Permission = "users:read" | "users:manage"

export interface User {
  id: string
  email: string
  name: string
  permissions: Permission[]
  createdAt: string
}

export const meQuery = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: async () => {
    try {
      return await api<User>("/auth/me")
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  staleTime: 60_000,
})

function useSessionMutation<T>(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: T) =>
      api<User>(path, { method: "POST", body: json(values) }),
    onSuccess: (user) => {
      queryClient.clear()
      queryClient.setQueryData(meQuery.queryKey, user)
    },
  })
}

export const useSignIn = () => useSessionMutation<SignInValues>("/auth/sign-in")
export const useSignUp = () => useSessionMutation<SignUpValues>("/auth/sign-up")

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>("/auth/sign-out", { method: "POST" }),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(meQuery.queryKey, null)
    },
  })
}

export const hasPermission = (
  user: User | null | undefined,
  permission: Permission
) => user?.permissions.includes(permission) ?? false

export const authOptionsQuery = queryOptions({
  queryKey: ["auth", "options"],
  queryFn: () => api<{ adminSignup: boolean }>("/auth/options"),
  staleTime: Infinity,
})

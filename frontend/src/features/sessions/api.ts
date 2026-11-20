import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface Session {
  id: string
  ip?: string
  userAgent?: string
  createdAt: string
  expiresAt: string
  current: boolean
}

export const sessionsQuery = queryOptions({
  queryKey: ["sessions"],
  queryFn: () => api<Session[]>("/sessions"),
})

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries(sessionsQuery),
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<{ revoked: number }>("/sessions", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries(sessionsQuery),
  })
}

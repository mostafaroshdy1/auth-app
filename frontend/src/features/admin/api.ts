import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { api, json } from "@/lib/api"
import type { Permission, User } from "@/features/auth/api"

export const ADMIN_PERMISSIONS: Permission[] = ["users:read", "users:manage"]

export const usersQuery = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: () => api<User[]>("/admin/users"),
})

export function useUpdatePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string
      permissions: Permission[]
    }) =>
      api<User>(`/admin/users/${encodeURIComponent(id)}/permissions`, {
        method: "PATCH",
        body: json({ permissions }),
      }),
    onSuccess: () => queryClient.invalidateQueries(usersQuery),
  })
}

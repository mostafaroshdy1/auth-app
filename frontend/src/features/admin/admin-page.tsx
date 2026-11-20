import { useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { hasPermission, meQuery } from "@/features/auth/api"
import { formatDate } from "@/lib/format"
import { ADMIN_PERMISSIONS, usersQuery, useUpdatePermissions } from "./api"

export function AdminPage() {
  const { data: me } = useSuspenseQuery(meQuery)
  const { data: users } = useSuspenseQuery(usersQuery)
  const update = useUpdatePermissions()
  const canManage = hasPermission(me, "users:manage")

  const toggleAdmin = (id: string, admin: boolean) =>
    update.mutate(
      { id, permissions: admin ? ADMIN_PERMISSIONS : [] },
      {
        onSuccess: (user) =>
          toast.success(
            `${user.name} is ${admin ? "now" : "no longer"} an admin`
          ),
        onError: (error) => toast.error(error.message),
      }
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Only accounts with the <code>users:read</code> permission can see this
          page. Changes apply to active sessions immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isAdmin = ADMIN_PERMISSIONS.every((permission) =>
                user.permissions.includes(permission)
              )
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.length === 0 && (
                        <span className="text-muted-foreground">None</span>
                      )}
                      {user.permissions.map((permission) => (
                        <Badge key={permission} variant="outline">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      aria-label={`Admin access for ${user.name}`}
                      checked={isAdmin}
                      disabled={
                        !canManage || user.id === me?.id || update.isPending
                      }
                      onCheckedChange={(checked) =>
                        toggleAdmin(user.id, checked)
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

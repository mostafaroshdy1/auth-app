import { useQuery } from "@tanstack/react-query"
import { MonitorSmartphoneIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { describeUserAgent, formatDate } from "@/lib/format"
import { sessionsQuery, useRevokeOtherSessions, useRevokeSession } from "./api"

export function SessionsCard() {
  const { data: sessions, isPending, isError } = useQuery(sessionsQuery)
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const hasOthers = sessions?.some((session) => !session.current)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Devices currently signed in to your account.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasOthers || revokeOthers.isPending}
            onClick={() =>
              revokeOthers.mutate(undefined, {
                onSuccess: ({ revoked }) =>
                  toast.success(`Signed out of ${revoked} other session(s)`),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Sign out other sessions
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending && <Skeleton className="h-16 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">Could not load sessions.</p>
        )}
        <ul className="divide-y">
          {sessions?.map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-3">
              <MonitorSmartphoneIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">
                    {describeUserAgent(session.userAgent)}
                  </span>
                  {session.current && (
                    <Badge variant="secondary">This device</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.ip ?? "Unknown IP"} · Signed in{" "}
                  {formatDate(session.createdAt)} · Expires{" "}
                  {formatDate(session.expiresAt)}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() =>
                    revoke.mutate(session.id, {
                      onSuccess: () => toast.success("Session revoked"),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

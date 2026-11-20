import { useSuspenseQuery } from "@tanstack/react-query"
import { meQuery } from "@/features/auth/api"
import { SessionsCard } from "@/features/sessions/sessions-card"

export function HomePage() {
  const { data: user } = useSuspenseQuery(meQuery)

  return (
    <>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to the application.
        </h1>
        <p className="text-muted-foreground">Signed in as {user?.name}.</p>
      </section>
      <SessionsCard />
    </>
  )
}

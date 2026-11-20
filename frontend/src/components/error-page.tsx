import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Button } from "@/components/ui/button"

export function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Something went wrong."

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Unexpected error</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  )
}

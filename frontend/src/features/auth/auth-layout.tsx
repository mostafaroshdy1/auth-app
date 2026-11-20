import type { ReactNode } from "react"
import { Link } from "react-router"
import { ShieldCheckIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AuthLayoutProps {
  title: string
  description: string
  footer: { text: string; linkLabel: string; to: string }
  children: ReactNode
}

export function AuthLayout({
  title,
  description,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2 font-medium">
          <ShieldCheckIcon className="size-5" />
          Easy Auth
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            {footer.text}&nbsp;
            <Link
              to={footer.to}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {footer.linkLabel}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

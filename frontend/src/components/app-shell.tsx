import { useSuspenseQuery } from "@tanstack/react-query"
import { NavLink, Outlet, useNavigate } from "react-router"
import { LogOutIcon, MoonIcon, ShieldCheckIcon, SunIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { hasPermission, meQuery, useSignOut } from "@/features/auth/api"
import { cn } from "@/lib/utils"

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
    isActive && "bg-muted font-medium"
  )

export function AppShell() {
  const { data: user } = useSuspenseQuery(meQuery)
  const navigate = useNavigate()
  const signOut = useSignOut()
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && document.documentElement.classList.contains("dark"))

  const handleSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => toast.success("Signed out"),
      onSettled: () => navigate("/sign-in", { replace: true }),
    })

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheckIcon className="size-5" />
            <span className="hidden sm:inline">Easy Auth</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            {hasPermission(user, "users:read") && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signOut.isPending}
            >
              <LogOutIcon />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

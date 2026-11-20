import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"
import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { meQuery } from "@/features/auth/api"
import { createQueryClient } from "@/lib/query-client"
import { createRouter } from "@/router"

const queryClient = createQueryClient(() => {
  queryClient.setQueryData(meQuery.queryKey, null)
  void router.navigate("/sign-in", { replace: true })
})
const router = createRouter(queryClient)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)

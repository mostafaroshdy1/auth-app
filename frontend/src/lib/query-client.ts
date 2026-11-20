import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { ApiError } from "./api"

export function createQueryClient(onSessionExpired: () => void) {
  const handleError = (error: Error) => {
    if (error instanceof ApiError && error.sessionExpired) onSessionExpired()
  }

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 2,
      },
    },
  })
}

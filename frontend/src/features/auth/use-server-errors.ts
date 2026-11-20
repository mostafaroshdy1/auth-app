import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"

export function useServerErrors<T extends FieldValues>(form: UseFormReturn<T>) {
  return (error: unknown) => {
    if (error instanceof ApiError) {
      const fields = Object.entries(error.fieldErrors()).filter(
        ([name]) => name in form.getValues()
      )
      if (fields.length > 0) {
        for (const [name, message] of fields)
          form.setError(name as Path<T>, { message })
        return
      }
      if (error.status === 429) {
        toast.error(
          "Too many attempts. Please wait a few minutes and try again."
        )
        return
      }
      toast.error(error.message)
      return
    }
    toast.error(
      "Unable to reach the server. Check your connection and try again."
    )
  }
}

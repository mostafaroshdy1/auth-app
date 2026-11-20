import { CheckIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { passwordRules } from "./schemas"

export function PasswordChecklist({
  value,
  id,
}: {
  value: string
  id: string
}) {
  return (
    <ul
      id={id}
      className="grid gap-1 text-xs sm:grid-cols-2"
      aria-label="Password requirements"
    >
      {passwordRules.map((rule) => {
        const passed = rule.test(value)
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5",
              passed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            {passed ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <XIcon className="size-3.5" />
            )}
            <span>{rule.label}</span>
            <span className="sr-only">{passed ? "(met)" : "(not met)"}</span>
          </li>
        )
      })}
    </ul>
  )
}

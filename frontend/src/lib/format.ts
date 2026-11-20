const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export const formatDate = (value: string) => dateFormat.format(new Date(value))

export function describeUserAgent(userAgent?: string) {
  if (!userAgent) return "Unknown device"
  const browser = /(Edg|Firefox|Chrome|Safari|curl)\/[\d.]+/
    .exec(userAgent)?.[0]
    ?.replace("Edg", "Edge")
  const os = /(Windows|Mac OS X|Android|iPhone|iPad|Linux)/
    .exec(userAgent)?.[0]
    ?.replace("Mac OS X", "macOS")
  return (
    [browser?.split("/")[0], os].filter(Boolean).join(" on ") ||
    userAgent.slice(0, 40)
  )
}

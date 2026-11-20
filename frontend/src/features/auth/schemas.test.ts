import { describe, expect, it } from "vitest"
import { signUpSchema } from "./schemas"

const valid = {
  email: "ada@example.com",
  name: "Ada",
  password: "Passw0rd!",
  isAdmin: false,
}

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ["invalid email", { email: "ada" }],
    ["short name", { name: "Al" }],
    ["password without special character", { password: "Passw0rd1" }],
    ["password without number", { password: "Password!" }],
    ["short password", { password: "Pa0!" }],
  ])("rejects %s", (_label, override) => {
    expect(signUpSchema.safeParse({ ...valid, ...override }).success).toBe(
      false
    )
  })
})

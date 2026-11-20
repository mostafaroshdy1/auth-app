import { z } from "zod"

export const passwordRules = [
  {
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "At least one letter",
    test: (value: string) => /\p{L}/u.test(value),
  },
  { label: "At least one number", test: (value: string) => /\d/.test(value) },
  {
    label: "At least one special character",
    test: (value: string) => /[^\p{L}\d\s]/u.test(value),
  },
]

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .check(z.email("Enter a valid email address"))

export const signUpSchema = z.object({
  email,
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(
      /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u,
      "Use letters, spaces, apostrophes, dots or hyphens only"
    ),
  password: z
    .string()
    .max(128, "Password must be at most 128 characters")
    .refine(
      (value) => passwordRules.every((rule) => rule.test(value)),
      "Password does not meet all requirements"
    ),
  isAdmin: z.boolean(),
})

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
})

export type SignUpValues = z.infer<typeof signUpSchema>
export type SignInValues = z.infer<typeof signInSchema>

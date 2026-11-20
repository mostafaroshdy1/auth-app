import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useNavigate, useSearchParams } from "react-router"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useSignIn } from "./api"
import { AuthLayout } from "./auth-layout"
import { type SignInValues, signInSchema } from "./schemas"
import { useServerErrors } from "./use-server-errors"

const safeRedirect = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/"

export function SignInPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const signIn = useSignIn()
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })
  const onServerError = useServerErrors(form)

  const onSubmit = (values: SignInValues) =>
    signIn.mutate(values, {
      onSuccess: () =>
        navigate(safeRedirect(params.get("redirect")), { replace: true }),
      onError: onServerError,
    })

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in with your email and password."
      footer={{
        text: "Don't have an account?",
        linkLabel: "Sign up",
        to: "/sign-up",
      }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  {...field}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button type="submit" disabled={signIn.isPending}>
            {signIn.isPending && <Loader2Icon className="animate-spin" />}
            Sign in
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

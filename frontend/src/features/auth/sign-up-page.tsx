import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { authOptionsQuery, useSignUp } from "./api"
import { AuthLayout } from "./auth-layout"
import { PasswordChecklist } from "./password-checklist"
import { type SignUpValues, signUpSchema } from "./schemas"
import { useServerErrors } from "./use-server-errors"

export function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useSignUp()
  const { data: options } = useQuery(authOptionsQuery)
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: { email: "", name: "", password: "", isAdmin: false },
  })
  const password = useWatch({ control: form.control, name: "password" })
  const onServerError = useServerErrors(form)

  const onSubmit = (values: SignUpValues) =>
    signUp.mutate(values, {
      onSuccess: () => navigate("/", { replace: true }),
      onError: onServerError,
    })

  return (
    <AuthLayout
      title="Create an account"
      description="Enter your details to get started."
      footer={{
        text: "Already have an account?",
        linkLabel: "Sign in",
        to: "/sign-in",
      }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  {...field}
                  id="name"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
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
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="password-rules"
                />
                <PasswordChecklist id="password-rules" value={password} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          {options?.adminSignup && (
            <Controller
              name="isAdmin"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="isAdmin">Admin account</FieldLabel>
                    <FieldDescription>
                      Grants access to the admin area. Demo only.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="isAdmin"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />
          )}
          <Button type="submit" disabled={signUp.isPending}>
            {signUp.isPending && <Loader2Icon className="animate-spin" />}
            Create account
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

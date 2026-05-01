"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SocialAuth } from "./auth-social"

interface LoginFormProps {
  active: boolean
  error: string | null
  isPending: boolean
  onSubmit: (formData: FormData) => void
  onChangeMode: () => void
}

export function LoginForm({
  active,
  error,
  isPending,
  onSubmit,
  onChangeMode,
}: LoginFormProps) {
  return (
    <form 
      action={onSubmit} 
      className={cn(
        "absolute inset-0 p-6 transition duration-500 ease-out md:p-8",
        active
          ? "pointer-events-auto opacity-100 [transform:translateX(0)_rotateY(0deg)]"
          : "pointer-events-none opacity-0 [transform:translateX(1rem)_rotateY(12deg)]"
      )}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-balance text-muted-foreground">
            Login to your OpenBayan research workspace
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input id="login-email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <a href="#" className="ms-auto text-sm underline-offset-2 hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input id="login-password" name="password" type="password" required />
        </Field>
        {error ? (
          <FieldDescription className="text-center text-destructive">{error}</FieldDescription>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Logging in..." : "Login"}
          </Button>
        </Field>
        <SocialAuth label="Login" />
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <button type="button" className="underline underline-offset-4" onClick={onChangeMode}>
            Sign up
          </button>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}

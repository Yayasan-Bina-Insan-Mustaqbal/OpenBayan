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

interface SignupFormProps {
  active: boolean
  error: string | null
  isPending: boolean
  onSubmit: (formData: FormData) => void
  onChangeMode: () => void
}

export function SignupForm({
  active,
  error,
  isPending,
  onSubmit,
  onChangeMode,
}: SignupFormProps) {
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
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="signup-name">Name</FieldLabel>
          <Input id="signup-name" name="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input id="signup-email" name="email" type="email" placeholder="m@example.com" required />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email with anyone else.
          </FieldDescription>
        </Field>
        <Field>
          <Field className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input id="signup-password" name="password" type="password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <Input id="confirm-password" name="confirmPassword" type="password" required />
            </Field>
          </Field>
          <FieldDescription>Must be at least 8 characters long.</FieldDescription>
        </Field>
        {error ? (
          <FieldDescription className="text-center text-destructive">{error}</FieldDescription>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating account..." : "Create Account"}
          </Button>
        </Field>
        <SocialAuth label="Sign up" />
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <button type="button" className="underline underline-offset-4" onClick={onChangeMode}>
            Sign in
          </button>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}

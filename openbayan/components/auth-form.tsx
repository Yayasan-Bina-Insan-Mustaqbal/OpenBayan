"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { IconChevronLeft } from "@tabler/icons-react"

import { motion, AnimatePresence } from "motion/react"
import { useIsMobile } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "signup"

type AuthFormProps = React.ComponentProps<"div"> & {
  initialMode?: AuthMode
}

export function AuthForm({ className, initialMode = "login", ...props }: AuthFormProps) {
  const [mode, setMode] = React.useState<AuthMode>(initialMode)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()
  const isSignup = mode === "signup"

  function handleLogin(formData: FormData) {
    setError(null)

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  function handleSignup(formData: FormData) {
    setError(null)

    startTransition(async () => {
      const password = String(formData.get("password") ?? "")
      const confirmPassword = String(formData.get("confirmPassword") ?? "")

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error ?? "Unable to create account.")
        return
      }

      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Account created, but automatic sign in failed.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  const isMobile = useIsMobile()
  const targetHeight = isSignup 
    ? (isMobile ? 800 : 720) 
    : (isMobile ? 520 : 480)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="size-4" />
        Back to home
      </Link>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <motion.div 
            animate={{ height: targetHeight }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative overflow-hidden"
          >
            <LoginPanel
              active={!isSignup}
              error={error}
              isPending={isPending}
              onSubmit={handleLogin}
              onChangeMode={() => {
                setError(null)
                setMode("signup")
              }}
            />
            <SignupPanel
              active={isSignup}
              error={error}
              isPending={isPending}
              onSubmit={handleSignup}
              onChangeMode={() => {
                setError(null)
                setMode("login")
              }}
            />
          </motion.div>

          <div className="relative hidden overflow-hidden bg-muted md:block">
            <Image
              src="/pexels-defrinomaasy-31679265.jpg"
              alt="Islamic architecture detail"
              fill
              priority
              sizes="(min-width: 768px) 448px, 0px"
              className={cn(
                "object-cover transition duration-700 ease-out dark:brightness-[0.2] dark:grayscale",
                isSignup ? "scale-105" : "scale-100"
              )}
            />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <div className="rounded-lg border bg-background/90 p-4 backdrop-blur">
                <p className="text-sm font-medium">
                  {isSignup ? "Start a research workspace" : "Return to your research"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {isSignup
                    ? "Create notebooks, save source paths, and build searchable Islamic knowledge."
                    : "Continue exploring Quran, Hadith, roots, entities, and scholar notes."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <Link href="/terms">Terms of Service</Link>{" "}
        and <Link href="/privacy">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}

function panelClass(active: boolean) {
  return cn(
    "absolute inset-0 p-6 transition duration-500 ease-out md:p-8",
    active
      ? "pointer-events-auto opacity-100 [transform:translateX(0)_rotateY(0deg)]"
      : "pointer-events-none opacity-0 [transform:translateX(1rem)_rotateY(12deg)]"
  )
}

function LoginPanel({
  active,
  error,
  isPending,
  onSubmit,
  onChangeMode,
}: {
  active: boolean
  error: string | null
  isPending: boolean
  onSubmit: (formData: FormData) => void
  onChangeMode: () => void
}) {
  return (
    <form action={onSubmit} className={panelClass(active)}>
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

function SignupPanel({
  active,
  error,
  isPending,
  onSubmit,
  onChangeMode,
}: {
  active: boolean
  error: string | null
  isPending: boolean
  onSubmit: (formData: FormData) => void
  onChangeMode: () => void
}) {
  return (
    <form action={onSubmit} className={panelClass(active)}>
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

function SocialAuth({ label }: { label: string }) {
  return (
    <>
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
        Or continue with
      </FieldSeparator>
      <Field className="grid grid-cols-3 gap-4">
        <Button variant="outline" type="button">
          <AppleIcon />
          <span className="sr-only">{label} with Apple</span>
        </Button>
        <Button variant="outline" type="button">
          <GoogleIcon />
          <span className="sr-only">{label} with Google</span>
        </Button>
        <Button variant="outline" type="button">
          <MetaIcon />
          <span className="sr-only">{label} with Meta</span>
        </Button>
      </Field>
    </>
  )
}

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        fill="currentColor"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  )
}

function MetaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
        fill="currentColor"
      />
    </svg>
  )
}

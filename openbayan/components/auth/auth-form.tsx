"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { IconChevronLeft } from "@tabler/icons-react"

import { motion } from "motion/react"
import { useIsMobile } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"

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

      router.push("/workspace")
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
        headers: { "Content-Type": "application/json" },
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

      router.push("/workspace")
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
            <LoginForm
              active={!isSignup}
              error={error}
              isPending={isPending}
              onSubmit={handleLogin}
              onChangeMode={() => {
                setError(null)
                setMode("signup")
              }}
            />
            <SignupForm
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

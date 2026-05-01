"use client"

import * as React from "react"
import {
  Activity,
  Bell,
  Key,
  Settings,
  Shield,
  User,
  CreditCard,
  Mail,
  Smartphone,
  Globe,
  Terminal,
  Users,
  Zap,
  Lock,
  RefreshCcw,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function AccountOverview() {
  const activities = [
    { title: "Logged in from a new device", time: "Just now", desc: "MacBook Pro (Chrome) in San Francisco.", icon: Activity },
    { title: "Password changed successfully", time: "2 hours ago", desc: "You successfully updated your account password.", icon: Key },
    { title: "Two-factor authentication enabled", time: "Yesterday at 4:30 PM", desc: "Added an extra layer of security to your account.", icon: Shield },
    { title: "New notification settings saved", time: "Oct 24, 2023", desc: "Updated your email digest preferences.", icon: Bell },
    { title: "Profile picture updated", time: "Oct 22, 2023", desc: "Uploaded a new avatar image.", icon: User },
    { title: "Billing method updated", time: "Oct 15, 2023", desc: "Added a new Visa card ending in 4242.", icon: Settings },
    { title: "Subscribed to Pro Plan", time: "Oct 12, 2023", desc: "Upgraded to annual Pro membership.", icon: CreditCard },
    { title: "Email address verified", time: "Oct 10, 2023", desc: "Confirmed primary email: jane.doe@example.com", icon: Mail },
    { title: "SMS alerts activated", time: "Oct 08, 2023", desc: "Verified mobile number ending in 8890.", icon: Smartphone },
    { title: "Login from London, UK", time: "Oct 05, 2023", desc: "Detected access from an unrecognized location.", icon: Globe },
    { title: "API Key Generated", time: "Oct 02, 2023", desc: "Created 'Production-v1' secret key.", icon: Terminal },
    { title: "Team Invitation Sent", time: "Sep 30, 2023", desc: "Invited 'mark.smith@example.com' to workspace.", icon: Users },
    { title: "Webhook Triggered", time: "Sep 28, 2023", desc: "External service integration pinged successfully.", icon: Zap },
    { title: "Account Recovery Code Used", time: "Sep 25, 2023", desc: "One-time backup code utilized for login.", icon: Lock },
    { title: "Workspace Renamed", time: "Sep 22, 2023", desc: "Changed 'Project Alpha' to 'Design Systems'.", icon: Settings },
    { title: "Security Audit Exported", time: "Sep 20, 2023", desc: "Downloaded account access logs for last 30 days.", icon: Shield },
    { title: "Integration Connected", time: "Sep 18, 2023", desc: "Successfully linked Slack for notifications.", icon: Activity },
    { title: "Session Terminated", time: "Sep 15, 2023", desc: "Forced logout on all other active devices.", icon: RefreshCcw },
    { title: "Metadata Updated", time: "Sep 12, 2023", desc: "Synchronized workspace configurations.", icon: Settings },
    { title: "Beta Feature Enabled", time: "Sep 10, 2023", desc: "Joined the early access program for AI tools.", icon: Zap },
  ];

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="flex h-full w-full max-w-lg flex-col overflow-hidden border-y-0 rounded-none shadow-xl">
        <CardHeader className="border-b bg-card py-4">
          <CardTitle className="text-xl">Account Overview</CardTitle>
          <CardDescription>
            Manage your settings and view recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-6 pt-4">
          <Tabs defaultValue="activity" className="flex h-full flex-col">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="min-h-0 flex-1 mt-0">
              <ScrollArea className="h-full pr-4 shadcn-scroll-viewport">
                <div className="flex flex-col gap-6 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 items-center justify-center rounded-full border-2 border-background bg-muted shadow-sm">
                      <User className="size-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Jane Doe</h3>
                      <p className="text-sm text-muted-foreground">Product Designer</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 border-t pt-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Email
                      </p>
                      <p className="text-sm font-medium">jane.doe@example.com</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Location
                      </p>
                      <p className="text-sm font-medium">San Francisco, CA</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="min-h-0 flex-1 mt-0">
              <ScrollArea className="h-full pr-4 shadcn-scroll-viewport">
                <div className="flex flex-col gap-6 pt-2">
                  {activities.map((item, i, arr) => (
                    <div key={i} className="relative flex gap-4">
                      {i !== arr.length - 1 && (
                        <div className="absolute bottom-[-24px] left-4 top-10 w-px bg-border" />
                      )}
                      <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted">
                        <item.icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="min-h-0 flex-1 mt-0">
              <ScrollArea className="h-full pr-4 shadcn-scroll-viewport">
                <div className="flex flex-col gap-6 pt-2">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Email Alerts</p>
                        <p className="text-xs text-muted-foreground">
                          Receive daily digest emails.
                        </p>
                      </div>
                      <div className="relative h-5 w-9 cursor-pointer rounded-full bg-primary">
                        <div className="absolute right-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-all" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">SMS Alerts</p>
                        <p className="text-xs text-muted-foreground">
                          Get text messages for urgent issues.
                        </p>
                      </div>
                      <div className="relative h-5 w-9 cursor-pointer rounded-full bg-muted">
                        <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-sm transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t pt-4">
                    <h3 className="text-sm font-semibold">Security</h3>
                    <button className="rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                      Change Password
                    </button>
                    <button className="rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                      Two-Factor Authentication
                    </button>
                    <button className="rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10">
                      Delete Account
                    </button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

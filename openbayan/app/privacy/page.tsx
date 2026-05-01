import type { Metadata } from "next"

import FooterSection from "@/components/landing/footer"
import { LegalSection } from "@/components/shared/legal-section"
import { SiteHeader } from "@/components/landing/site-header"

export const metadata: Metadata = {
  title: "Privacy Policy | OpenBayan",
  description: "Privacy policy for OpenBayan accounts, research tools, and workspace data.",
}

const privacyItems = [
  {
    title: "General Information",
    body: "OpenBayan is dedicated to empowering researchers to benefit from Islamic knowledge through advanced analytical tools. We value and respect the privacy of all of our users.",
  },
  {
    title: "Information Collection",
    body: "We collect certain personal information from users who choose to create an account on OpenBayan. This information may include:",
    items: [
      "Email address: We collect your email address to facilitate account creation and communication related to your account.",
      "Usage data: Information about how you interact with our research tools and workspace.",
    ],
  },
  {
    title: "Use of Personal Information",
    body: "We use the personal information we collect for the following purposes:",
    items: [
      "Facilitating account management and security.",
      "Personalizing your research workspace and notebook configurations.",
      "Improving our AI models and search algorithms through anonymous usage patterns.",
    ],
  },
  {
    title: "Data Security",
    body: "We take appropriate measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. We use industry-standard security protocols to help ensure the confidentiality and integrity of your data.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell, trade, or rent your personal information to third parties. We are committed to maintaining the trust of our research community.",
  },
]

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <LegalSection
        title="Privacy Policy"
        subtitle="How OpenBayan handles account details, workspace activity, and research tool usage."
        updatedAt="April 19, 2026"
        items={privacyItems}
        note="As building this platform is a collective effort for the Ummah, we strive to be as transparent as possible with our data practices. If you have any concerns, please contact our support team."
      />
      <FooterSection />
    </>
  )
}

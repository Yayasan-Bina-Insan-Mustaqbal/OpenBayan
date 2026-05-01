import type { Metadata } from "next"

import FooterSection from "@/components/landing/footer"
import { LegalSection } from "@/components/shared/legal-section"
import { SiteHeader } from "@/components/landing/site-header"

export const metadata: Metadata = {
  title: "Terms of Service | OpenBayan",
  description: "Terms and conditions for using the OpenBayan research workspace.",
}

const terms = [
  {
    title: "Agreement to Terms",
    emphasis: "Please read this agreement carefully before using the service.",
    body: "By accessing or using the OpenBayan platform, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, you may not use our services.",
  },
  {
    title: "0. General Ethics",
    body: "OpenBayan has a zero-tolerance policy for abusive, offensive, or ethically questionable content. Users who violate Islamic ethical standards or post inappropriate content will be permanently banned from the platform.",
  },
  {
    title: "1. The Research Service",
    body: "The Service includes but is not limited to the OpenBayan web applications, interactive tools and AI-driven analysis, research notebooks, and database extraction tools.",
  },
  {
    title: "2. Intellectual Property",
    body: "The content accessible through OpenBayan, including but not limited to research data, algorithms, and interface designs, is protected by intellectual property laws. Users are granted a limited, non-exclusive right to use the service for personal, academic, or non-commercial research purposes.",
  },
  {
    title: "3. Prohibited Conduct",
    body: "Users shall not:",
    items: [
      "Decompile or reverse engineer any part of the service.",
      "Use automated scripts to scrape data without explicit permission.",
      "Interfere with the security or performance of the platform.",
    ],
  },
  {
    title: "4. User Generated Content",
    body: "By creating notebooks and sharing research on OpenBayan, you grant the platform a limited license to host and display your content to your specified audiences. You remain the owner of your original research notes.",
  },
]

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <LegalSection
        title="Terms of Service"
        subtitle="Rules for using the OpenBayan research workspace and its AI-assisted Islamic knowledge tools."
        updatedAt="April 19, 2026"
        items={terms}
        note="OpenBayan is a dedicated platform for the preservation and exploration of Islamic knowledge. We grow as a free and valuable resource for the global community, Alhamdulillah."
      />
      <FooterSection />
    </>
  )
}

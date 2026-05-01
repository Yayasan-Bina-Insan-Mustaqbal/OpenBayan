import Link from "next/link"
import { Logo } from "@/components/landing/logo"
import { footerLinks } from "./footer-data"
import { FooterSocial } from "./footer-social"

export default function FooterSection() {
  return (
    <footer className="border-t bg-background pt-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="flex flex-col gap-4 md:col-span-2">
            <Link href="/" aria-label="go home" className="block size-fit">
              <Logo />
            </Link>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              OpenBayan is an unbiased semantic search workspace for multi-source Islamic
              knowledge, rich connections, alamat, majmu&apos;, and sahifah.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:col-span-3">
            {footerLinks.map((group, index) => (
              <div key={index} className="flex flex-col gap-4 text-sm">
                <span className="block font-medium">{group.group}</span>
                {group.items.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    className="text-muted-foreground hover:text-primary block duration-150"
                  >
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t py-6">
          <span className="text-muted-foreground order-last block text-center text-sm md:order-first">
            © {2026} OpenBayan. Islamic research knowledge workspace.
          </span>
          <FooterSocial />
        </div>
      </div>
    </footer>
  )
}

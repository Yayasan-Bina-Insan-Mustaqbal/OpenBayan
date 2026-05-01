type LegalItem = {
  title: string
  body: string
  emphasis?: string
  items?: string[]
}

type LegalSectionProps = {
  title: string
  subtitle: string
  updatedAt: string
  items: LegalItem[]
  note: string
}

export function LegalSection({
  title,
  subtitle,
  updatedAt,
  items,
  note,
}: LegalSectionProps) {
  return (
    <main className="min-h-svh bg-background">
      <section className="scroll-py-16 py-16 md:scroll-py-32 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-y-12 px-2 lg:[grid-template-columns:1fr_auto]">
            <div className="text-center lg:text-start">
              <p className="mb-3 text-sm text-muted-foreground">Last updated: {updatedAt}</p>
              <h1 className="mb-4 text-3xl font-semibold md:text-4xl">{title}</h1>
              <p className="max-w-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="divide-y divide-solid sm:mx-auto sm:max-w-lg lg:mx-0">
              {items.map((item, index) => (
                <section key={item.title} className={index === 0 ? "pb-6" : "py-6"}>
                  <h2 className="font-medium">{item.title}</h2>
                  {item.emphasis ? (
                    <p className="mt-4 text-sm font-medium uppercase text-muted-foreground">
                      {item.emphasis}
                    </p>
                  ) : null}
                  <p className="mt-4 text-muted-foreground">{item.body}</p>

                  {item.items ? (
                    <ul className="mt-4 flex list-outside list-disc flex-col gap-2 ps-4">
                      {item.items.map((listItem) => (
                        <li key={listItem} className="text-muted-foreground">
                          {listItem}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}

              <div className="pt-6">
                <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {note}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

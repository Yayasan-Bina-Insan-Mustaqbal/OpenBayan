import Link from "next/link"

export default async function SahifahReaderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sahifah Title Placeholder</h1>
        {/* Placeholder for Edit action, navigating to workspace */}
        <Link 
          href={`/workspace?open=sahifah-${id}`}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Edit
        </Link>
      </div>
      
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        <p>This is a placeholder for the Sahifah content. ID: {id}</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      </div>
    </div>
  )
}

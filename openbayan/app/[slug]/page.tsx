import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from 'next/link';
import { MarkdownDocsRenderer } from "@/components/markdown-renderer";

export const dynamic = "force-dynamic";

export default async function PublicDocPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    
    // Convert slug to file path, e.g., quran_ingestion -> quran/ingestion.md
    let relativePath = slug.replace('_', '/') + '.md';
    if (slug === 'search') {
        relativePath = 'search/README.md';
    } else if (slug === 'dictionary_murad_ingestion') {
        relativePath = 'dictionary/murad_ingestion.md';
    } else if (!slug.includes('_') && slug !== 'search') {
        // e.g. someone types /quran instead of /quran_ingestion
        relativePath = slug + '/ingestion.md';
    }

    const possiblePaths = [
        path.join(process.cwd(), 'backend_docs'),
        path.join(process.cwd(), '../OpenBayanBackend/docs')
    ];
    
    let docsPath = null;
    let checkedPaths = [];
    for (const p of possiblePaths) {
        checkedPaths.push(p);
        if (fs.existsSync(p)) {
            docsPath = p;
            break;
        }
    }

    if (!docsPath) {
        return (
            <div className="p-8 text-white">
                <h1>404 - Docs Path Not Found</h1>
                <pre>{JSON.stringify({ checkedPaths, cwd: process.cwd() }, null, 2)}</pre>
            </div>
        );
    }

    const filePath = path.join(docsPath, relativePath);
    if (!fs.existsSync(filePath)) {
        return (
            <div className="p-8 text-white">
                <h1>404 - File Not Found</h1>
                <pre>{JSON.stringify({ filePath, docsPath, relativePath, cwd: process.cwd() }, null, 2)}</pre>
            </div>
        );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const title = content.split('\n')[0].replace(/^#+\s*/, '') || slug;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
            {/* Header/Nav */}
            <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                        <span className="text-xl">📚</span> OpenBayan Docs
                    </Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
                        <Link href="/quran_ingestion" className="hover:text-emerald-400 transition-colors">Quran</Link>
                        <Link href="/hadith_ingestion" className="hover:text-emerald-400 transition-colors">Hadith</Link>
                        <Link href="/books_ingestion" className="hover:text-emerald-400 transition-colors">Books</Link>
                        <Link href="/sentences_ingestion" className="hover:text-emerald-400 transition-colors">Sentences</Link>
                        <Link href="/dictionary_murad_ingestion" className="hover:text-emerald-400 transition-colors">Dictionary</Link>
                        <Link href="/search" className="hover:text-emerald-400 transition-colors">Search Engine</Link>
                    </nav>
                </div>
            </header>
            
            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-100 tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent inline-block pb-2">
                        {title}
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Architecture & Ingestion Overview</p>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-2xl overflow-hidden">
                    <MarkdownDocsRenderer content={content.replace(/^#\s+.+\n/, '')} />
                </div>
            </main>

            <footer className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-slate-800/50 mt-12">
                <p className="text-xs text-slate-500 font-medium">© 2026 OpenBayan Islamic Research Workspace.</p>
            </footer>
        </div>
    );
}

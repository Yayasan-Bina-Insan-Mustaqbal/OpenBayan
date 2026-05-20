"use client";

import React from "react";
import { renderMermaid } from 'beautiful-mermaid';

export function MarkdownDocsRenderer({ content }: { content: string }) {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = '';
    const renderedElements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('```')) {
            if (inCodeBlock) {
                inCodeBlock = false;
                const finalCode = codeContent.join('\n');
                if (codeLang === 'mermaid') {
                    renderedElements.push(
                        <div key={`mermaid-${i}`} className="my-6 bg-slate-950/60 p-6 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Architecture Map</span>
                            <div className="w-full overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: renderMermaid(finalCode) }} />
                        </div>
                    );
                } else {
                    renderedElements.push(
                        <pre key={`code-${i}`} className="my-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800/60 text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed">
                            <code className="text-slate-400 block mb-1 text-[9px] uppercase tracking-wider font-sans font-bold">[{codeLang || 'text'}]</code>
                            {finalCode}
                        </pre>
                    );
                }
                codeContent = [];
            } else {
                inCodeBlock = true;
                codeLang = line.replace('```', '').trim().toLowerCase();
            }
            continue;
        }

        if (inCodeBlock) {
            codeContent.push(line);
            continue;
        }

        if (line.startsWith('# ')) {
            renderedElements.push(
                <h1 key={`h1-${i}`} className="text-2xl font-black text-slate-100 tracking-tight mt-6 mb-3 pb-2 border-b border-slate-800/80 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {line.replace('# ', '')}
                </h1>
            );
        } else if (line.startsWith('## ')) {
            renderedElements.push(
                <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-200 tracking-tight mt-6 mb-2">
                    {line.replace('## ', '')}
                </h2>
            );
        } else if (line.startsWith('### ')) {
            renderedElements.push(
                <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-300 tracking-tight mt-4 mb-2">
                    {line.replace('### ', '')}
                </h3>
            );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const cleanText = line.substring(2);
            renderedElements.push(
                <div key={`li-${i}`} className="flex items-start gap-2 my-1.5 text-xs text-slate-400 pl-4">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{cleanText}</span>
                </div>
            );
        } else if (line.match(/^\d+\.\s/)) {
            const cleanText = line.replace(/^\d+\.\s/, '');
            renderedElements.push(
                <div key={`ol-${i}`} className="flex items-start gap-2 my-1.5 text-xs text-slate-400 pl-4">
                    <span className="text-indigo-400 font-bold mt-0.5 text-[10px]">{line.match(/^\d+/) && line.match(/^\d+/)?.[0]}.</span>
                    <span>{cleanText}</span>
                </div>
            );
        } else if (line.trim() === '') {
            renderedElements.push(<div key={`space-${i}`} className="h-2" />);
        } else {
            renderedElements.push(
                <p key={`p-${i}`} className="text-xs text-slate-400 leading-relaxed my-2 font-normal">
                    {line}
                </p>
            );
        }
    }

    return <div className="space-y-1">{renderedElements}</div>;
}

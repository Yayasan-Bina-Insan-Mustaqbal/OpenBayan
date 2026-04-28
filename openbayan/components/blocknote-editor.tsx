"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

interface BlockNoteEditorProps {
  initialContent?: string | string[];
  onChange?: (blocks: any[]) => void;
}

export default function BlockNoteEditor({ initialContent, onChange }: BlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  // Normalize content to string
  const contentString = Array.isArray(initialContent) 
    ? initialContent.join("\n") 
    : initialContent || "";

  const editor = useCreateBlockNote();

  useEffect(() => {
    async function initEditor() {
      if (editor && contentString && !isLoaded) {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(contentString);
          editor.replaceBlocks(editor.document, blocks);
          setIsLoaded(true);
        } catch (e) {
          console.error("Failed to parse initial content to blocks", e);
        }
      }
    }
    initEditor();
  }, [editor, contentString, isLoaded]);

  return (
    <div className="h-full w-full bg-background/50 backdrop-blur-sm">
      <BlockNoteView 
        editor={editor} 
        theme={resolvedTheme} 
        onChange={() => {
          if (onChange) {
            onChange(editor.document);
          }
        }}
        className="h-full"
      />
    </div>
  );
}

"use client";

import { BlockNoteView, lightDefaultTheme, darkDefaultTheme, Theme } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "@/components/shared/theme-provider";
import { useEffect, useState, useMemo } from "react";

interface BlockNoteEditorProps {
  initialContent?: string | string[];
  onChange?: (blocks: any[]) => void;
}

export default function BlockNoteEditor({ initialContent, onChange }: BlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  // Define custom theme that uses CSS variables to match the app
  const customTheme = useMemo(() => {
    const baseTheme = resolvedTheme === "dark" ? darkDefaultTheme : lightDefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        editor: {
          background: "hsl(var(--background))",
          text: "hsl(var(--foreground))",
        },
      },
    } satisfies Theme;
  }, [resolvedTheme]);

  // Normalize content to string
  const contentString = useMemo(() => 
    Array.isArray(initialContent) 
      ? initialContent.join("\n") 
      : initialContent || ""
  , [initialContent]);

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
    <div className="w-full">
      <BlockNoteView 
        editor={editor} 
        theme={customTheme} 
        onChange={() => {
          if (onChange) {
            onChange(editor.document);
          }
        }}
      />
    </div>
  );
}

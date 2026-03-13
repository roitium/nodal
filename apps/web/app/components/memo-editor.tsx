import MDEditor from "@uiw/react-md-editor";
import { useTheme } from "next-themes";
import rehypeSanitize from "rehype-sanitize";
import type { KeyboardEvent } from "react";

interface MemoEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: "edit" | "preview" | "live";
  hideToolbar?: boolean;
  className?: string;
  autoFocus?: boolean;
  textareaProps?: Record<string, unknown>;
  onSubmitShortcut?: () => void;
  canSubmitShortcut?: boolean;
}

export function MemoEditor({
  value,
  onChange,
  placeholder,
  height,
  preview = "edit",
  hideToolbar,
  className,
  autoFocus,
  textareaProps,
  onSubmitShortcut,
  canSubmitShortcut = true,
}: MemoEditorProps) {
  const { theme } = useTheme();

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const userOnKeyDown = textareaProps?.onKeyDown as
      | ((event: KeyboardEvent<HTMLTextAreaElement>) => void)
      | undefined;

    userOnKeyDown?.(e);
    if (e.defaultPrevented) return;

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmitShortcut) {
        onSubmitShortcut?.();
      }
    }
  };

  return (
    <div data-color-mode={theme === "dark" ? "dark" : "light"} className={className}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        preview={preview}
        height={height}
        hideToolbar={hideToolbar}
        className="border-none rounded-none shadow-none! bg-transparent"
        previewOptions={{
          rehypePlugins: [[rehypeSanitize]],
        }}
        textareaProps={{
          ...textareaProps,
          placeholder,
          autoFocus,
          onKeyDown: handleKeyDown,
        } as any}
      />
    </div>
  );
}

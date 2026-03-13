import MDEditor, { commands, type ICommand, type TextAreaTextApi, type TextState } from "@uiw/react-md-editor";
import { Wrench } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, type KeyboardEvent } from "react";
import { markdownComponents, markdownRehypePlugins, markdownRemarkPlugins } from "~/lib/markdown";

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

  const shareBilibiliCommand = useMemo<ICommand>(
    () => ({
      name: "share-bilibili-video",
      keyCommand: "share-bilibili-video",
      buttonProps: { "aria-label": "分享 B 站视频" },
      icon: <span className="text-xs">分享 B 站视频</span>,
      execute: (state: TextState, api: TextAreaTextApi) => {
        const snippet = "[[bilibili:]]";
        api.replaceSelection(snippet);
        const cursor = state.selection.start + "[[bilibili:".length;
        api.setSelectionRange({ start: cursor, end: cursor });
      },
    }),
    [],
  );

  const toolsCommand = useMemo<ICommand>(
    () =>
      commands.group([shareBilibiliCommand], {
        name: "tools",
        groupName: "tools",
        buttonProps: { "aria-label": "工具" },
        liProps: { className: "memo-editor-tools-command" },
        icon: <Wrench className="h-3.5 w-3.5" />,
      }),
    [shareBilibiliCommand],
  );

  const extraCommands = useMemo<ICommand[]>(
    () => [commands.codeEdit, commands.codeLive, commands.codePreview, commands.divider, toolsCommand, commands.divider, commands.fullscreen],
    [toolsCommand],
  );

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
        extraCommands={extraCommands as any}
        className="border-none rounded-none shadow-none! bg-transparent"
        previewOptions={{
          components: markdownComponents as any,
          rehypePlugins: markdownRehypePlugins as any,
          remarkPlugins: markdownRemarkPlugins as any,
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

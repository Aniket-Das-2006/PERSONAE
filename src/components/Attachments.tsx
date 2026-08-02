import { useRef } from "react";

export type UploadedFile = { name: string; mime: string; dataUrl: string };

const MAX_BYTES = 6 * 1024 * 1024;

export function AttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: UploadedFile[];
  onChange: (f: UploadedFile[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = async (list: FileList | null) => {
    if (!list) return;
    const next: UploadedFile[] = [];
    for (const file of Array.from(list).slice(0, 4)) {
      if (file.size > MAX_BYTES) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      next.push({
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    onChange([...files, ...next].slice(0, 4));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.txt,.md,.csv"
        className="hidden"
        onChange={(e) => void add(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="hairline ink-transition rounded px-2.5 py-1 font-mono text-[10.5px] text-muted-foreground hover:text-gold disabled:opacity-40"
      >
        + attach image or pdf
      </button>
      {files.map((f, i) => (
        <span
          key={`${f.name}-${i}`}
          className="hairline flex max-w-[12rem] items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] text-gold"
        >
          <span className="truncate">{f.mime.startsWith("image/") ? "🖼" : "📄"} {f.name}</span>
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-signal"
            aria-label={`remove ${f.name}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

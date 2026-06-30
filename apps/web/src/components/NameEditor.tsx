import { useEffect, useRef, useState } from 'react';
import { Pencil, Check } from 'lucide-react';

interface NameEditorProps {
  name: string;
  color: string;
  onChange: (name: string) => void;
}

/**
 * Shows the local user's identity (colored dot + name) and lets them rename
 * themselves inline. Committing broadcasts the new name to all peers.
 */
export function NameEditor({ name, color, onChange }: NameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // Keep the draft in sync when the name changes externally and we're not editing.
  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      onChange(trimmed);
    } else {
      setDraft(name);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="glass-panel-sm flex items-center gap-1.5 px-2 py-1">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <input
          ref={inputRef}
          value={draft}
          maxLength={24}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="bg-transparent outline-none text-xs font-medium w-24 text-[var(--text-primary)]"
          aria-label="Your display name"
        />
        <button
          onClick={commit}
          className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Save name"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="glass-button flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer group"
      aria-label="Edit your display name"
      title="Click to rename yourself"
    >
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[var(--text-primary)] whitespace-nowrap max-w-[120px] truncate">
        {name}
      </span>
      <Pencil className="w-3 h-3 text-[var(--text-secondary)] opacity-50 group-hover:opacity-100" />
    </button>
  );
}

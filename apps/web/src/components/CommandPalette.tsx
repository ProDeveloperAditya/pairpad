import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: LucideIcon;
  hint?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut?: string;
  items: CommandItem[];
  placeholder?: string;
  children?: ReactNode;
}

export function CommandPalette({
  open,
  onOpenChange,
  shortcut = 'j',
  items,
  placeholder = 'Type a command or search...',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const groupedItems = filteredItems.reduce<Record<string, CommandItem[]>>(
    (groups, item) => {
      const group = groups[item.group] ?? [];
      group.push(item);
      groups[item.group] = group;
      return groups;
    },
    {}
  );

  const flatFiltered = Object.values(groupedItems).flat();

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery('');
    setSelectedIndex(0);
  }, [onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === shortcut) {
        event.preventDefault();
        onOpenChange(!open);
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, shortcut, close]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyNavigation = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((previous) => Math.min(previous + 1, flatFiltered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = flatFiltered[selectedIndex];
      if (selected) {
        selected.onSelect();
        close();
      }
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  let itemIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg animate-scale-in">
        <div className="glass-panel mx-4 overflow-hidden shadow-2xl dark:shadow-black/50">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
            <Search className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyNavigation}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none text-sm font-sans"
              aria-label="Search commands"
            />
            <button
              onClick={close}
              className="p-1 rounded-md hover:bg-[var(--muted)] transition-colors cursor-pointer"
              aria-label="Close command palette"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto py-2" role="listbox">
            {flatFiltered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Object.entries(groupedItems).map(([groupName, groupItems]) => (
                <div key={groupName}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {groupName}
                  </div>
                  {groupItems.map((item) => {
                    const currentIndex = itemIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => {
                          item.onSelect();
                          close();
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-accent/10 dark:bg-accent-light/10 text-accent dark:text-accent-light'
                            : 'text-[var(--text-primary)] hover:bg-[var(--muted)]'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {item.icon && (
                          <item.icon className="w-4 h-4 shrink-0 opacity-70" />
                        )}
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {item.hint && (
                          <span className="text-xs text-[var(--text-secondary)] font-mono opacity-60">
                            {item.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--muted)] font-mono text-[10px]">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--muted)] font-mono text-[10px]">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--muted)] font-mono text-[10px]">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

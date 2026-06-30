import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  Copy,
  Check,
  Play,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { Presence } from './Presence';
import { NameEditor } from './NameEditor';
import { LANGUAGES, type Language } from '../lib/languages';
import type { WebsocketProvider } from 'y-websocket';

interface ToolbarProps {
  roomId: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRun: () => void;
  isRunning: boolean;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  userName: string;
  userColor: string;
  onNameChange: (name: string) => void;
}

export function Toolbar({
  roomId,
  language,
  onLanguageChange,
  onRun,
  isRunning,
  provider,
  isConnected,
  userName,
  userColor,
  onNameChange,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may not be available */
    }
  }

  return (
    <div className="glass-panel-sm mx-2 mt-2 px-3 py-2 flex items-center gap-2 sm:gap-3 rounded-xl">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        aria-label="Go to home page"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-mono font-bold text-base hidden sm:inline">
          Pair<span className="text-accent dark:text-accent-light">Pad</span>
        </span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--border-color)] hidden sm:block" />

      {/* Room ID + Copy */}
      <button
        onClick={handleCopyUrl}
        className="glass-button flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono cursor-pointer"
        aria-label="Copy room URL"
      >
        <span className="text-[var(--text-secondary)]">Room:</span>
        <span className="text-[var(--text-primary)]">{roomId.slice(0, 8)}…</span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success dark:text-success-light" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        )}
      </button>

      {/* Connection Status */}
      <div
        className="flex items-center gap-1 text-xs"
        title={isConnected ? 'Connected' : 'Disconnected'}
      >
        {isConnected ? (
          <Wifi className="w-3.5 h-3.5 text-success dark:text-success-light" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-destructive dark:text-destructive-light" />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Your editable name */}
      <div className="hidden sm:flex">
        <NameEditor name={userName} color={userColor} onChange={onNameChange} />
      </div>

      {/* Presence */}
      <div className="hidden md:flex">
        <Presence provider={provider} />
      </div>

      {/* Language Selector */}
      <div className="relative">
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as Language)}
          className="glass-button appearance-none pl-3 pr-7 py-1.5 text-xs font-medium cursor-pointer"
          aria-label="Select programming language"
        >
          {LANGUAGES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Run Button */}
      <button
        onClick={onRun}
        disabled={isRunning}
        className="accent-button flex items-center gap-1.5 px-4 py-1.5 text-xs"
        id="run-button"
      >
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
        <span>{isRunning ? 'Running' : 'Run'}</span>
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="glass-button p-2 cursor-pointer"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4 text-slate-600" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400" />
        )}
      </button>
    </div>
  );
}

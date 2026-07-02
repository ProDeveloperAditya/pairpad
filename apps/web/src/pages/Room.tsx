import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Languages, Copy, Sun, Plus, Code2 } from 'lucide-react';
import { createYjsConnection } from '../lib/yjsClient';
import type { YjsConnection } from '../lib/yjsClient';
import type { ExecutionResult } from '../components/Output';
import { Editor } from '../components/Editor';
import { Output } from '../components/Output';
import { Toolbar } from '../components/Toolbar';
import { CommandPalette } from '../components/CommandPalette';
import type { CommandItem } from '../components/CommandPalette';
import { BorderBeam } from '../components/ui/BorderBeam';
import { LANGUAGES, type Language } from '../lib/languages';
import { useTheme } from '../lib/theme';

export function Room() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const [language, setLanguage] = useState<Language>('python');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isExpired] = useState(false);
  const [connection, setConnection] = useState<YjsConnection | null>(null);
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('#6366F1');
  // Only warn after a short grace period so brief blips don't flash a banner.
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const newConnection = createYjsConnection(roomId);
    setConnection(newConnection);
    setUserName(newConnection.userInfo.name);
    setUserColor(newConnection.userInfo.color);

    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    let hasConnectedOnce = false;

    const handleStatus = ({ status }: { status: string }) => {
      const connected = status === 'connected';
      setIsConnected(connected);
      clearTimeout(graceTimer);
      if (connected) {
        hasConnectedOnce = true;
        setShowReconnecting(false);
      } else if (hasConnectedOnce) {
        // Only warn about a *lost* connection — never a slow initial connect.
        // Wait 3s before showing the banner (y-websocket auto-reconnects fast).
        graceTimer = setTimeout(() => setShowReconnecting(true), 3000);
      }
    };

    newConnection.provider.on('status', handleStatus);

    return () => {
      clearTimeout(graceTimer);
      newConnection.provider.off('status', handleStatus);
      newConnection.destroy();
      setConnection(null);
      setShowReconnecting(false);
    };
  }, [roomId]);

  const handleNameChange = useCallback(
    (name: string) => {
      connection?.updateName(name);
      setUserName(name);
    },
    [connection]
  );

  const handleRun = useCallback(async () => {
    if (!connection || isRunning) return;

    const code = connection.yText.toString();
    if (!code.trim()) {
      setError('No code to execute');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const apiUrl = import.meta.env['VITE_API_URL'] as string | undefined ?? 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = (await response.json()) as ExecutionResult;
      setResult(data);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Execution failed';
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }, [connection, language, isRunning]);

  const commandItems: CommandItem[] = useMemo(
    () => [
      {
        id: 'run',
        label: 'Run Code',
        group: 'Actions',
        icon: Play,
        hint: '⌘ ↵',
        onSelect: () => void handleRun(),
      },
      ...LANGUAGES.map((option) => ({
        id: `lang-${option.id}`,
        label: `Switch to ${option.label}`,
        group: 'Language',
        icon: Languages,
        onSelect: () => setLanguage(option.id),
      })),
      {
        id: 'copy-url',
        label: 'Copy Room URL',
        group: 'Actions',
        icon: Copy,
        onSelect: () => void navigator.clipboard.writeText(window.location.href),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        group: 'Preferences',
        icon: Sun,
        onSelect: toggleTheme,
      },
      {
        id: 'new-room',
        label: 'Create New Room',
        group: 'Navigation',
        icon: Plus,
        onSelect: () => {
          const newId = crypto.randomUUID();
          navigate(`/room/${newId}`);
        },
      },
    ],
    [handleRun, toggleTheme, navigate]
  );

  // Keyboard shortcut: Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  if (!roomId) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="glass-panel p-8 text-center animate-scale-in">
          <h2 className="text-xl font-semibold mb-4">Invalid Room</h2>
          <p className="text-[var(--text-secondary)] mb-6">No room ID provided.</p>
          <button onClick={() => navigate('/')} className="accent-button px-6 py-3">
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="glass-panel p-10 text-center max-w-md animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Room Expired</h2>
          <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
            This room has been inactive for over 2 hours and has been cleaned up.
          </p>
          <button onClick={() => navigate('/')} className="accent-button px-8 py-3 text-base">
            Create a New Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        roomId={roomId}
        language={language}
        onLanguageChange={setLanguage}
        onRun={() => void handleRun()}
        isRunning={isRunning}
        provider={connection?.provider ?? null}
        isConnected={isConnected}
        userName={userName}
        userColor={userColor}
        onNameChange={handleNameChange}
      />

      {/* Reconnecting banner */}
      {showReconnecting && (
        <div className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 animate-fade-in">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse-soft" />
          Connection lost — reconnecting…
        </div>
      )}

      {/* Editor + Output */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-2 p-2 min-h-0">
        {/* Editor Panel */}
        <div className="glass-panel overflow-hidden min-h-0 relative">
          {isRunning && <BorderBeam duration={3} />}
          <Editor language={language} connection={connection} />
        </div>

        {/* Output Panel */}
        <div className="glass-panel overflow-hidden min-h-0 relative">
          {isRunning && <BorderBeam duration={3} />}
          <Output result={result} isRunning={isRunning} error={error} />
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        shortcut="j"
        items={commandItems}
        placeholder="Run, switch language, copy URL..."
      />

      {/* Command Palette hint */}
      <div className="absolute bottom-3 right-3 text-xs text-[var(--text-secondary)] opacity-50 hidden md:flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--muted)] font-mono text-[10px]">
          ⌘ J
        </kbd>
        <span>Command palette</span>
      </div>
    </div>
  );
}

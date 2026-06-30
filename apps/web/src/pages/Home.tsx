import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Code2, Zap, Users, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { SparklesCore } from '../components/Sparkles';
import { ShimmerButton } from '../components/ui/ShimmerButton';
import { SpotlightCard } from '../components/ui/SpotlightCard';

const FEATURES = [
  { icon: Zap, label: 'CRDT Sync', description: 'Conflict-free real-time editing' },
  { icon: Shield, label: 'Docker Sandbox', description: 'Isolated code execution' },
  { icon: Users, label: 'Multi-Cursor', description: 'See everyone typing live' },
];

export function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  function handleNewRoom() {
    const roomId = uuidv4();
    navigate(`/room/${roomId}`);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Sparkles Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1.2}
          particleDensity={80}
          particleColor={theme === 'dark' ? '#FFFFFF' : '#6366F1'}
          speed={0.3}
          className="w-full h-full"
        />
      </div>

      {/* Sparkle Gradient Lines (inspired by Aceternity) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] max-w-[90vw] h-px pointer-events-none z-0">
        <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-transparent via-accent/50 to-transparent h-[2px] w-3/4 mx-auto blur-sm" />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-transparent via-accent/50 to-transparent h-px w-3/4 mx-auto" />
        <div className="absolute inset-x-[25%] top-0 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent h-[3px] w-1/4 mx-auto blur-sm" />
        <div className="absolute inset-x-[25%] top-0 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent h-px w-1/4 mx-auto" />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="glass-button fixed top-6 right-6 p-3 z-50"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5 text-slate-600" />
        ) : (
          <Sun className="w-5 h-5 text-amber-400" />
        )}
      </button>

      {/* Main Glass Card */}
      <div className="glass-panel relative z-10 w-full max-w-lg p-10 text-center animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-accent-glow">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">
            Pair<span className="text-accent dark:text-accent-light">Pad</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-lg text-[var(--text-secondary)] mb-8 font-light leading-relaxed">
          Real-time collaborative code.
          <br />
          No signup. Just code.
        </p>

        {/* Code Preview */}
        <div className="glass-panel-sm p-4 mb-8 text-left font-mono text-sm">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border-color)]">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-[var(--text-secondary)]">main.py</span>
          </div>
          <code className="block text-[var(--text-secondary)]">
            <span className="text-purple-500 dark:text-purple-400">def</span>{' '}
            <span className="text-blue-600 dark:text-blue-400">greet</span>
            <span className="text-[var(--text-primary)]">(name):</span>
            <br />
            {'  '}
            <span className="text-purple-500 dark:text-purple-400">return</span>{' '}
            <span className="text-emerald-600 dark:text-emerald-400">f&quot;Hello, &#123;name&#125;!&quot;</span>
            <br />
            <br />
            <span className="text-blue-600 dark:text-blue-400">print</span>
            <span className="text-[var(--text-primary)]">(greet(</span>
            <span className="text-emerald-600 dark:text-emerald-400">&quot;World&quot;</span>
            <span className="text-[var(--text-primary)]">))</span>
          </code>
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-success dark:text-success-light flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success dark:bg-success-light animate-pulse-soft" />
            <span className="font-sans">▸ Hello, World!</span>
          </div>
        </div>

        {/* New Room Button */}
        <ShimmerButton
          onClick={handleNewRoom}
          className="w-full py-4 px-8 text-lg rounded-xl"
          id="new-room-button"
        >
          New Room
        </ShimmerButton>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {FEATURES.map((feature, index) => (
            <SpotlightCard
              key={feature.label}
              className="glass-panel-sm flex items-center gap-2 px-4 py-2 text-sm animate-slide-up"
              style={{ animationDelay: `${(index + 1) * 80}ms`, animationFillMode: 'both' }}
            >
              <feature.icon className="w-4 h-4 text-accent dark:text-accent-light" />
              <span className="font-medium text-[var(--text-primary)]">{feature.label}</span>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-[var(--text-secondary)] animate-fade-in relative z-10">
        Powered by Yjs CRDTs &middot; Docker Sandboxed Execution
      </p>
    </div>
  );
}

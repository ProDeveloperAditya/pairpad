import { useEffect, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';

interface UserState {
  name: string;
  color: string;
  colorLight: string;
}

interface PresenceProps {
  provider: WebsocketProvider | null;
}

export function Presence({ provider }: PresenceProps) {
  const [users, setUsers] = useState<Map<number, UserState>>(new Map());

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const updateUsers = () => {
      const states = awareness.getStates();
      const connectedUsers = new Map<number, UserState>();

      states.forEach((state, clientId) => {
        // Skip the local user — they're represented by the name editor.
        if (clientId === awareness.clientID) return;
        const user = state['user'] as UserState | undefined;
        if (user) {
          connectedUsers.set(clientId, user);
        }
      });

      setUsers(new Map(connectedUsers));
    };

    updateUsers();
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider]);

  const userList = Array.from(users.entries());
  const maxVisible = 4;
  const visibleUsers = userList.slice(0, maxVisible);
  const overflowCount = userList.length - maxVisible;

  if (userList.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {visibleUsers.map(([clientId, user], index) => (
        <div
          key={clientId}
          className="glass-panel-sm flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium animate-scale-in"
          style={{
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'both',
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse-soft shrink-0"
            style={{ backgroundColor: user.color }}
          />
          <span className="text-[var(--text-primary)] whitespace-nowrap">{user.name}</span>
        </div>
      ))}
      {overflowCount > 0 && (
        <div className="glass-panel-sm px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          +{overflowCount} more
        </div>
      )}
    </div>
  );
}

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const COLORS = [
  '#6366F1', // indigo
  '#F97316', // orange
  '#22C55E', // green
  '#EF4444', // red
  '#06B6D4', // cyan
  '#D946EF', // fuchsia
  '#EAB308', // yellow
  '#14B8A6', // teal
];

const COLOR_NAMES = [
  'Indigo', 'Orange', 'Green', 'Red', 'Cyan', 'Fuchsia', 'Yellow', 'Teal',
];

const ANIMALS = [
  'Fox', 'Deer', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Lynx', 'Seal',
  'Puma', 'Hare', 'Dove', 'Swan', 'Crow', 'Wren', 'Lark', 'Moth',
];

function getRandomElement<T>(array: T[]): T {
  const element = array[Math.floor(Math.random() * array.length)];
  if (element === undefined) {
    throw new Error('Array must not be empty');
  }
  return element;
}

export interface UserInfo {
  name: string;
  color: string;
  colorLight: string;
}

const NAME_STORAGE_KEY = 'pairpad:user-name';
const COLOR_STORAGE_KEY = 'pairpad:user-color';
const MAX_NAME_LENGTH = 24;

function generateUserInfo(): UserInfo {
  const colorIndex = Math.floor(Math.random() * COLORS.length);
  const color = COLORS[colorIndex] ?? '#6366F1';
  const colorName = COLOR_NAMES[colorIndex] ?? 'Indigo';
  const animal = getRandomElement(ANIMALS);

  return {
    name: `${colorName} ${animal}`,
    color,
    colorLight: `${color}33`,
  };
}

/**
 * Loads the user's identity from localStorage so their chosen name and color
 * persist across rooms and reconnects, falling back to a random identity.
 */
function loadOrCreateUserInfo(): UserInfo {
  try {
    const storedName = localStorage.getItem(NAME_STORAGE_KEY);
    const storedColor = localStorage.getItem(COLOR_STORAGE_KEY);
    if (storedName && storedColor) {
      return { name: storedName, color: storedColor, colorLight: `${storedColor}33` };
    }
  } catch {
    /* localStorage may be unavailable (private mode, etc.) */
  }

  const info = generateUserInfo();
  try {
    localStorage.setItem(NAME_STORAGE_KEY, info.name);
    localStorage.setItem(COLOR_STORAGE_KEY, info.color);
  } catch {
    /* ignore persistence failures */
  }
  return info;
}

export interface YjsConnection {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  yText: Y.Text;
  userInfo: UserInfo;
  /** Update the local user's display name; broadcasts to peers and persists. */
  updateName: (name: string) => void;
  destroy: () => void;
}

export function createYjsConnection(roomId: string): YjsConnection {
  const wsUrl = import.meta.env['VITE_WS_URL'] as string | undefined ?? 'ws://localhost:4000';

  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider(wsUrl, roomId, ydoc);
  const yText = ydoc.getText('monaco');
  const userInfo = loadOrCreateUserInfo();

  provider.awareness.setLocalStateField('user', {
    name: userInfo.name,
    color: userInfo.color,
    colorLight: userInfo.colorLight,
  });

  const updateName = (name: string) => {
    const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) return;
    userInfo.name = trimmed;
    provider.awareness.setLocalStateField('user', {
      name: trimmed,
      color: userInfo.color,
      colorLight: userInfo.colorLight,
    });
    try {
      localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    } catch {
      /* ignore persistence failures */
    }
  };

  const destroy = () => {
    provider.awareness.setLocalState(null);
    provider.disconnect();
    provider.destroy();
    ydoc.destroy();
  };

  return { ydoc, provider, yText, userInfo, updateName, destroy };
}

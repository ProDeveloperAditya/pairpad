export type Language = 'python' | 'javascript' | 'cpp' | 'c' | 'java' | 'ruby' | 'go';

export interface LanguageOption {
  id: Language;
  label: string;
  /** Monaco's built-in language id for syntax highlighting. */
  monaco: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'c', label: 'C', monaco: 'c' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'ruby', label: 'Ruby', monaco: 'ruby' },
  // Go is supported by the backend but hidden here: `go run` needs more than
  // the 10s window on the current 1 GB host. Re-add when the backend moves to
  // a larger VM.
  // { id: 'go', label: 'Go', monaco: 'go' },
];

export function getMonacoLanguage(language: Language): string {
  return LANGUAGES.find((option) => option.id === language)?.monaco ?? 'plaintext';
}

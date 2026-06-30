import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';
import type { YjsConnection } from '../lib/yjsClient';
import { getMonacoLanguage, type Language } from '../lib/languages';
import { useTheme } from '../lib/theme';

interface EditorProps {
  language: Language;
  connection: YjsConnection | null;
}

export function Editor({ language, connection }: EditorProps) {
  const { theme } = useTheme();
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  function handleEditorDidMount(mountedEditor: editor.IStandaloneCodeEditor) {
    setEditorInstance(mountedEditor);
  }

  // Create or recreate binding when both editor and connection are available
  useEffect(() => {
    if (!editorInstance || !connection) return;

    const model = editorInstance.getModel();
    if (!model) return;

    // Destroy previous binding if any
    bindingRef.current?.destroy();

    bindingRef.current = new MonacoBinding(
      connection.yText,
      model,
      new Set([editorInstance]),
      connection.provider.awareness
    );

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [editorInstance, connection]);

  // y-monaco only tags each remote caret/selection with a per-client CSS class;
  // it does not apply colors or names. We inject a stylesheet derived from
  // awareness so every remote cursor shows its owner's color and name label.
  useEffect(() => {
    if (!connection) return;

    const awareness = connection.provider.awareness;
    const styleElement = document.createElement('style');
    document.head.appendChild(styleElement);

    const renderStyles = () => {
      let css = '';
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const user = state['user'] as { name?: string; color?: string } | undefined;
        if (!user?.color) return;

        const color = user.color;
        // Sanitize the name for safe injection into a CSS content string.
        const name = (user.name ?? 'Anonymous')
          .replace(/[\\"\n\r]/g, '')
          .slice(0, 24);

        css += `
          .yRemoteSelection-${clientId} { background-color: ${color}40; }
          .yRemoteSelectionHead-${clientId} { border-color: ${color}; }
          .yRemoteSelectionHead-${clientId}::after {
            content: "${name}";
            background-color: ${color};
          }
        `;
      });
      styleElement.textContent = css;
    };

    renderStyles();
    awareness.on('change', renderStyles);

    return () => {
      awareness.off('change', renderStyles);
      styleElement.remove();
    };
  }, [connection]);

  const monacoLanguage = getMonacoLanguage(language);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl">
      <MonacoEditor
        height="100%"
        language={monacoLanguage}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          wordWrap: 'on',
          tabSize: 4,
          insertSpaces: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface MonacoSqlEditorProps {
    value: string;
    onChange: (value: string) => void;
    onExecute?: () => void;
    schema?: {
        tables: Array<{
            name: string;
            columns: Array<{ name: string; type: string }>;
        }>;
    };
    height?: string;
}

export function MonacoSqlEditor({
    value,
    onChange,
    onExecute,
    schema,
    height = '300px',
}: MonacoSqlEditorProps) {
    const { theme } = useTheme();
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);

    // Register completion item provider when monaco and schema are available
    useEffect(() => {
        if (!monaco || !schema) return;

        const dispose = monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions: any[] = [];

                // Add table suggestions
                schema.tables.forEach((table) => {
                    suggestions.push({
                        label: table.name,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: table.name,
                        range,
                        detail: 'Table',
                    });

                    // Add column suggestions
                    table.columns.forEach((col) => {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            range,
                            detail: `${table.name} (${col.type})`,
                        });
                    });
                });

                // Add SQL keywords (basic list)
                const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'INSERT', 'UPDATE', 'DELETE', 'AND', 'OR', 'NOT', 'NULL'];
                keywords.forEach((kw) => {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        range,
                    });
                });

                return { suggestions };
            },
        });

        return () => dispose.dispose();
    }, [monaco, schema]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Add Keybinding for Ctrl+Enter to execute
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onExecute) {
                onExecute();
            }
        });

        // Add Keybinding for Format (Ctrl+Shift+F) - Placeholder for now
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            editor.getAction('editor.action.formatDocument')?.run();
        });
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <Editor
                height={height}
                language="sql"
                value={value}
                onChange={(value) => onChange(value || '')}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace', // Optional if you have this font
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    );
}

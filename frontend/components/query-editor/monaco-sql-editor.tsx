'use client';

import { useEffect, useRef } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { registerSQLLanguage, defineSQLTheme } from '../sql-editor/monaco-config';
import { createSQLCompletionProvider, TableSchema } from '../sql-editor/autocomplete';
import { formatSQL } from '@/lib/sql-formatter';
import { toast } from 'sonner';

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
    dialect?: 'postgresql' | 'mysql' | 'sqlite' | 'bigquery';
}

export function MonacoSqlEditor({
    value,
    onChange,
    onExecute,
    schema,
    height = '300px',
    dialect = 'postgresql',
}: MonacoSqlEditorProps) {
    const { theme } = useTheme();
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);

    // Register enhanced SQL language when monaco loads
    useEffect(() => {
        if (!monaco) return;

        // Register language and theme
        registerSQLLanguage(monaco);
        const themeName = defineSQLTheme(monaco, theme === 'dark');

        // Apply theme
        monaco.editor.setTheme(themeName);
    }, [monaco, theme]);

    // Register advanced autocomplete when schema changes
    useEffect(() => {
        if (!monaco || !schema) return;

        // Convert schema to TableSchema format
        const tableSchemas: TableSchema[] = schema.tables.map((table) => ({
            name: table.name,
            columns: table.columns.map((col) => ({
                name: col.name,
                type: col.type,
            })),
        }));

        // Register completion provider
        const disposable = monaco.languages.registerCompletionItemProvider(
            'sql',
            createSQLCompletionProvider(tableSchemas)
        );

        return () => disposable.dispose();
    }, [monaco, schema]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Keybinding: Ctrl+Enter to execute
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onExecute) {
                onExecute();
            }
        });

        // Keybinding: Ctrl+Shift+F to format SQL
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
            () => {
                try {
                    const currentValue = editor.getValue();
                    const formatted = formatSQL(currentValue, {
                        dialect,
                        keywordCase: 'upper',
                        tabWidth: 2,
                    });

                    // Set formatted value
                    editor.setValue(formatted);

                    // Update parent
                    onChange(formatted);

                    toast.success('SQL formatted successfully');
                } catch (error) {
                    toast.error('Failed to format SQL');
                    console.error('Format error:', error);
                }
            }
        );

        // Keybinding: Ctrl+/ to toggle line comment
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
            editor.getAction('editor.action.commentLine')?.run();
        });

        // Focus editor
        editor.focus();
    };

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <Editor
                height={height}
                language="sql"
                value={value}
                onChange={(value) => onChange(value || '')}
                theme={theme === 'dark' ? 'sql-dark' : 'sql-light'}
                options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    folding: true,
                    foldingStrategy: 'indentation',
                    suggest: {
                        showKeywords: true,
                        showSnippets: true,
                    },
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                    },
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    wordBasedSuggestions: 'off',
                    parameterHints: {
                        enabled: true,
                    },
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    );
}

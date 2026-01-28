'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Code,
  Sparkles,
  Search,
  Play,
  Save,
  Wand2,
  ChevronDown,
  History,
  Variable,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useQueryExecution } from '@/hooks/use-query-execution';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import { useAIQuery } from '@/hooks/use-ai-query';
import { useQueryHistory } from '@/hooks/use-query-history';
import {
  formatSQL,
  validateSQL,
  extractQueryVariables,
  replaceQueryVariables,
} from '@/lib/sql-utils';

import { MonacoSqlEditor } from '@/components/query-editor/monaco-sql-editor';
import { HistoryDialog } from '@/components/query-history/history-dialog';

import { AIModelSelector } from '@/components/ai-model-selector';
import { DEFAULT_AI_MODEL, AIModel } from '@/lib/ai/registry';

interface DualEngineEditorProps {
  onSchemaClick: () => void;
  onResultsUpdate?: (results: {
    data: any[];
    columns: string[];
    rowCount: number;
    executionTime: number;
    sql: string;
    aiPrompt?: string;
  }) => void;
  connectionId?: string;
  schema?: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string }>;
    }>;
  };
  onSaveSuccess?: (query: any) => void;
  mode?: 'default' | 'modal';
}

export function DualEngineEditor({
  onSchemaClick,
  onResultsUpdate,
  connectionId = 'db1',
  schema,
  onSaveSuccess,
  mode = 'default',
}: DualEngineEditorProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM orders LIMIT 10');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_AI_MODEL);
  const [queryName, setQueryName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [queryVariables, setQueryVariables] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { execute, isExecuting, error, data, columns, rowCount, executionTime } = useQueryExecution();
  const { saveQuery } = useSavedQueries();
  const { generateSQL, isGenerating, lastResult: aiResult } = useAIQuery({ connectionId, schema });
  const { addToHistory, getRecentQueries } = useQueryHistory();
  const recentQueries = getRecentQueries(5);

  // Extract variables from query
  const detectedVariables = extractQueryVariables(sqlQuery);

  // Validate SQL on change
  useEffect(() => {
    if (sqlQuery.trim()) {
      const validation = validateSQL(sqlQuery);
      setValidationError(validation.valid ? null : validation.error || null);
    } else {
      setValidationError(null);
    }
  }, [sqlQuery]);

  // Handle AI generation
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    const result = await generateSQL(aiPrompt, {
      modelId: selectedModel.id,
      providerId: selectedModel.providerId
    });
    if (result) {
      setSqlQuery(result.sql);
      setActiveTab('sql');
    }
  }, [aiPrompt, generateSQL, selectedModel]);

  // Handle SQL execution
  const handleExecute = useCallback(async () => {
    let queryToExecute = sqlQuery;

    // If variables detected, replace them
    if (detectedVariables.length > 0) {
      queryToExecute = replaceQueryVariables(sqlQuery, queryVariables);
    }

    const result = await execute({ sql: queryToExecute, connectionId });

    if (result.success && onResultsUpdate) {
      onResultsUpdate({
        data: result.data || [],
        columns: result.columns || [],
        rowCount: result.rowCount || 0,
        executionTime: result.executionTime || 0,
        sql: queryToExecute,
        aiPrompt: aiPrompt || undefined,
      });
    }

    // Add to history
    addToHistory(
      queryToExecute,
      connectionId,
      result.success ? 'success' : 'error',
      result.executionTime || 0,
      result.rowCount || 0,
      result.error || undefined,
      aiPrompt || undefined
    );
  }, [sqlQuery, connectionId, detectedVariables, queryVariables, execute, addToHistory, executionTime, rowCount, error, aiPrompt]);

  // Handle format SQL
  const handleFormat = useCallback(() => {
    setSqlQuery(formatSQL(sqlQuery));
  }, [sqlQuery]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }

    // Ctrl+Shift+F to format
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      handleFormat();
    }

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      setSqlQuery(value.substring(0, start) + '  ' + value.substring(end));

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  }, [handleExecute, handleFormat]);

  // Auto-complete suggestions
  const getAutoCompleteSuggestions = useCallback((cursorPosition: number): string[] => {
    if (!schema) return [];

    const textBeforeCursor = sqlQuery.substring(0, cursorPosition);
    const lastWord = textBeforeCursor.split(/\s+/).pop()?.toLowerCase() || '';

    // After FROM or JOIN, suggest table names
    if (/(?:from|join)\s*$/i.test(textBeforeCursor)) {
      return schema.tables.map((t) => t.name);
    }

    // After table name and dot, suggest column names
    const tableMatch = textBeforeCursor.match(/(\w+)\.\s*$/);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const table = schema.tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
      if (table) {
        return table.columns.map((c) => c.name);
      }
    }

    // Partial match for table/column names
    if (lastWord.length >= 2) {
      const suggestions: string[] = [];
      schema.tables.forEach((table) => {
        if (table.name.toLowerCase().includes(lastWord)) {
          suggestions.push(table.name);
        }
        table.columns.forEach((col) => {
          if (col.name.toLowerCase().includes(lastWord)) {
            suggestions.push(`${table.name}.${col.name}`);
          }
        });
      });
      return suggestions.slice(0, 10);
    }

    return [];
  }, [schema, sqlQuery]);

  return (
    <div className="bg-card">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border px-6 pt-4 flex items-center justify-between">
          <TabsList className="grid w-max grid-cols-2 bg-muted">
            <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai">
              <Sparkles className="w-4 h-4" />
              AI Prompt
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2" data-testid="tab-sql">
              <Code className="w-4 h-4" />
              SQL Editor
            </TabsTrigger>
          </TabsList>

          {/* Keyboard shortcuts hint */}
          {mode !== 'modal' && (
            <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> Execute</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift</kbd>+<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">F</kbd> Format</span>
            </div>
          )}
        </div>

        {/* AI Prompt Tab */}
        <TabsContent value="ai" className="m-0 p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Ask in Natural Language
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g., Show me top 5 customers by total sales last month"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1"
                data-testid="ai-prompt-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAIGenerate();
                  }
                }}
              />
              <div className="flex gap-2">
                <AIModelSelector
                  selectedModel={selectedModel}
                  onSelect={setSelectedModel}
                />
                <Button
                  className="gap-2"
                  disabled={isGenerating || !aiPrompt.trim()}
                  onClick={handleAIGenerate}
                  data-testid="ai-generate-button"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onSchemaClick}>
              <Search className="w-3 h-3 mr-1" />
              View Schema
            </Button>
            <Badge variant="outline" className="text-xs">
              AI will generate SQL automatically
            </Badge>
          </div>

          {/* AI Generated Result Preview */}
          {aiResult && (
            <div className="p-4 rounded-lg bg-muted border border-border space-y-2" data-testid="ai-result-preview">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Generated SQL</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round((aiResult.confidence || 0) * 100)}% confidence
                </Badge>
              </div>
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {aiResult.sql}
              </pre>
            </div>
          )}
        </TabsContent>

        {/* SQL Editor Tab */}
        <TabsContent value="sql" className="m-0 p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                SQL Query
              </label>

              {/* Query History Dialog */}
              <HistoryDialog
                onSelectQuery={(sql) => {
                  setSqlQuery(sql);
                  setActiveTab('sql');
                }}
              />
            </div>

            {/* SQL Editor */}
            <div className="relative" data-testid="sql-editor-container">
              <MonacoSqlEditor
                value={sqlQuery}
                onChange={setSqlQuery}
                onExecute={handleExecute}
                schema={schema}
                height="300px"
              />

              {/* Validation Error */}
              {validationError && (
                <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-amber-500">
                  <AlertCircle className="w-3 h-3" />
                  {validationError}
                </div>
              )}

              {/* Variables Badge */}
              {detectedVariables.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-4 gap-1 text-xs z-10"
                  onClick={() => setShowVariablesDialog(true)}
                >
                  <Variable className="w-3 h-3" />
                  {detectedVariables.length} variable{detectedVariables.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-center pt-2">
            <Button
              className="gap-2"
              disabled={isExecuting || !sqlQuery.trim()}
              onClick={handleExecute}
              data-testid="run-query-button"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isExecuting ? 'Executing...' : 'Run Query'}
            </Button>

            <Button variant="outline" size="sm" onClick={handleFormat}>
              <Wand2 className="w-3 h-3 mr-1" />
              Format
            </Button>

            <Button variant="outline" size="sm" onClick={onSchemaClick}>
              <Search className="w-3 h-3 mr-1" />
              Schema
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={!data || data.length === 0}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>

            <div className="flex-1" />

            {error && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </span>
            )}
            {executionTime > 0 && !error && (
              <span className="text-xs text-muted-foreground">
                ✓ {executionTime}ms • {rowCount} rows
              </span>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Query Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>
              Save this query for future use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queryName">Query Name</Label>
              <Input
                id="queryName"
                placeholder="e.g., Top Customers Analysis"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setQueryName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (queryName.trim()) {
                  const result = await saveQuery({
                    name: queryName,
                    sql: sqlQuery,
                    connectionId,
                    collectionId: 'default',
                    aiPrompt: aiPrompt || undefined,
                    userId: 'current_user',
                    tags: [],
                  });

                  if (result && result.success && onSaveSuccess) {
                    onSaveSuccess(result.data);
                  }

                  setShowSaveDialog(false);
                  setQueryName('');
                }
              }}
              disabled={!queryName.trim()}
            >
              Save Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Dialog */}
      <Dialog open={showVariablesDialog} onOpenChange={setShowVariablesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Query Variables</DialogTitle>
            <DialogDescription>
              Set values for the detected variables in your query
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {detectedVariables.map((varName) => (
              <div key={varName} className="space-y-2">
                <Label htmlFor={varName} className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {`{{${varName}}}`}
                  </code>
                </Label>
                <Input
                  id={varName}
                  placeholder={`Enter value for ${varName}...`}
                  value={queryVariables[varName] || ''}
                  onChange={(e) =>
                    setQueryVariables((prev) => ({
                      ...prev,
                      [varName]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVariablesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowVariablesDialog(false)}>
              Apply Variables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

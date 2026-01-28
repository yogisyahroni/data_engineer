'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Database, Key, Brain, Check, X, Plus as PlusIcon, Trash2, Edit, Save, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { toast } from 'sonner';
import { useConnections, DatabaseConnection } from '@/hooks/use-connections';

import { RLSManager } from '@/components/security/rls-manager';
import { DeveloperSettings } from '@/components/settings/developer-settings';
import { Terminal } from 'lucide-react';

const Plus = PlusIcon;

interface ConnectionFormData extends Partial<DatabaseConnection> {
  password?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('database');

  // -- Connections Logic --
  // Note: refreshConnections is an alias for fetchConnections exported from the hook
  const { connections, refreshConnections, deleteConnection, testConnection, createConnection, isLoading: isConnecting } = useConnections({ userId: 'user-1' });
  const [showAddDatabase, setShowAddDatabase] = useState(false);
  const [newDb, setNewDb] = useState<ConnectionFormData>({
    name: '',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: ''
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    refreshConnections();
  }, []);

  const handleTestConnection = async (conn: DatabaseConnection) => {
    setTestingId(conn.id);
    try {
      const res = await testConnection(conn.id);
      if (res.success) {
        toast.success('Connection successful');
      } else {
        toast.error('Connection failed: ' + res.message);
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      const res = await deleteConnection(id);
      if (res.success) {
        toast.success('Connection deleted');
      } else {
        toast.error('Failed to delete: ' + res.error);
      }
    }
  };

  const handleAddDatabase = async () => {
    if (!newDb.name || !newDb.host || !newDb.database) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload: any = {
      name: newDb.name,
      type: newDb.type,
      host: newDb.host,
      port: Number(newDb.port),
      database: newDb.database,
      username: newDb.username,
      password: newDb.password,
      userId: 'user-1'
    };

    const res = await createConnection(payload);
    if (res.success) {
      toast.success('Connection created successfully');
      setShowAddDatabase(false);
      setNewDb({
        name: '',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: ''
      });
    } else {
      toast.error('Failed to create connection: ' + res.error);
    }
  };

  // -- AI Logic --
  const [aiConfig, setAiConfig] = useState({ provider: 'openai', apiKey: '' });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings?key=ai_config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAiConfig(data.data);
        }
      });
  }, []);

  const handleSaveAI = async () => {
    setAiLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'ai_config',
          value: aiConfig
        })
      });
      toast.success('AI Configuration saved');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">Configure database, AI providers, and security</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted w-full justify-start">
            <TabsTrigger value="database" className="gap-2">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-2">
              <Brain className="w-4 h-4" />
              AI Providers
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Key className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="developer" className="gap-2">
              <Terminal className="w-4 h-4" />
              Developer
            </TabsTrigger>
          </TabsList>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Database Connections</h2>
              <div className="space-y-4">
                {connections.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No databases connected yet. Add a connection to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  connections.map((db) => (
                    <Card key={db.id} className="p-6 border border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Database className="w-5 h-5 text-primary" />
                            <div>
                              <h3 className="font-semibold text-foreground">{db.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {db.type.toUpperCase()} • {db.host}:{db.port} • {db.database}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge variant={db.isActive ? 'default' : 'secondary'}>
                          {db.isActive ? 'Active' : 'Configured'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Updated: {new Date(db.updatedAt).toLocaleString()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(db)}
                          disabled={testingId === db.id}
                        >
                          {testingId === db.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          Test Connection
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteConnection(db.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {!showAddDatabase && (
                <Button className="mt-6 gap-2" onClick={() => setShowAddDatabase(true)}>
                  <Plus className="w-4 h-4" />
                  Add Database Connection
                </Button>
              )}

              {showAddDatabase && (
                <Card className="mt-6 p-6 border border-border space-y-4">
                  <h3 className="font-semibold text-foreground">New Database Connection</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Database Name</Label>
                      <Input
                        placeholder="My Database"
                        value={newDb.name || ''}
                        onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={newDb.type} onValueChange={(value) => setNewDb({ ...newDb, type: value as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="postgres">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL (Coming Soon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Host</Label>
                      <Input
                        placeholder="localhost"
                        value={newDb.host || ''}
                        onChange={(e) => setNewDb({ ...newDb, host: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        placeholder="5432"
                        value={newDb.port}
                        onChange={(e) => setNewDb({ ...newDb, port: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Database</Label>
                      <Input
                        placeholder="database_name"
                        value={newDb.database || ''}
                        onChange={(e) => setNewDb({ ...newDb, database: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="username"
                        value={newDb.username || ''}
                        onChange={(e) => setNewDb({ ...newDb, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="password"
                        value={newDb.password || ''}
                        onChange={(e) => setNewDb({ ...newDb, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddDatabase} disabled={isConnecting}>
                      {isConnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                      Save Connection
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddDatabase(false)}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">AI Provider Configuration</h2>

              <Alert className="mb-6 border-primary/30 bg-primary/5">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  Connect your preferred AI providers to enable natural language querying and smart suggestions.
                </AlertDescription>
              </Alert>

              <Card className="p-6 border border-border">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={aiConfig.provider} onValueChange={(val) => setAiConfig({ ...aiConfig, provider: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">Keys are stored securely encrypted.</p>
                  </div>
                  <Button onClick={handleSaveAI} disabled={aiLoading}>
                    {aiLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-4">Security & Permissions</h2>

              <Card className="p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-3">Data Encryption</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All API keys and credentials are encrypted with AES-256 encryption at rest.
                </p>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              </Card>

              {/* RLS Manager - Connected to Real API */}
              <RLSManager />
            </div>
          </TabsContent>
          {/* Developer Tab */}
          <TabsContent value="developer">
            <DeveloperSettings />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

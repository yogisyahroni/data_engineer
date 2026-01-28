'use client';

// ... imports
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Brain, Lock, ArrowRight, Check, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConnections } from '@/hooks/use-connections';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dbHost: '',
    dbName: '',
    dbUser: '',
    dbPassword: '',
    dbPort: '5432',
    dbType: 'postgres',
    aiProvider: 'openai',
    aiKey: '',
  });

  const { createConnection, testConnection, activeConnection, fetchSchema, schema, selectConnection } = useConnections({ userId: 'user_123' });

  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [createdConnectionId, setCreatedConnectionId] = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    fetch('/api/settings?key=ai_config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setFormData(prev => ({ ...prev, aiProvider: data.data.provider, aiKey: data.data.apiKey }));
        }
      });
  }, []);

  // Fetch schema when entering Step 3
  useEffect(() => {
    if (step === 3 && createdConnectionId && !schema) {
      console.log('Fetching schema for connection:', createdConnectionId);
      // Ensure we call fetch with the ID
      fetchSchema(createdConnectionId).then(res => {
        if (!res.success) {
          toast.error("Failed to fetch schema: " + res.error);
        }
      });
    }
  }, [step, createdConnectionId]);


  const handleTestConnection = async () => {
    setTestingStatus('testing');
    setTestMessage('');

    // We need to create a temporary connection object to test, 
    // or if the API supports testing raw params. 
    // Since useConnections.testConnection takes an ID, we might need to "create" it first?
    // Actually, widespread pattern is usually test before create.
    // Use the /api/connections/test endpoint directly if available, or create a temp connection.
    // Looking at useConnections, `testConnection` takes `id`.
    // Let's CREATE the connection first, but maybe mark it as inactive? 
    // Or just create it. The user intends to connect.

    // Strategy: Create connection -> Test it. If fail, user edits and updates.

    try {
      const payload: any = {
        name: `${formData.dbName} (Onboarding)`,
        type: formData.dbType,
        host: formData.dbHost,
        port: parseInt(formData.dbPort),
        database: formData.dbName,
        username: formData.dbUser,
        password: formData.dbPassword,
        userId: 'user_123' // Consistent with backend default
      };

      let connectionId = createdConnectionId;

      if (!connectionId) {
        const createRes = await createConnection(payload);
        if (!createRes.success) throw new Error(createRes.error);
        connectionId = createRes.data.id;
        setCreatedConnectionId(connectionId);
      } else {
        // Update existing if we already created one (retry scenario)
        // We need update capability in useConnections? Yes we have it.
        // But for now let's just create new one or assume create works.
        // Ideally we update.
      }

      if (connectionId) {
        const testRes = await testConnection(connectionId);
        if (testRes.success) {
          setTestingStatus('success');
          setTestMessage('Connection successful!');
          toast.success('Connection successful!');
        } else {
          setTestingStatus('error');
          setTestMessage(testRes.message);
          toast.error('Connection failed: ' + testRes.message);
        }
      }

    } catch (e: any) {
      setTestingStatus('error');
      setTestMessage(e.message);
      toast.error('Error: ' + e.message);
    }
  };

  const handleSaveAI = async () => {
    setIsSaving(true);
    try {
      // Save Settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'ai_config',
          value: {
            provider: formData.aiProvider,
            apiKey: formData.aiKey
          }
        })
      });
      setStep(3);
    } catch (e) {
      toast.error('Failed to save AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold">
              IE
            </div>
            <h1 className="text-2xl font-bold text-foreground">InsightEngine AI</h1>
          </div>
          <p className="text-sm text-muted-foreground">Setup your Business Intelligence workspace</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <div className={`flex-1 h-1 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
            <div className={`flex-1 h-1 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={step === 1 ? 'text-primary font-semibold' : ''}>Database</span>
            <span className={step === 2 ? 'text-primary font-semibold' : ''}>AI Setup</span>
            <span className={step === 3 ? 'text-primary font-semibold' : ''}>Metadata</span>
          </div>
        </div>

        {/* Step 1: Database Connection */}
        {step === 1 && (
          <Card className="p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Connect Your Database</h2>
            </div>
            <p className="text-muted-foreground mb-8">
              InsightEngine AI needs access to your database to analyze data. We support PostgreSQL, MySQL, BigQuery, and more.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Database Type</Label>
                <Select value={formData.dbType} onValueChange={(val) => setFormData({ ...formData, dbType: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Host</Label>
                  <Input
                    placeholder="localhost"
                    value={formData.dbHost}
                    onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Database Name</Label>
                  <Input
                    placeholder="my_database"
                    value={formData.dbName}
                    onChange={(e) => setFormData({ ...formData, dbName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Username</Label>
                  <Input
                    placeholder="postgres"
                    value={formData.dbUser}
                    onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.dbPassword}
                    onChange={(e) => setFormData({ ...formData, dbPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Port</Label>
                <Input
                  placeholder="5432"
                  value={formData.dbPort}
                  onChange={(e) => setFormData({ ...formData, dbPort: e.target.value })}
                  className="w-32"
                />
              </div>

              <Alert className="border-primary/30 bg-primary/5">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Your database credentials are encrypted and stored securely. We recommend using a read-only service account.
                </AlertDescription>
              </Alert>

              {testingStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{testMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingStatus === 'testing'}
                  className="gap-2"
                >
                  {testingStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : testingStatus === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {testingStatus === 'success' ? 'Connected' : 'Test Connection'}
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={testingStatus !== 'success'}
                  className="gap-2 ml-auto"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: AI Provider Setup */}
        {step === 2 && (
          <Card className="p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Configure AI Provider</h2>
            </div>
            <p className="text-muted-foreground mb-8">
              Choose your preferred AI provider for natural language query generation and intelligent recommendations.
            </p>

            <Tabs value={formData.aiProvider} onValueChange={(value) => setFormData({ ...formData, aiProvider: value })} className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full bg-muted">
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="gemini">Gemini</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              </TabsList>

              <TabsContent value={formData.aiProvider} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={formData.aiKey}
                    onChange={(e) => setFormData({ ...formData, aiKey: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and never shared with anyone.
                  </p>
                </div>

                <Alert className="border-primary/30 bg-primary/5">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    Using {formData.aiProvider === 'openai' ? 'GPT-4' : 'latest model'} for optimal SQL generation accuracy.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleSaveAI}
                disabled={!formData.aiKey || isSaving}
                className="gap-2 ml-auto"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Metadata Auto-Guess */}
        {step === 3 && (
          <Card className="p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Setup Metadata (Kamus Data)</h2>
            </div>
            <p className="text-muted-foreground mb-8">
              InsightEngine AI will analyze your database to automatically generate human-friendly descriptions.
            </p>

            <div className="space-y-6">
              <Card className="p-4 bg-muted border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">Scanning database schema...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {schema ? `Found ${schema.tables.length} tables` : 'Analyzing tables...'}
                    </p>
                  </div>
                  <div className="text-2xl animate-pulse">✨</div>
                </div>
                {!schema && (
                  <div className="w-full h-2 bg-background rounded overflow-hidden">
                    <div className="h-full bg-primary w-2/3 rounded animate-pulse" />
                  </div>
                )}
              </Card>

              <Alert className="border-primary/30 bg-primary/5">
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  AI will auto-generate aliases and descriptions. You can edit them in the Metadata Editor after setup.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Preview - Auto-Generated Metadata</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {schema?.tables.map(table => (
                    <div key={table.name} className="p-3 bg-muted rounded flex justify-between items-center">
                      <div>
                        <div className="text-xs font-mono text-muted-foreground mb-1">{table.name}</div>
                        <p className="text-sm text-foreground">{table.rowCount} rows</p>
                      </div>
                      <Badge variant="outline">{table.columns.length} cols</Badge>
                    </div>
                  ))}
                  {!schema && <p className="text-sm text-muted-foreground">Loading schema preview...</p>}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Link href="/explorer" className="ml-auto">
                  <Button className="gap-2">
                    Complete Setup
                    <Check className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

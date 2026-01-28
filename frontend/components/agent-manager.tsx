
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Mail, Play, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Agent {
    id: number;
    name: string;
    schedule: string;
    lastRun: string;
    status: 'ACTIVE' | 'PAUSED';
}

// Mock Data for MVP - Ideally fetched from /api/agents
const MOCK_AGENTS: Agent[] = [
    { id: 101, name: "Daily Sales Briefing", schedule: "Daily @ 8 AM", lastRun: "Yesterday", status: 'ACTIVE' }
];

export function AgentManager() {
    const [isRunning, setIsRunning] = useState(false);

    const handleRunAgents = async () => {
        setIsRunning(true);
        try {
            // Call the secure scheduler endpoint manually
            // In product, this would be a "Test Run" button
            const res = await fetch('/api/scheduler/run-agents', {
                headers: {
                    'x-cron-secret': 'schedule_secret_123' // Hardcoded for Demo UI
                }
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Agents triggered successfully! Check secure server logs for "Emails".');
                // Simulate receiving the email content for demo 
                // in real app, we'd fetch the latest audit log
                toast.message('📩 Email Sent to CEO', {
                    description: "Subject: Daily Sales Briefing... (See Console)",
                    duration: 5000,
                });
            } else {
                toast.error('Failed to run agents: ' + data.error);
            }

        } catch (err) {
            console.error(err);
            toast.error('Connection error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    AI Agent Manager
                </CardTitle>
                <Badge variant="outline" className="text-green-600 bg-green-50">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Pro Feature
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border space-y-3">
                    {MOCK_AGENTS.map(agent => (
                        <div key={agent.id} className="flex items-center justify-between p-3 bg-white rounded shadow-sm border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{agent.name}</h4>
                                    <p className="text-xs text-muted-foreground">{agent.schedule} • Last run: {agent.lastRun}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    {agent.status}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRunAgents}
                                    disabled={isRunning}
                                >
                                    {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                                    Test Run
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-xs text-muted-foreground text-center">
                    Agents run automatically via Server Cron. Use "Test Run" to force execution.
                </div>
            </CardContent>
        </Card>
    );
}

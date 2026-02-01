import { SchedulerManager } from '@/components/notifications';

export const metadata = {
    title: 'Scheduler Management | InsightEngine AI',
    description: 'Manage scheduled jobs and cron tasks',
};

export default function SchedulerPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Scheduler Management</h1>
                <p className="text-muted-foreground mt-2">
                    Create and manage scheduled jobs, cron tasks, and automated workflows
                </p>
            </div>
            <SchedulerManager />
        </div>
    );
}

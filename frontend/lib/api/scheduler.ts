import type {
    SchedulerJob,
    SchedulerJobsResponse,
    CreateSchedulerJobInput,
    UpdateSchedulerJobInput,
} from '@/lib/types/notifications';

const API_BASE = '/api/v1';

export const schedulerApi = {
    // List all jobs
    listJobs: async (): Promise<SchedulerJob[]> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch jobs');
        }
        const data: SchedulerJobsResponse = await res.json();
        return data.jobs || [];
    },

    // Get job details
    getJob: async (id: string): Promise<SchedulerJob> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch job');
        }
        return res.json();
    },

    // Create job (admin only)
    createJob: async (data: CreateSchedulerJobInput): Promise<SchedulerJob> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create job');
        }
        return res.json();
    },

    // Update job (admin only)
    updateJob: async (id: string, data: UpdateSchedulerJobInput): Promise<SchedulerJob> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update job');
        }
        return res.json();
    },

    // Delete job (admin only)
    deleteJob: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete job');
        }
        return res.json();
    },

    // Pause job
    pauseJob: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}/pause`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to pause job');
        }
        return res.json();
    },

    // Resume job
    resumeJob: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}/resume`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to resume job');
        }
        return res.json();
    },

    // Trigger job manually
    triggerJob: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/scheduler/jobs/${id}/trigger`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to trigger job');
        }
        return res.json();
    },
};

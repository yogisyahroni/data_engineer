import { dashboardRepo } from '@/lib/repositories/dashboard-repo';

export class DashboardService {
    async createDashboard(userId: string, data: any) {
        return dashboardRepo.create({
            ...data,
            userId,
        } as any);
    }

    async getDashboards(userId: string) {
        return dashboardRepo.findAllByUserId(userId);
    }

    async getDashboard(id: string) {
        return dashboardRepo.findById(id);
    }

    async updateDashboard(id: string, data: any) {
        return dashboardRepo.update(id, data);
    }

    async deleteDashboard(id: string) {
        return dashboardRepo.delete(id);
    }
}

export const dashboardService = new DashboardService();

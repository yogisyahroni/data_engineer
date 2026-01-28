import { db } from '@/lib/db';
import { Prisma, Dashboard } from '@prisma/client';

export class DashboardRepository {
    async create(data: Prisma.DashboardUncheckedCreateInput): Promise<Dashboard> {
        return db.dashboard.create({
            data,
        });
    }

    async findById(id: string): Promise<Dashboard | null> {
        return db.dashboard.findUnique({
            where: { id },
            include: {
                cards: {
                    include: {
                        query: true
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });
    }

    async findAllByUserId(userId: string): Promise<Dashboard[]> {
        return db.dashboard.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, data: Prisma.DashboardUpdateInput): Promise<Dashboard> {
        return db.dashboard.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Dashboard> {
        return db.dashboard.delete({
            where: { id },
        });
    }

    async updateLayout(dashboardId: string, cards: any[]): Promise<Dashboard> {
        // Transactional update:
        // 1. Delete existing cards (simplest strategy for layout sync)
        // 2. Create new cards

        return db.$transaction(async (tx) => {
            // Delete all cards for this dashboard
            await tx.dashboardCard.deleteMany({
                where: { dashboardId }
            });

            // Re-create cards
            // @ts-ignore - Prisma client not regenerated yet for new fields
            await Promise.all(cards.map(card => {
                return tx.dashboardCard.create({
                    data: {
                        dashboardId,
                        type: card.type || 'visualization',
                        title: card.title,
                        textContent: card.textContent,
                        queryId: card.queryId,
                        position: card.position,
                        visualizationConfig: card.visualizationConfig
                    }
                });
            }));

            // @ts-ignore - Prisma client include types outdated
            return tx.dashboard.findUniqueOrThrow({
                where: { id: dashboardId },
                include: { cards: { include: { query: true } } }
            });
        });
    }
}

export const dashboardRepo = new DashboardRepository();

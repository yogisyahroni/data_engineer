import { db } from '@/lib/db';
import { Prisma, SavedQuery } from '@prisma/client';

export class QueryRepository {
    async create(data: Prisma.SavedQueryUncheckedCreateInput): Promise<SavedQuery> {
        return db.savedQuery.create({
            data,
        });
    }

    async findById(id: string): Promise<SavedQuery | null> {
        return db.savedQuery.findUnique({
            where: { id },
            include: {
                connection: true,
                collection: true,
            }
        });
    }

    async findAllByUserId(userId: string): Promise<SavedQuery[]> {
        return db.savedQuery.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                connection: true,
            }
        });
    }

    async update(id: string, data: Prisma.SavedQueryUpdateInput): Promise<SavedQuery> {
        return db.savedQuery.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<SavedQuery> {
        return db.savedQuery.delete({
            where: { id },
        });
    }
}

export const queryRepo = new QueryRepository();

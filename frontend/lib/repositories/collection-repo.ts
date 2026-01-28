import { db } from '@/lib/db';
import { Prisma, Collection } from '@prisma/client';

export class CollectionRepository {
    async create(data: Prisma.CollectionUncheckedCreateInput): Promise<Collection> {
        return db.collection.create({
            data,
        });
    }

    async findAllByUserId(userId: string): Promise<Collection[]> {
        return db.collection.findMany({
            where: { userId },
            include: {
                children: true,
                queries: true,
                dashboards: true
            }
        });
    }

    async findById(id: string): Promise<Collection | null> {
        return db.collection.findUnique({
            where: { id },
            include: {
                children: true,
                queries: true
            }
        });
    }

    async update(id: string, data: Prisma.CollectionUpdateInput): Promise<Collection> {
        return db.collection.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Collection> {
        return db.collection.delete({
            where: { id },
        });
    }
}

export const collectionRepo = new CollectionRepository();

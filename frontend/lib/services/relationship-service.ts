import { db } from '@/lib/db';

export interface CreateRelationshipInput {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    connectionId: string;
    userId: string;
}

export class RelationshipService {
    static async createRelationship(data: CreateRelationshipInput) {
        return await db.virtualRelationship.create({
            data: {
                fromTable: data.fromTable,
                fromColumn: data.fromColumn,
                toTable: data.toTable,
                toColumn: data.toColumn,
                type: data.type,
                connectionId: data.connectionId,
                userId: data.userId,
            }
        });
    }

    static async getRelationships(connectionId: string) {
        return await db.virtualRelationship.findMany({
            where: { connectionId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async deleteRelationship(id: string) {
        return await db.virtualRelationship.delete({
            where: { id }
        });
    }
}

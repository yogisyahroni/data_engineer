import { db } from '@/lib/db';
import { Prisma, Connection } from '@prisma/client';

export class ConnectionRepository {
    async create(data: Prisma.ConnectionCreateInput): Promise<Connection> {
        return db.connection.create({
            data,
        });
    }

    async findById(id: string): Promise<Connection | null> {
        return db.connection.findUnique({
            where: { id },
        });
    }

    async findAllByUserId(userId: string): Promise<Connection[]> {
        return db.connection.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(id: string, data: Prisma.ConnectionUpdateInput): Promise<Connection> {
        return db.connection.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Connection> {
        return db.connection.delete({
            where: { id },
        });
    }
}

export const connectionRepo = new ConnectionRepository();

import { db } from '@/lib/db';

export interface VirtualRelationship {
    id?: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
}

export class SemanticLayerService {
    /**
     * Retrieves all virtual relationships defined for a connection.
     * NOW BACKED BY PRISMA DATABASE (not hardcoded)
     */
    static async getVirtualRelationships(connectionId: string): Promise<VirtualRelationship[]> {
        const relationships = await db.virtualRelationship.findMany({
            where: { connectionId }
        });

        return relationships.map(r => ({
            id: r.id,
            fromTable: r.fromTable,
            fromColumn: r.fromColumn,
            toTable: r.toTable,
            toColumn: r.toColumn,
            type: r.type as 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY'
        }));
    }

    /**
     * Create a new virtual relationship
     */
    static async createRelationship(data: {
        connectionId: string;
        userId: string;
        fromTable: string;
        fromColumn: string;
        toTable: string;
        toColumn: string;
        type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
    }) {
        return await db.virtualRelationship.create({
            data
        });
    }

    /**
     * Delete a virtual relationship
     */
    static async deleteRelationship(id: string) {
        return await db.virtualRelationship.delete({
            where: { id }
        });
    }

    /**
     * Injects semantic metadata into the AI prompt for multi-table awareness.
     */
    static async getSemanticContext(connectionId: string): Promise<string> {
        const relationships = await this.getVirtualRelationships(connectionId);

        if (relationships.length === 0) {
            return '';
        }

        let context = "\n\n### SEMANTIC LAYER (Virtual Relationships)\n";
        relationships.forEach(rel => {
            const relType = rel.type.toLowerCase().replace('_', '-');
            context += `- [${rel.fromTable}].${rel.fromColumn} relates to [${rel.toTable}].${rel.toColumn} (${relType})\n`;
        });

        context += "\nUse these relationships to perform JOINs when the user asks cross-table questions.";
        return context;
    }
}

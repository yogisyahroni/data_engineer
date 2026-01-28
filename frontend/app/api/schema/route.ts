import { type NextRequest, NextResponse } from 'next/server';
import { type TableSchema } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: 'connectionId is required' },
        { status: 400 }
      );
    }

    // TODO: Query database to get actual schema
    // For now, return mock schema data
    const mockSchema: TableSchema[] = [
      {
        id: 'tbl1',
        name: 'orders',
        connectionId,
        description: 'Customer orders table',
        rowCount: 45230,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true },
          { name: 'customer_id', type: 'INTEGER', nullable: false, isPrimary: false },
          { name: 'order_date', type: 'TIMESTAMP', nullable: false, isPrimary: false },
          { name: 'amount', type: 'DECIMAL', nullable: false, isPrimary: false },
          { name: 'status', type: 'VARCHAR', nullable: true, isPrimary: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimary: false },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tbl2',
        name: 'customers',
        connectionId,
        description: 'Customer information',
        rowCount: 8932,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true },
          { name: 'name', type: 'VARCHAR', nullable: false, isPrimary: false },
          { name: 'email', type: 'VARCHAR', nullable: false, isPrimary: false },
          { name: 'phone', type: 'VARCHAR', nullable: true, isPrimary: false },
          { name: 'country', type: 'VARCHAR', nullable: true, isPrimary: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimary: false },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tbl3',
        name: 'products',
        connectionId,
        description: 'Product catalog',
        rowCount: 2134,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true },
          { name: 'name', type: 'VARCHAR', nullable: false, isPrimary: false },
          { name: 'category', type: 'VARCHAR', nullable: false, isPrimary: false },
          { name: 'price', type: 'DECIMAL', nullable: false, isPrimary: false },
          { name: 'stock', type: 'INTEGER', nullable: false, isPrimary: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimary: false },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    console.log('[v0] Schema fetched for connection:', connectionId, 'Tables:', mockSchema.length);

    return NextResponse.json({
      success: true,
      data: mockSchema,
      count: mockSchema.length,
    });
  } catch (error) {
    console.error('[v0] Error fetching schema:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schema' },
      { status: 500 }
    );
  }
}

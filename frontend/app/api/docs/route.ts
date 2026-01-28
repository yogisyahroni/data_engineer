import { NextResponse } from 'next/server';

const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'InsightEngine API',
        version: '1.0.0',
        description: 'Programmatic access to InsightEngine analytics and query execution.'
    },
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'Use your API Key prefixed with sk_'
            }
        }
    },
    security: [
        { ApiKeyAuth: [] }
    ],
    paths: {
        '/api/queries/execute': {
            post: {
                summary: 'Execute a SQL Query',
                description: 'Run a raw SQL query against a connected database.',
                tags: ['Queries'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    sql: { type: 'string', example: 'SELECT * FROM users LIMIT 10' },
                                    connectionId: { type: 'string', example: 'conn_123' }
                                },
                                required: ['sql', 'connectionId']
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Query results',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'array', items: { type: 'object' } },
                                        rowCount: { type: 'integer' },
                                        executionTime: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/queries/saved': {
            get: {
                summary: 'List Saved Queries',
                description: 'Retrieve a list of queries saved in the workspace.',
                tags: ['Queries'],
                responses: {
                    200: {
                        description: 'List of saved queries',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        queries: { type: 'array', items: { type: 'object' } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

export async function GET() {
    return NextResponse.json(openApiSpec);
}

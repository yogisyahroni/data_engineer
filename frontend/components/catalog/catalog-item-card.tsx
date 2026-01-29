import Link from 'next/link';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './status-badge';
import { SavedQuery, BusinessMetric } from '@/lib/types';
import { Database, Calculator, Calendar, Eye, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CatalogItemCardProps {
    item: SavedQuery | BusinessMetric;
    type: 'query' | 'metric';
}

export function CatalogItemCard({ item, type }: CatalogItemCardProps) {
    const isQuery = type === 'query';
    const href = isQuery ? `/saved-queries?id=${item.id}` : `/catalog/metric/${item.id}`;

    // Cast to specific type to access specific fields safely if needed, 
    // though basic fields overlap (name, description, tags).
    const query = isQuery ? (item as SavedQuery) : null;
    const metric = !isQuery ? (item as BusinessMetric) : null;

    const status = isQuery
        ? query?.certificationStatus
        : metric?.status;

    return (
        <Link href={href} className="block group h-full">
            <Card className="h-full flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            {isQuery ? <Database className="w-3.5 h-3.5" /> : <Calculator className="w-3.5 h-3.5" />}
                            <span className="capitalize">{type}</span>
                        </div>
                        <StatusBadge status={status || 'draft'} />
                    </div>
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {item.name}
                    </h3>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {item.description || "No description provided."}
                    </p>

                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {item.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                    {tag}
                                </Badge>
                            ))}
                            {item.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground self-center">
                                    +{item.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-0 text-xs text-muted-foreground flex items-center justify-between border-t border-border/50 mt-auto p-4 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1" title="Last Updated">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                        </div>
                        {isQuery && (
                            <div className="flex items-center gap-1" title={`${query?.views || 0} views`}>
                                <Eye className="w-3 h-3" />
                                {query?.views || 0}
                            </div>
                        )}
                    </div>

                    {(query?.certifiedBy || metric?.ownerId) && (
                        <div className="flex items-center gap-1" title="Owner/Certifier">
                            <UserIcon className="w-3 h-3" />
                            <span className="max-w-[80px] truncate">
                                {/* Ideally resolve ID to Name, for now just placeholder or ID */}
                                User
                            </span>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}

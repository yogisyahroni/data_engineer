'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const METADATA_ENTRIES = [
  {
    id: 1,
    tableName: 'customers',
    alias: 'Customers',
    description: 'Customer master data with demographics',
    columns: [
      { name: 'customer_id', alias: 'ID', type: 'PK', tags: ['PK'] },
      { name: 'full_name', alias: 'Name', type: 'VARCHAR', tags: [] },
      { name: 'email', alias: 'Email', type: 'VARCHAR', tags: ['PII'] },
    ]
  },
  {
    id: 2,
    tableName: 'orders',
    alias: 'Sales Orders',
    description: 'Transaction records from e-commerce platform',
    columns: [
      { name: 'order_id', alias: 'Order ID', type: 'PK', tags: ['PK'] },
      { name: 'amount', alias: 'Total Amount', type: 'DECIMAL', tags: ['Currency'] },
      { name: 'order_date', alias: 'Date', type: 'TIMESTAMP', tags: ['Temporal'] },
    ]
  },
  {
    id: 3,
    tableName: 'products',
    alias: 'Product Catalog',
    description: 'Product information and inventory',
    columns: [
      { name: 'product_id', alias: 'Product ID', type: 'PK', tags: ['PK'] },
      { name: 'category', alias: 'Category', type: 'VARCHAR', tags: [] },
    ]
  },
];

export default function MetadataPage() {
  const [metadata, setMetadata] = useState(METADATA_ENTRIES);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({ ...entry });
  };

  const handleSave = () => {
    if (editingId && editForm) {
      setMetadata(metadata.map(m => m.id === editingId ? editForm : m));
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Metadata Editor</h1>
              <p className="text-muted-foreground mt-1">Kamus Data - Configure business meanings for columns</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-muted-foreground">{metadata.length} tables configured</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Sparkles className="w-4 h-4" />
              Auto-Guess Metadata
            </Button>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid gap-6">
          {metadata.map((entry) => (
            <Card key={entry.id} className="p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-foreground">{entry.alias}</h3>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                      {entry.tableName}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editingId === entry.id} onOpenChange={(open) => {
                    if (!open) setEditingId(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-transparent"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Metadata - {entry.alias}</DialogTitle>
                        <DialogDescription>
                          Update table alias, description, and column mappings
                        </DialogDescription>
                      </DialogHeader>
                      {editForm && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Table Alias</label>
                            <Input
                              value={editForm.alias}
                              onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                              placeholder="Friendly name..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="What does this table contain?"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Columns</label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {editForm.columns.map((col: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-start p-3 bg-muted rounded">
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-muted-foreground">{col.name}</div>
                                    <Input
                                      value={col.alias}
                                      onChange={(e) => {
                                        const newCols = [...editForm.columns];
                                        newCols[idx].alias = e.target.value;
                                        setEditForm({ ...editForm, columns: newCols });
                                      }}
                                      placeholder="Column alias..."
                                      size={undefined}
                                      className="mt-1 text-xs h-8"
                                    />
                                  </div>
                                  {col.tags.length > 0 && (
                                    <div className="flex gap-1">
                                      {col.tags.map((tag: string) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive bg-transparent">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Columns Preview */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Columns ({entry.columns.length})</p>
                <div className="flex flex-wrap gap-2">
                  {entry.columns.map((col) => (
                    <div key={col.name} className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                      <code className="text-xs font-mono text-muted-foreground">{col.name}</code>
                      {col.tags.length > 0 && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {col.tags[0]}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

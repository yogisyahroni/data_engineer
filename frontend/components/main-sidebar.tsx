'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Plus,
  BarChart3,
  FolderOpen,
  Settings,
  LogOut,
  Zap,
  Search,
  Home,
  BookOpen,
  Database,
  Upload,
} from 'lucide-react';
import { useDatabase } from '@/contexts/database-context';
import { ModeToggle } from '@/components/mode-toggle';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MainSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { databases, selectedDatabase, setSelectedDatabase } = useDatabase();
  const [showDatabases, setShowDatabases] = useState(true);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const params = useParams();
  const workspaceId = params?.workspaceId as string;

  const navItems = [
    { icon: Zap, label: 'Query Editor', href: workspaceId ? `/workspace/${workspaceId}` : '/' },
    { icon: Database, label: 'Connections', href: '/connections' },
    { icon: BookOpen, label: 'Modeling', href: '/modeling' },
    { icon: Upload, label: 'Upload Data', href: '/ingest' },
    { icon: Search, label: 'Explorer', href: '/explorer' },
    { icon: BarChart3, label: 'Dashboards', href: '/dashboards' },
    { icon: FolderOpen, label: 'Collections', href: '/saved-queries' },
    // Only show Lineage if inside a workspace
    ...(workspaceId ? [{ icon: Boxes, label: 'Lineage', href: `/workspace/${workspaceId}/pipelines/lineage` }] : []),
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Logo Section */}
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm shadow-primary/20">
              ⚡
            </div>
            <span className="font-bold text-sidebar-foreground tracking-tight">InsightEngine</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.label} href={item.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 transition-all duration-200 ${active
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  onClick={() => onClose()}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Databases Section */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-2 bg-sidebar/50">
          <button
            onClick={() => setShowDatabases(!showDatabases)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Databases</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${showDatabases ? '' : '-rotate-90'
                }`}
            />
          </button>

          {showDatabases && (
            <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
              {databases.map((db) => {
                const isSelected = selectedDatabase?.id === db.id;
                return (
                  <button
                    key={db.id}
                    onClick={() => setSelectedDatabase(db)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all group ${isSelected
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ring-2 ring-background transition-colors ${db.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
                          }`}
                      />
                      <span className="truncate">{db.name}</span>
                    </div>
                  </button>
                );
              })}

              <Link href="/connections" onClick={() => onClose()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground gap-2 text-xs hover:bg-muted"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Database
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer: Settings, Theme, Logout */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-1 bg-sidebar">
          <div className="flex items-center justify-between gap-1 mb-1">
            <Link href="/settings" onClick={() => onClose()} className="flex-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </Link>
            <ModeToggle />
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive transition-colors group"
            onClick={() => {
              console.log('Logout');
              onClose();
            }}
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}

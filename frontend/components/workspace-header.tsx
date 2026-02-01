'use client';

import { Button } from '@/components/ui/button';
import { Database, Menu } from 'lucide-react';
import { useDatabase } from '@/contexts/database-context';
import { NotificationBell } from '@/components/notifications';
import { WebSocketIndicator } from '@/components/notifications';

interface WorkspaceHeaderProps {
  onToggleSchemaBrowser: () => void;
  onToggleSidebar: () => void;
  rightContent?: React.ReactNode;
}

export function WorkspaceHeader({
  onToggleSchemaBrowser,
  onToggleSidebar,
  rightContent,
}: WorkspaceHeaderProps) {
  const { selectedDatabase } = useDatabase();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-20">
      <div className="flex items-center justify-between h-14 px-4 md:px-6 gap-4">
        {/* Left - Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden"
          data-testid="toggle-sidebar-mobile"
        >
          <Menu className="w-4 h-4" />
        </Button>

        {/* Center - Active Database */}
        <div className="flex-1 flex items-center gap-2 px-3 bg-muted rounded-md max-w-xs" data-testid="active-db-indicator">
          <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground truncate">
            {selectedDatabase?.name || 'No Database'}
          </span>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDatabase?.status === 'connected'
              ? 'bg-green-500'
              : 'bg-red-500'
              }`}
          />
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <WebSocketIndicator />
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSchemaBrowser}
            className="gap-2 hidden sm:flex"
            data-testid="toggle-schema-browser"
          >
            <Database className="w-4 h-4" />
            Schema
          </Button>
          {rightContent}
        </div>
      </div>
    </header>
  );
}

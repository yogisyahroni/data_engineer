'use client';

import { useUser } from '@/contexts/user-context';
import { ActivityFeed } from './activity-feed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, History, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CollaborationSidebarProps {
  queryId?: string;
  dashboardId?: string;
}

export function CollaborationSidebar({
  queryId,
  dashboardId,
}: CollaborationSidebarProps) {
  const { user } = useUser();

  const TEAM_MEMBERS = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      status: 'online',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
      status: 'offline',
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      status: 'online',
    },
  ];

  return (
    <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
      <Tabs defaultValue="activity" className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3 flex-shrink-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="activity" className="gap-2 text-xs">
              <History className="w-3 h-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2 text-xs">
              <Users className="w-3 h-3" />
              Team
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 m-0">
          <ActivityFeed limit={15} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="flex-1 overflow-y-auto m-0">
          <div className="p-4 space-y-3">
            {/* Current User */}
            {user && (
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  YOU
                </p>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                </div>
              </div>
            )}

            {/* Team Members */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                TEAM MEMBERS ({TEAM_MEMBERS.length})
              </p>
              <div className="space-y-2">
                {TEAM_MEMBERS.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                          <AvatarFallback>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
                            member.status === 'online'
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Button */}
            <Button variant="outline" className="w-full mt-4 bg-transparent" size="sm">
              Invite Team Member
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

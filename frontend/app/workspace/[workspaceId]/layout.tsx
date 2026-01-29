import { SidebarLayout } from '@/components/sidebar-layout';
import { WorkspaceThemeProvider } from '@/components/theme/theme-provider';

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WorkspaceThemeProvider>
            <SidebarLayout>
                {children}
            </SidebarLayout>
        </WorkspaceThemeProvider>
    );
}

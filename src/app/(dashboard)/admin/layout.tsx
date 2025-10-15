import { AdminSidebar } from './components/AdminSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { getAdminUserData } from './layout-server';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Get user data from server component
  const { user, profileRole } = await getAdminUserData();

  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar user={user} profileRole={profileRole} />
      <SidebarInset className="bg-gray-50">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-6">
            <SidebarTrigger className="-ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100" />
            <div className="h-4 w-px bg-gray-200" />
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

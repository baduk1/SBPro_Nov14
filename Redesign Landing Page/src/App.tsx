import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { StatsOverview } from './components/StatsOverview';
import { ProjectsGrid } from './components/ProjectsGrid';
import { RecentActivity } from './components/RecentActivity';
import { QuickActions } from './components/QuickActions';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <DashboardHeader />
        
        <main className="p-6 space-y-6">
          <StatsOverview />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProjectsGrid />
            </div>
            <div className="space-y-6">
              <QuickActions />
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

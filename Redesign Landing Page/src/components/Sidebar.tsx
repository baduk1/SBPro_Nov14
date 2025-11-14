import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Upload, 
  Building2, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: FolderOpen, label: 'Projects', badge: '8' },
  { icon: Upload, label: 'Upload' },
  { icon: Building2, label: 'Suppliers' },
  { icon: FileText, label: 'Templates' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings' },
  { icon: HelpCircle, label: 'Help' },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 256 : 80 }}
      className="fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-40"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <motion.div
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            className="flex items-center gap-2"
          >
            <Building2 className="w-7 h-7 text-blue-600" />
            {isOpen && <span className="text-slate-900">SkyBuild Pro</span>}
          </motion.div>
          {!isOpen && <Building2 className="w-7 h-7 text-blue-600 mx-auto" />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {isOpen && item.badge && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom Items */}
        <div className="px-3 py-4 border-t border-slate-200 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="flex-1 text-left">{item.label}</span>}
              </motion.button>
            );
          })}
          
          {/* Toggle Button */}
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors mt-2"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

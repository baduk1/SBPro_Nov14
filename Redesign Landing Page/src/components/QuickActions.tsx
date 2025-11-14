import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Building2, FileText, Upload, UserPlus } from 'lucide-react';

const actions = [
  {
    icon: Building2,
    label: 'Suppliers',
    description: 'Manage suppliers',
    color: 'bg-blue-100 text-blue-600',
    hoverColor: 'hover:bg-blue-50',
  },
  {
    icon: FileText,
    label: 'Templates',
    description: 'Reusable BoQ templates',
    color: 'bg-green-100 text-green-600',
    hoverColor: 'hover:bg-green-50',
  },
  {
    icon: Upload,
    label: 'Upload Files',
    description: 'Add documents',
    color: 'bg-purple-100 text-purple-600',
    hoverColor: 'hover:bg-purple-50',
  },
  {
    icon: UserPlus,
    label: 'Invite Team',
    description: 'Add members',
    color: 'bg-orange-100 text-orange-600',
    hoverColor: 'hover:bg-orange-50',
  },
];

export function QuickActions() {
  return (
    <Card className="p-6 border-slate-200">
      <h3 className="text-slate-900 mb-4">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${action.hoverColor}`}
            >
              <div className={`p-2 rounded-lg ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-slate-900">{action.label}</div>
                <div className="text-slate-500 text-xs">{action.description}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

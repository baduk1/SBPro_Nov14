import { motion } from 'motion/react';
import { Card } from './ui/card';
import { FileText, MessageSquare, Upload, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';

const activities = [
  {
    id: 1,
    user: 'Sarah Johnson',
    initials: 'SJ',
    action: 'updated BoQ document',
    project: 'My First Project',
    time: '2 hours ago',
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 2,
    user: 'Mike Chen',
    initials: 'MC',
    action: 'added a comment',
    project: 'Tech Hub Office',
    time: '3 hours ago',
    icon: MessageSquare,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 3,
    user: 'Emily Davis',
    initials: 'ED',
    action: 'uploaded blueprints',
    project: 'Riverside Apartments',
    time: '1 day ago',
    icon: Upload,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 4,
    user: 'John Smith',
    initials: 'JS',
    action: 'completed milestone',
    project: 'My First Project',
    time: '2 days ago',
    icon: CheckCircle,
    color: 'bg-orange-100 text-orange-600',
  },
];

export function RecentActivity() {
  return (
    <Card className="p-6 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900">Recent Activity</h3>
        <button className="text-blue-600 hover:text-blue-700 transition-colors">
          View all
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-slate-200 text-slate-700">
                    {activity.initials}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${activity.color} flex items-center justify-center border-2 border-white`}>
                  <Icon className="w-3 h-3" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 group-hover:text-blue-600 transition-colors">
                  <span>{activity.user}</span>{' '}
                  <span className="text-slate-600">{activity.action}</span>
                </p>
                <p className="text-slate-500 truncate">{activity.project}</p>
                <p className="text-slate-400 text-xs">{activity.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

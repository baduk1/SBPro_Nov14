import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, FolderOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';

const stats = [
  {
    title: 'Active Projects',
    value: '8',
    change: '+2 this month',
    trend: 'up',
    icon: FolderOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'In Progress',
    value: '5',
    change: '62.5% of total',
    trend: 'neutral',
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Completed',
    value: '24',
    change: '+6 this quarter',
    trend: 'up',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Pending Review',
    value: '3',
    change: 'Needs attention',
    trend: 'down',
    icon: AlertCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export function StatsOverview() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 mb-1">Dashboard</h1>
        <p className="text-slate-600">Welcome back, Sarah Johnson! Here's your project overview</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : null;
          
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card className="p-6 border-slate-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  {TrendIcon && (
                    <TrendIcon className={`w-4 h-4 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                  )}
                </div>
                <div className="text-slate-600 mb-1">{stat.title}</div>
                <div className="text-slate-900 mb-2">{stat.value}</div>
                <div className="text-slate-500 text-xs">{stat.change}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

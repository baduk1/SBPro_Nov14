import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MoreVertical, 
  Calendar, 
  Users, 
  TrendingUp,
  ExternalLink,
  FileText,
  Plus,
  Clock
} from 'lucide-react';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const projects = [
  {
    id: 1,
    name: 'My First Project',
    description: 'Downtown commercial complex renovation',
    status: 'in-progress',
    progress: 68,
    deadline: 'Dec 30, 2025',
    team: 8,
    image: 'https://images.unsplash.com/photo-1723367194881-fe2e53534170?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwYWVyaWFsfGVufDF8fHx8MTc2MzExMDgyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    recentActivity: 'Updated 2 hours ago',
  },
  {
    id: 2,
    name: 'Riverside Apartments',
    description: 'New residential building construction',
    status: 'planning',
    progress: 25,
    deadline: 'Feb 15, 2026',
    team: 12,
    image: 'https://images.unsplash.com/photo-1742415106160-594d07f6cc23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWlsZGluZyUyMGJsdWVwcmludHxlbnwxfHx8fDE3NjMxMTA4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    recentActivity: 'Updated 1 day ago',
  },
  {
    id: 3,
    name: 'Tech Hub Office',
    description: 'Modern office space design and build',
    status: 'review',
    progress: 92,
    deadline: 'Nov 20, 2025',
    team: 6,
    image: 'https://images.unsplash.com/photo-1723367194881-fe2e53534170?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwYWVyaWFsfGVufDF8fHx8MTc2MzExMDgyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    recentActivity: 'Updated 3 hours ago',
  },
];

const statusConfig = {
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  'planning': { label: 'Planning', color: 'bg-purple-100 text-purple-700' },
  'review': { label: 'Review', color: 'bg-orange-100 text-orange-700' },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

export function ProjectsGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-900 mb-1">Projects</h2>
          <p className="text-slate-600">Manage and track your active projects</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Project
          </Button>
        </motion.div>
      </div>

      <div className="space-y-4">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
          >
            <Card className="p-0 overflow-hidden border-slate-200 hover:shadow-lg transition-all">
              <div className="flex flex-col sm:flex-row">
                {/* Project Image */}
                <div className="sm:w-48 h-48 sm:h-auto relative overflow-hidden bg-slate-100">
                  <ImageWithFallback
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <Badge 
                    className={`absolute top-3 left-3 ${statusConfig[project.status as keyof typeof statusConfig].color}`}
                  >
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>

                {/* Project Details */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-slate-900 mb-1">{project.name}</h3>
                      <p className="text-slate-600">{project.description}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-slate-900">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{project.deadline}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{project.team} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{project.recentActivity}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Open Project
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Open BoQ
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="ghost" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        View Analytics
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
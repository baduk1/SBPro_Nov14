/**
 * Task List Component
 *
 * Displays project tasks with filtering, sorting, and real-time updates.
 * Features:
 * - Filter by status, priority, assignee
 * - Search by title/description
 * - Real-time synchronization via WebSocket
 * - Click to view/edit task details
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as OpenIcon,
  PlayArrow as InProgressIcon,
  Block as BlockedIcon,
  Search as SearchIcon,
  KeyboardArrowUp as HighPriorityIcon,
  KeyboardArrowDown as LowPriorityIcon,
  DragHandle as MediumPriorityIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tasks, Task } from '../services/api';
import { useTaskUpdates } from '../contexts/WebSocketContext';

interface TaskListProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
  onCreateTask?: () => void;
}

const STATUS_ICONS = {
  open: <OpenIcon fontSize="small" />,
  in_progress: <InProgressIcon fontSize="small" />,
  completed: <CheckCircleIcon fontSize="small" />,
  blocked: <BlockedIcon fontSize="small" />,
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  open: 'default',
  in_progress: 'primary',
  completed: 'success',
  blocked: 'error',
};

const PRIORITY_ICONS = {
  low: <LowPriorityIcon fontSize="small" />,
  medium: <MediumPriorityIcon fontSize="small" />,
  high: <HighPriorityIcon fontSize="small" />,
};

const PRIORITY_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
};

export default function TaskList({ projectId, onTaskClick, onCreateTask }: TaskListProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Fetch tasks
  const {
    data: taskList,
    isLoading,
    error,
  } = useQuery<Task[]>({
    queryKey: ['tasks', projectId, statusFilter, priorityFilter],
    queryFn: () => {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      return tasks.list(projectId, filters);
    },
    enabled: !!projectId,
  });

  // Listen for real-time task updates
  useTaskUpdates(
    useCallback(
      (data) => {
        if (data.project_id === projectId) {
          // Invalidate to refetch the list
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        }
      },
      [projectId, queryClient]
    )
  );

  // Filter tasks by search query
  const filteredTasks = React.useMemo(() => {
    if (!taskList) return [];
    if (!searchQuery.trim()) return taskList;

    const query = searchQuery.toLowerCase();
    return taskList.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  }, [taskList, searchQuery]);

  const handleTaskClick = (taskId: number) => {
    onTaskClick?.(taskId.toString());
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <Typography variant="caption" color="error" fontWeight="bold">
          Overdue by {Math.abs(diffDays)} days
        </Typography>
      );
    } else if (diffDays === 0) {
      return (
        <Typography variant="caption" color="warning.main" fontWeight="bold">
          Due today
        </Typography>
      );
    } else if (diffDays <= 3) {
      return (
        <Typography variant="caption" color="warning.main">
          Due in {diffDays} days
        </Typography>
      );
    } else {
      return (
        <Typography variant="caption" color="text.secondary">
          Due {date.toLocaleDateString()}
        </Typography>
      );
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load tasks
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with filters */}
      <Box mb={3}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <TextField
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="all">All Priority</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateTask}>
            New Task
          </Button>
        </Stack>
      </Box>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={6}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No tasks match your filters'
                  : 'No tasks yet. Create your first task!'}
              </Typography>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onCreateTask}
                  sx={{ mt: 2 }}
                >
                  Create Task
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleTaskClick(task.id)}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="start">
                  <Box flex={1}>
                    {/* Title and Status */}
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <Typography variant="h6" component="div">
                        {task.title}
                      </Typography>
                      <Chip
                        icon={STATUS_ICONS[task.status]}
                        label={task.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={STATUS_COLORS[task.status]}
                      />
                      <Chip
                        icon={PRIORITY_ICONS[task.priority]}
                        label={task.priority.toUpperCase()}
                        size="small"
                        color={PRIORITY_COLORS[task.priority]}
                        variant="outlined"
                      />
                    </Stack>

                    {/* Description */}
                    {task.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}

                    {/* Footer: Assignee, Due Date */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      {task.assignee_id && (
                        <Tooltip title={`Assigned to user ${task.assignee_id}`}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              U
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              Assigned
                            </Typography>
                          </Stack>
                        </Tooltip>
                      )}
                      {formatDueDate(task.due_date)}
                      <Box flex={1} />
                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(task.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task.id);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

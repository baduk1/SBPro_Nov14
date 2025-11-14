/**
 * Task Kanban Board Component
 *
 * Drag-and-drop Kanban board for task management.
 * Supports reordering within columns and moving between columns.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import { Add as AddIcon, MoreVert as MoreIcon } from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: {
    id: string;
    email: string;
    full_name: string;
  };
  due_date?: string;
  labels?: string[];
  position: number;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface Props {
  projectId: string;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: string) => void;
}

const STATUSES = [
  { id: 'todo', title: 'To Do', color: '#64748b' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { id: 'review', title: 'Review', color: '#f59e0b' },
  { id: 'done', title: 'Done', color: '#10b981' }
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#84cc16'
};

export default function TaskKanbanBoard({ projectId, onTaskClick, onCreateTask }: Props) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<Column[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/tasks`, {
        params: { limit: 200, sort_by: 'position', sort_order: 'asc' }
      });
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Organize tasks into columns
  useEffect(() => {
    if (tasksData?.tasks) {
      const tasksByStatus: Record<string, Task[]> = {};

      // Initialize empty columns
      STATUSES.forEach(status => {
        tasksByStatus[status.id] = [];
      });

      // Group tasks by status
      tasksData.tasks.forEach((task: Task) => {
        if (tasksByStatus[task.status]) {
          tasksByStatus[task.status].push(task);
        }
      });

      // Sort by position within each column
      Object.keys(tasksByStatus).forEach(status => {
        tasksByStatus[status].sort((a, b) => a.position - b.position);
      });

      // Create column objects
      const newColumns = STATUSES.map(status => ({
        id: status.id,
        title: status.title,
        tasks: tasksByStatus[status.id] || []
      }));

      setColumns(newColumns);
    }
  }, [tasksData]);

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ status, orders }: { status: string; orders: { id: number; position: number }[] }) => {
      await api.post(`/projects/${projectId}/tasks/reorder`, { status, orders });
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || 'Failed to reorder tasks');
      // Rollback by refetching
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ task_id, new_status, new_position }: { task_id: number; new_status: string; new_position: number }) => {
      await api.post(`/projects/${projectId}/tasks/${task_id}/move`, {
        task_id,
        new_status,
        new_position
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || 'Failed to move task');
      // Rollback by refetching
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside any droppable
    if (!destination) return;

    // Dropped in same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumnIndex = columns.findIndex(col => col.id === source.droppableId);
    const destColumnIndex = columns.findIndex(col => col.id === destination.droppableId);
    const taskId = parseInt(draggableId);

    // Optimistic update
    const newColumns = [...columns];
    const sourceColumn = { ...newColumns[sourceColumnIndex] };
    const destColumn = source.droppableId === destination.droppableId
      ? sourceColumn
      : { ...newColumns[destColumnIndex] };

    // Remove task from source
    const [movedTask] = sourceColumn.tasks.splice(source.index, 1);

    // Update task status if moved to different column
    if (source.droppableId !== destination.droppableId) {
      movedTask.status = destination.droppableId;
    }

    // Insert into destination
    destColumn.tasks.splice(destination.index, 0, movedTask);

    // Update positions
    destColumn.tasks.forEach((task, index) => {
      task.position = index;
    });

    // Update columns
    newColumns[sourceColumnIndex] = sourceColumn;
    if (source.droppableId !== destination.droppableId) {
      newColumns[destColumnIndex] = destColumn;

      // Also update source column positions if different
      sourceColumn.tasks.forEach((task, index) => {
        task.position = index;
      });
    }

    setColumns(newColumns);
    setError(null);

    // Make API call
    if (source.droppableId === destination.droppableId) {
      // Reorder within same column
      const orders = destColumn.tasks.map((task, index) => ({
        id: task.id,
        position: index
      }));
      reorderMutation.mutate({ status: destination.droppableId, orders });
    } else {
      // Move to different column
      moveMutation.mutate({
        task_id: taskId,
        new_status: destination.droppableId,
        new_position: destination.index
      });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box display="flex" gap={2} overflow="auto" pb={2}>
          {columns.map((column) => {
            const statusConfig = STATUSES.find(s => s.id === column.id);

            return (
              <Paper
                key={column.id}
                sx={{
                  minWidth: 320,
                  maxWidth: 320,
                  flexShrink: 0,
                  bgcolor: 'grey.50'
                }}
              >
                {/* Column Header */}
                <Box
                  p={2}
                  borderBottom="2px solid"
                  borderColor={statusConfig?.color}
                  bgcolor="white"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" fontWeight="bold">
                      {column.title}
                    </Typography>
                    <Chip
                      label={column.tasks.length}
                      size="small"
                      sx={{
                        bgcolor: statusConfig?.color,
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => onCreateTask?.(column.id)}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>

                {/* Droppable Column */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      p={2}
                      minHeight={400}
                      sx={{
                        bgcolor: snapshot.isDraggingOver ? 'grey.100' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 1.5,
                                cursor: 'pointer',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                boxShadow: snapshot.isDragging ? 4 : 1,
                                transition: 'box-shadow 0.2s',
                                '&:hover': {
                                  boxShadow: 3
                                }
                              }}
                              onClick={(e) => {
                                if (!snapshot.isDragging) {
                                  onTaskClick?.(task);
                                }
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                {/* Priority Badge */}
                                {task.priority && (
                                  <Chip
                                    label={task.priority}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      bgcolor: PRIORITY_COLORS[task.priority],
                                      color: 'white',
                                      mb: 1
                                    }}
                                  />
                                )}

                                {/* Task Title */}
                                <Typography variant="subtitle2" fontWeight="500" mb={0.5}>
                                  {task.title}
                                </Typography>

                                {/* Task Description */}
                                {task.description && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      mb: 1
                                    }}
                                  >
                                    {task.description}
                                  </Typography>
                                )}

                                {/* Labels */}
                                {task.labels && task.labels.length > 0 && (
                                  <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                                    {task.labels.map((label, idx) => (
                                      <Chip
                                        key={idx}
                                        label={label}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    ))}
                                  </Box>
                                )}

                                {/* Footer */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                  {/* Due Date */}
                                  {task.due_date && (
                                    <Typography variant="caption" color="text.secondary">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </Typography>
                                  )}

                                  {/* Assignee */}
                                  {task.assignee && (
                                    <Avatar
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        fontSize: '0.75rem',
                                        bgcolor: 'primary.main'
                                      }}
                                    >
                                      {task.assignee.full_name?.charAt(0) || task.assignee.email.charAt(0)}
                                    </Avatar>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Empty State */}
                      {column.tasks.length === 0 && (
                        <Box
                          textAlign="center"
                          py={4}
                          color="text.secondary"
                        >
                          <Typography variant="body2">
                            No tasks
                          </Typography>
                          <Typography variant="caption">
                            Drag tasks here or click + to add
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            );
          })}
        </Box>
      </DragDropContext>
    </Box>
  );
}

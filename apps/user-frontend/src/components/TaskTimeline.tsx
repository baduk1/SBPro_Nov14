/**
 * Task Timeline Component
 *
 * Gantt-style timeline view for task scheduling and dependencies.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
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
  start_date?: string;
  due_date?: string;
  labels?: string[];
}

interface Props {
  projectId: string;
  onTaskClick?: (task: Task) => void;
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748b',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981'
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#84cc16'
};

// Calculate date range for the view (default to current month +/- 2 months)
function getDefaultDateRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  return { start, end };
}

// Generate array of dates for the timeline grid
function generateDateGrid(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Generate month headers for the timeline
function generateMonthHeaders(start: Date, end: Date): Array<{ label: string; days: number }> {
  const months: Array<{ label: string; days: number }> = [];
  const current = new Date(start);

  while (current <= end) {
    const month = current.getMonth();
    const year = current.getFullYear();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const rangeStart = monthStart < start ? start : monthStart;
    const rangeEnd = monthEnd > end ? end : monthEnd;

    const days = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    months.push({
      label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      days
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export default function TaskTimeline({ projectId, onTaskClick }: Props) {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId, 'timeline', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/tasks/timeline`, {
        params: {
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0]
        }
      });
      return response.data as Task[];
    },
    refetchInterval: 60000 // Refresh every 60 seconds
  });

  // Calculate timeline dimensions
  const dateGrid = generateDateGrid(dateRange.start, dateRange.end);
  const monthHeaders = generateMonthHeaders(dateRange.start, dateRange.end);
  const dayWidth = 40; // pixels per day
  const rowHeight = 60;
  const taskHeight = 48;

  // Navigate to previous/next period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const months = direction === 'prev' ? -3 : 3;
    setDateRange(prev => {
      const newStart = new Date(prev.start);
      newStart.setMonth(newStart.getMonth() + months);
      const newEnd = new Date(prev.end);
      newEnd.setMonth(newEnd.getMonth() + months);
      return { start: newStart, end: newEnd };
    });
  };

  // Calculate task bar position and width
  const getTaskBarStyle = (task: Task) => {
    const taskStart = task.start_date ? new Date(task.start_date) : (task.due_date ? new Date(task.due_date) : null);
    const taskEnd = task.due_date ? new Date(task.due_date) : (task.start_date ? new Date(task.start_date) : null);

    if (!taskStart || !taskEnd) return null;

    // Calculate position from start of timeline
    const startOffset = Math.max(0, Math.floor((taskStart.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    const endOffset = Math.min(
      dateGrid.length - 1,
      Math.floor((taskEnd.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    );

    const duration = Math.max(1, endOffset - startOffset + 1);

    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth - 8,
    };
  };

  // Check if task is overdue
  const isOverdue = (task: Task): boolean => {
    if (!task.due_date || task.status === 'done') return false;
    return new Date(task.due_date) < new Date();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="text.secondary" align="center">
            No tasks with dates
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" mt={1}>
            Add start dates and due dates to tasks to see them on the timeline
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Timeline Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" gap={1}>
          <IconButton onClick={() => navigatePeriod('prev')} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography variant="body1" fontWeight="bold" sx={{ lineHeight: '32px' }}>
            {dateRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {dateRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Typography>
          <IconButton onClick={() => navigatePeriod('next')} size="small">
            <ChevronRight />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </Typography>
      </Box>

      <Paper sx={{ overflow: 'auto', maxWidth: '100%' }}>
        {/* Month Headers */}
        <Box display="flex" borderBottom="2px solid" borderColor="divider" bgcolor="grey.50">
          {monthHeaders.map((month, idx) => (
            <Box
              key={idx}
              width={month.days * dayWidth}
              textAlign="center"
              py={1}
              borderRight={idx < monthHeaders.length - 1 ? '1px solid' : 'none'}
              borderColor="divider"
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {month.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Date Grid Header */}
        <Box display="flex" borderBottom="1px solid" borderColor="divider" bgcolor="grey.100">
          {dateGrid.map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <Box
                key={idx}
                width={dayWidth}
                textAlign="center"
                py={0.5}
                bgcolor={isToday ? 'primary.light' : isWeekend ? 'grey.200' : 'transparent'}
                borderRight="1px solid"
                borderColor="divider"
              >
                <Typography variant="caption" fontWeight={isToday ? 'bold' : 'normal'}>
                  {date.getDate()}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Task Rows */}
        <Box position="relative">
          {/* Date Grid Background */}
          <Box display="flex" position="absolute" top={0} left={0} right={0} bottom={0} zIndex={0}>
            {dateGrid.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <Box
                  key={idx}
                  width={dayWidth}
                  bgcolor={isToday ? 'primary.lighter' : isWeekend ? 'grey.50' : 'transparent'}
                  borderRight="1px solid"
                  borderColor="divider"
                />
              );
            })}
          </Box>

          {/* Task Bars */}
          {tasks.map((task, idx) => {
            const barStyle = getTaskBarStyle(task);
            if (!barStyle) return null;

            const overdue = isOverdue(task);

            return (
              <Box
                key={task.id}
                position="relative"
                height={rowHeight}
                borderBottom="1px solid"
                borderColor="divider"
                zIndex={1}
              >
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="subtitle2">{task.title}</Typography>
                      {task.description && (
                        <Typography variant="caption" display="block" mt={0.5}>
                          {task.description}
                        </Typography>
                      )}
                      <Typography variant="caption" display="block" mt={0.5}>
                        {task.start_date && `Start: ${new Date(task.start_date).toLocaleDateString()}`}
                        {task.start_date && task.due_date && ' | '}
                        {task.due_date && `Due: ${new Date(task.due_date).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <Box
                    position="absolute"
                    top={(rowHeight - taskHeight) / 2}
                    left={barStyle.left + 4}
                    width={barStyle.width}
                    height={taskHeight}
                    borderRadius={1}
                    bgcolor={overdue ? PRIORITY_COLORS.urgent : STATUS_COLORS[task.status] || STATUS_COLORS.todo}
                    color="white"
                    px={1.5}
                    py={1}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    sx={{
                      cursor: 'pointer',
                      opacity: task.status === 'done' ? 0.6 : 1,
                      '&:hover': {
                        opacity: 0.8,
                        boxShadow: 2
                      }
                    }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Priority Badge */}
                    {task.priority && (
                      <Box
                        width={8}
                        height={8}
                        borderRadius="50%"
                        bgcolor={PRIORITY_COLORS[task.priority]}
                        flexShrink={0}
                      />
                    )}

                    {/* Task Title */}
                    <Typography
                      variant="body2"
                      fontSize="0.8rem"
                      fontWeight="500"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexGrow: 1
                      }}
                    >
                      {task.title}
                    </Typography>

                    {/* Assignee Avatar */}
                    {task.assignee && barStyle.width > 100 && (
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(255,255,255,0.3)',
                          flexShrink: 0
                        }}
                      >
                        {task.assignee.full_name?.charAt(0) || task.assignee.email.charAt(0)}
                      </Avatar>
                    )}
                  </Box>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Legend */}
      <Box display="flex" gap={2} mt={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={16} height={16} bgcolor={STATUS_COLORS.todo} borderRadius={0.5} />
          <Typography variant="caption">To Do</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={16} height={16} bgcolor={STATUS_COLORS.in_progress} borderRadius={0.5} />
          <Typography variant="caption">In Progress</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={16} height={16} bgcolor={STATUS_COLORS.review} borderRadius={0.5} />
          <Typography variant="caption">Review</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={16} height={16} bgcolor={STATUS_COLORS.done} borderRadius={0.5} />
          <Typography variant="caption">Done</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={16} height={16} bgcolor={PRIORITY_COLORS.urgent} borderRadius={0.5} />
          <Typography variant="caption">Overdue</Typography>
        </Box>
      </Box>
    </Box>
  );
}

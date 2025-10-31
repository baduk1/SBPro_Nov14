/**
 * Task Editor Dialog
 *
 * Form for creating and editing project tasks.
 * Features:
 * - Create new task or edit existing
 * - Full validation
 * - Assignee selection from project collaborators
 * - Due date picker
 * - Status and priority management
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasks, collaboration, Task } from '../services/api';

interface TaskEditorProps {
  open: boolean;
  projectId: string;
  taskId?: string; // If provided, edit mode; otherwise create mode
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: Dayjs | null;
  assignee_id: string;
}

export default function TaskEditor({
  open,
  projectId,
  taskId,
  onClose,
  onSuccess,
  onError,
}: TaskEditorProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!taskId;

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    due_date: null,
    assignee_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch task details if editing
  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => tasks.get(Number(taskId!)),
    enabled: isEditMode && open,
  });

  // Fetch collaborators for assignee dropdown
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: () => collaboration.listCollaborators(projectId),
    enabled: open,
  });

  // Populate form when task data loads
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority || 'medium',
        due_date: task.due_date ? dayjs(task.due_date) : null,
        assignee_id: task.assignee_id || '',
      });
    }
  }, [task]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        due_date: null,
        assignee_id: '',
      });
      setErrors({});
    }
  }, [open]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await tasks.create(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Failed to create task';
      onError?.(errorMsg);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await tasks.update(Number(taskId!), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Failed to update task';
      onError?.(errorMsg);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority || null,
      due_date: formData.due_date ? formData.due_date.format('YYYY-MM-DD') : null,
      assignee_id: formData.assignee_id || null,
    };

    if (isEditMode) {
      updateTaskMutation.mutate(payload);
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const handleFieldChange = (field: keyof TaskFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
      <DialogContent>
        {taskLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Title */}
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              fullWidth
              autoFocus
            />

            {/* Description */}
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              multiline
              rows={4}
              fullWidth
            />

            {/* Status and Priority */}
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Due Date */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Due Date"
                value={formData.due_date}
                onChange={(newValue) => handleFieldChange('due_date', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Optional: Set a deadline for this task',
                  },
                }}
              />
            </LocalizationProvider>

            {/* Assignee */}
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={formData.assignee_id}
                label="Assign To"
                onChange={(e) => handleFieldChange('assignee_id', e.target.value)}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {collaborators?.map((collab: any) => (
                  <MenuItem key={collab.user_id} value={collab.user_id}>
                    {collab.user_name || collab.user_email} ({collab.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Info note */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Tasks are synced in real-time. All project members will see updates immediately.
              </Typography>
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || taskLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {isEditMode ? 'Save Changes' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

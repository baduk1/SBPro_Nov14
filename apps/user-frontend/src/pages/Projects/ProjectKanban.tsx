/**
 * Project Kanban Page
 *
 * Full page view for Kanban board task management.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import TaskKanbanBoard from '../../components/TaskKanbanBoard';
import TaskEditor from '../../components/TaskEditor';

export default function ProjectKanban() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  if (!projectId) {
    return <div>Project ID required</div>;
  }

  const handleTaskClick = (task: any) => {
    setSelectedTaskId(task.id);
    setEditorOpen(true);
  };

  const handleCreateTask = (status: string) => {
    // For now, just open the editor (can be enhanced to set default status)
    setSelectedTaskId(null);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setSelectedTaskId(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/app/projects/${projectId}/tasks`)}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Task Board
          </Typography>
        </Box>

        {/* View Switcher */}
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ListIcon />}
            onClick={() => navigate(`/app/projects/${projectId}/tasks`)}
          >
            List
          </Button>
          <Button
            variant="contained"
            startIcon={<KanbanIcon />}
          >
            Kanban
          </Button>
          <Button
            variant="outlined"
            startIcon={<TimelineIcon />}
            onClick={() => navigate(`/app/projects/${projectId}/timeline`)}
          >
            Timeline
          </Button>
        </Box>
      </Box>

      {/* Kanban Board */}
      <TaskKanbanBoard
        projectId={projectId}
        onTaskClick={handleTaskClick}
        onCreateTask={handleCreateTask}
      />

      {/* Task Editor Dialog */}
      <TaskEditor
        open={editorOpen}
        projectId={projectId}
        taskId={selectedTaskId?.toString()}
        onClose={handleCloseEditor}
      />
    </Box>
  );
}

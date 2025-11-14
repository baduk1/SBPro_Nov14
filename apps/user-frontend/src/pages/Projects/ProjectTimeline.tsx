/**
 * Project Timeline Page
 *
 * Full page view for Timeline/Gantt chart task visualization.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import TaskTimeline from '../../components/TaskTimeline';
import TaskEditor from '../../components/TaskEditor';

export default function ProjectTimeline() {
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
            Project Timeline
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
            variant="outlined"
            startIcon={<KanbanIcon />}
            onClick={() => navigate(`/app/projects/${projectId}/kanban`)}
          >
            Kanban
          </Button>
          <Button
            variant="contained"
            startIcon={<TimelineIcon />}
          >
            Timeline
          </Button>
        </Box>
      </Box>

      {/* Timeline View */}
      <TaskTimeline
        projectId={projectId}
        onTaskClick={handleTaskClick}
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

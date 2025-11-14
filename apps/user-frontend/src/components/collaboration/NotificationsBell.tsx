/**
 * NotificationsBell Component
 *
 * Displays notification bell icon with unread badge.
 * Opens popover (desktop) or drawer (mobile) with notifications list.
 * Features:
 * - Real-time unread count
 * - Mark as read functionality
 * - Click to navigate to notification context
 * - Mobile-responsive (popover/drawer)
 */

import React, { useState } from 'react'
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useNotifications, Notification } from '../../hooks/useNotifications'

export default function NotificationsBell() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const open = Boolean(anchorEl)

  const {
    notifications,
    isLoading,
    unreadCount,
    markAllRead,
    markRead,
    isMarkingRead
  } = useNotifications({ limit: 20 })

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      markRead(notification.id)
    }

    // Navigate to context
    const { payload, project_id, type } = notification

    if (type === 'mention' && payload.task_id && project_id) {
      navigate(`/app/projects/${project_id}/tasks`)
    } else if (type === 'task.assigned' && payload.task_id && project_id) {
      navigate(`/app/projects/${project_id}/tasks`)
    } else if (type === 'invite' && project_id) {
      navigate(`/app/projects/${project_id}`)
    }

    handleClose()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <CommentIcon fontSize="small" />
      case 'task.assigned':
        return <AssignmentIcon fontSize="small" />
      case 'invite':
        return <PersonAddIcon fontSize="small" />
      default:
        return <NotificationsIcon fontSize="small" />
    }
  }

  const getNotificationText = (notification: Notification) => {
    const { type, payload } = notification

    switch (type) {
      case 'mention':
        return `${payload.actor_name || 'Someone'} mentioned you in ${payload.task_title || 'a task'}`
      case 'task.assigned':
        return `${payload.actor_name || 'Someone'} assigned you to ${payload.task_title || 'a task'}`
      case 'invite':
        return `${payload.actor_name || 'Someone'} invited you to ${payload.project_name || 'a project'}`
      default:
        return 'You have a new notification'
    }
  }

  const notificationsList = (
    <Box sx={{ width: isMobile ? '100%' : 360, maxHeight: 500 }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6">
          Notifications
          {unreadCount > 0 && (
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: 'primary.main' }}
            >
              ({unreadCount} unread)
            </Typography>
          )}
        </Typography>

        {isMobile && (
          <IconButton
            onClick={handleClose}
            sx={{ minWidth: 44, minHeight: 44 }}
            aria-label="Close notifications"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            size="small"
            onClick={() => markAllRead()}
            disabled={isMarkingRead}
          >
            Mark all as read
          </Button>
        </Box>
      )}

      {/* Notifications list */}
      <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              All caught up! 🎉
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItemButton
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read_at ? 'transparent' : 'action.hover',
                    py: 1.5,
                    px: 2,
                    alignItems: 'flex-start',
                    minHeight: 56 // Touch target
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.read_at ? 400 : 600
                        }}
                      >
                        {getNotificationText(notification)}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true
                        })}
                      </Typography>
                    }
                  />
                </ListItemButton>
                {index < notifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        sx={{ minWidth: 44, minHeight: 44 }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Desktop: Popover */}
      {!isMobile && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
        >
          {notificationsList}
        </Popover>
      )}

      {/* Mobile: Drawer */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={open}
          onClose={handleClose}
        >
          {notificationsList}
        </Drawer>
      )}
    </>
  )
}

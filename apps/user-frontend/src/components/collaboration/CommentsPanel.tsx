/**
 * CommentsPanel Component
 *
 * Slide-out drawer displaying threaded comments for a resource.
 * Supports nested replies and real-time updates.
 */

import React, { useMemo } from 'react'
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  Stack,
  IconButton,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useComments, Comment } from '../../hooks/useComments'
import CommentInput from './CommentInput'

interface Props {
  projectId: string
  contextType: 'task' | 'boq' | 'project'
  contextId: string
  open: boolean
  onClose: () => void
  readOnly?: boolean
  title?: string
}

export default function CommentsPanel({
  projectId,
  contextType,
  contextId,
  open,
  onClose,
  readOnly = false,
  title = 'Comments'
}: Props) {
  const { comments, isLoading } = useComments(projectId, contextType, contextId)

  // Build comment tree (parent → children)
  const commentTree = useMemo(() => {
    const topLevel = comments.filter(c => !c.parent_id)
    const childrenMap = new Map<number, Comment[]>()

    comments.forEach(c => {
      if (c.parent_id) {
        const siblings = childrenMap.get(c.parent_id) || []
        siblings.push(c)
        childrenMap.set(c.parent_id, siblings)
      }
    })

    return { topLevel, childrenMap }
  }, [comments])

  const renderComment = (comment: Comment, depth: number = 0) => {
    const hasReplies = commentTree.childrenMap.has(comment.id)
    const children = commentTree.childrenMap.get(comment.id) || []

    return (
      <Box key={comment.id} sx={{ ml: depth * 3 }}>
        <ListItem
          alignItems="flex-start"
          sx={{
            px: 2,
            py: 1.5,
            flexDirection: 'column',
            bgcolor: depth > 0 ? 'action.hover' : 'transparent',
            borderRadius: 1,
            mb: 0.5,
            opacity: comment.pending ? 0.6 : 1, // Visual feedback for pending comments
            transition: 'opacity 0.3s ease'
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
            <Avatar
              src={comment.author?.avatar_url}
              sx={{ width: 32, height: 32, flexShrink: 0 }}
            >
              {comment.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comment.author?.full_name || 'Unknown User'}
                  </Typography>
                  {comment.pending && (
                    <CircularProgress size={12} thickness={5} sx={{ color: 'text.secondary' }} />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                  {comment.pending ? 'Sending...' : formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true
                  })}
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {comment.body}
              </Typography>

              {comment.updated_at && comment.updated_at !== comment.created_at && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
                >
                  (edited)
                </Typography>
              )}
            </Box>
          </Stack>
        </ListItem>

        {/* Render nested replies */}
        {hasReplies && (
          <Box sx={{ ml: 2, mt: 0.5, borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
            {children.map(child => renderComment(child, depth + 1))}
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 420, md: 480 },
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 0,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mr: 2, fontWeight: 500 }}
          >
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </Typography>
          <IconButton
            onClick={onClose}
            size="large"
            aria-label="Close comments panel"
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </Paper>

        {/* Comments List */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : comments.length === 0 ? (
            <Box
              sx={{
                py: 8,
                px: 4,
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No comments yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Be the first to comment!
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {commentTree.topLevel.map(comment => renderComment(comment))}
            </List>
          )}
        </Box>

        {/* Comment Input */}
        {!readOnly && (
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              borderRadius: 0
            }}
          >
            <CommentInput
              projectId={projectId}
              contextType={contextType}
              contextId={contextId}
              placeholder="Write a comment..."
              autoFocus={open}
            />
          </Paper>
        )}
      </Box>
    </Drawer>
  )
}

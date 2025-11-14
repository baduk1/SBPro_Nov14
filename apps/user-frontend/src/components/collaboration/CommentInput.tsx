/**
 * CommentInput Component
 *
 * Text input for creating new comments or replies.
 * Includes submit button with loading state.
 */

import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  CircularProgress
} from '@mui/material'
import { Send as SendIcon } from '@mui/icons-material'
import { useComments } from '../../hooks/useComments'

interface Props {
  projectId: string
  contextType: 'task' | 'boq' | 'project'
  contextId: string
  parentId?: number
  onSubmitted?: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}

export default function CommentInput({
  projectId,
  contextType,
  contextId,
  parentId,
  onSubmitted,
  placeholder = 'Write a comment...',
  disabled = false,
  autoFocus = false
}: Props) {
  const [body, setBody] = useState('')
  const { createComment, isCreating } = useComments(
    projectId,
    contextType,
    contextId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || isCreating) return

    createComment(
      { body: body.trim(), parent_id: parentId },
      {
        onSuccess: () => {
          setBody('')
          onSubmitted?.()
        }
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e as any)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isCreating}
        autoFocus={autoFocus}
        size="small"
        sx={{
          flexGrow: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2
          }
        }}
        helperText={body.trim() ? 'Ctrl+Enter to send' : ''}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={!body.trim() || isCreating || disabled}
        sx={{
          minWidth: 44,
          minHeight: 44,
          borderRadius: 2,
          mb: body.trim() ? 2.5 : 0 // Align with text field when helper text shows
        }}
        aria-label="Send comment"
      >
        {isCreating ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <SendIcon />
        )}
      </Button>
    </Box>
  )
}

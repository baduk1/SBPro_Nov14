/**
 * Extract and format error message from API response
 * Handles different error formats from backend:
 * - String errors: "Email already registered"
 * - Validation errors: [{field, message, type}, ...]
 * - Object errors: {field, message, type}
 */
export function extractErrorMessage(err: any, fallbackMessage: string = 'An error occurred'): string {
  // Handle different error formats from backend
  if (err?.response?.data?.detail) {
    const detail = err.response.data.detail

    // Check if detail is an array of validation errors
    if (Array.isArray(detail)) {
      // Format validation errors: "field: message"
      return detail.map((e: any) => {
        const field = e.field || 'Error'
        const message = e.message || e
        return `${field}: ${message}`
      }).join(', ')
    }

    // String error message
    if (typeof detail === 'string') {
      return detail
    }

    // Single validation error object
    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail)
    }
  }

  // Check for message field
  if (err?.response?.data?.message) {
    return err.response.data.message
  }

  // Check for error field
  if (err?.response?.data?.error && typeof err.response.data.error === 'string') {
    return err.response.data.error
  }

  // Fallback to provided message
  return fallbackMessage
}

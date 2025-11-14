/**
 * ProjectOverview Component
 *
 * Main project dashboard showing:
 * - BoQ Summary
 * - Latest exports/artifacts
 * - Team presence
 * - Upcoming tasks
 * - Recent activity
 * - Quick actions
 *
 * Layout: 2-column Grid (md=8 left column, md=4 right sidebar)
 */

import { Box, Grid, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

// Widget components
import BoQSummaryWidget from './widgets/BoQSummaryWidget'
import LatestExportsWidget from './widgets/LatestExportsWidget'
import TeamPresenceWidget from './widgets/TeamPresenceWidget'
import UpcomingTasksWidget from './widgets/UpcomingTasksWidget'
import RecentHistoryWidget from './widgets/RecentHistoryWidget'
import QuickActionsWidget from './widgets/QuickActionsWidget'

export default function ProjectOverview() {
  const { id: projectId } = useParams<{ id: string }>()

  if (!projectId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Project Overview
        </Typography>
        <Typography color="error">Project ID is missing</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Overview
      </Typography>

      <Grid container spacing={3}>
        {/* Left column - Main content */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* BoQ Summary - Full width */}
            <Grid item xs={12}>
              <BoQSummaryWidget projectId={projectId} />
            </Grid>

            {/* Latest Exports - Full width */}
            <Grid item xs={12}>
              <LatestExportsWidget projectId={projectId} />
            </Grid>

            {/* Upcoming Tasks - Full width */}
            <Grid item xs={12}>
              <UpcomingTasksWidget projectId={projectId} />
            </Grid>

            {/* Recent Activity - Full width */}
            <Grid item xs={12}>
              <RecentHistoryWidget projectId={projectId} />
            </Grid>
          </Grid>
        </Grid>

        {/* Right sidebar - Quick actions and team */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Quick Actions */}
            <Grid item xs={12}>
              <QuickActionsWidget projectId={projectId} />
            </Grid>

            {/* Team Presence */}
            <Grid item xs={12}>
              <TeamPresenceWidget projectId={projectId} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}

# SkyBuild Pro - User Frontend

React + TypeScript + Vite frontend application for SkyBuild Pro construction cost estimation platform.

## Features

- **User Authentication**: Sign up, login, email verification
- **Onboarding Wizard**: 3-step onboarding flow for new users
- **Project Management**: Create and manage construction projects
- **File Upload**: Upload IFC, DWG, and PDF files with progress tracking
- **BOQ Generation**: Bill of Quantities extraction from construction documents
- **Templates**: Create and manage reusable cost estimation templates
- **Estimates**: Detailed estimates with items and cost adjustments
- **Supplier Management**: Manage suppliers and pricing catalogs
- **Export**: Export BOQ data to CSV, XLSX, and PDF formats

## Tech Stack

- **React** 18.3 with TypeScript
- **Vite** 6.0 - Fast build tool and dev server
- **Material-UI (MUI)** v5 - Component library
- **React Router** v6 - Client-side routing
- **React Query** - Server state management
- **Axios** - HTTP client
- **PDF Export** - jsPDF with html2canvas

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:8000` (see `backend/README.md`)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file in the root of this directory:

```bash
# Backend API URL (required)
VITE_API_URL=http://localhost:8000/api/v1

# Optional
# VITE_DEBUG=true
```

**Important:** All Vite environment variables must be prefixed with `VITE_`

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Navbar.tsx
│   ├── FileUpload.tsx
│   ├── DataTable.tsx
│   └── ...
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── Onboarding.tsx
│   ├── SignUp.tsx
│   ├── SignIn.tsx
│   ├── Templates/
│   │   ├── TemplatesListNew.tsx
│   │   └── TemplateDetailsNew.tsx
│   ├── Estimates/
│   │   ├── EstimatesListNew.tsx
│   │   └── EstimateDetailsNew.tsx
│   └── ...
├── services/          # API client and utilities
│   ├── api.ts         # Main API client with all endpoints
│   └── pdfExport.ts
├── hooks/             # Custom React hooks
│   ├── useAuth.ts
│   └── useColorMode.tsx
├── types/             # TypeScript type definitions
│   └── extended.ts
├── main.tsx           # Application entry point
├── App.tsx            # Root component
└── theme.ts           # MUI theme configuration
```

## Key Files

### `src/services/api.ts`

Main API client with all backend endpoints organized by resource:

```typescript
// Authentication
auth.login(email, password)
auth.register(email, password, fullName)
auth.verifyEmail(token)
auth.me()

// Templates
templates.list()
templates.get(id)
templates.create(data)
templates.update(id, data)
templates.delete(id)
templates.applyToJob(templateId, jobId)

// Estimates
estimates.list()
estimates.get(id)
estimates.create(data)
estimates.update(id, data)
estimates.delete(id)

// Jobs
jobs.create(projectId, fileId, fileType)
jobs.list()
jobs.get(id)
jobs.takeoff(id)
jobs.export(id, format)

// And more...
```

### `src/main.tsx`

Application routing configuration with protected routes:

- `/` - Landing page
- `/signup` - User registration
- `/signin` - User login
- `/verify-email` - Email verification
- `/onboarding` - New user onboarding
- `/app/*` - Protected application routes
  - `/app/dashboard` - Main dashboard
  - `/app/projects` - Projects list
  - `/app/templates` - Templates management
  - `/app/estimates` - Estimates management
  - `/app/suppliers` - Suppliers management

## Development

### Running in Development

```bash
npm run dev
```

- Hot module replacement (HMR) enabled
- API proxy configured in `vite.config.ts`
- TypeScript type checking in IDE

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
# Preview build locally
npm run preview
```

### Code Style

- ESLint configuration in `.eslintrc.cjs`
- TypeScript strict mode enabled
- Functional components with hooks
- Material-UI styling with `sx` prop

## API Integration

### Authentication Flow

```typescript
// 1. Register
await auth.register('user@example.com', 'password123', 'John Doe')

// 2. Verify email (user receives email with token)
await auth.verifyEmail(token)

// 3. Login
const { access_token } = await auth.login('user@example.com', 'password123')
localStorage.setItem('token', access_token)

// 4. Access protected endpoints
const user = await auth.me() // Token automatically included
```

### File Upload Flow

```typescript
// 1. Request presigned URL
const { file_id, upload_url, headers } = await files.presign(
  projectId,
  file.name,
  file.type
)

// 2. Upload file directly to storage
await axios.put(upload_url, file, { headers })

// 3. Create processing job
const job = await jobs.create(projectId, file_id, 'IFC')

// 4. Poll for status
const interval = setInterval(async () => {
  const job = await jobs.get(jobId)
  if (job.status === 'COMPLETED') {
    clearInterval(interval)
    const boq = await jobs.takeoff(jobId)
  }
}, 2000)
```

## Common Issues

### API Connection Failed

**Error:** Network error or CORS error in console

**Solution:**
1. Verify backend is running: `curl http://localhost:8000/healthz`
2. Check `VITE_API_URL` in `.env` file
3. Ensure backend CORS allows `http://localhost:5173`
4. Restart dev server after changing `.env`

### Build Fails

**Error:** TypeScript errors during build

**Solution:**
```bash
# Check types
npm run type-check

# Fix common issues
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Working

**Solution:**
- Ensure variables are prefixed with `VITE_`
- Restart dev server after changing `.env`
- Variables are embedded at build time, rebuild if changed

## Testing

```bash
# Run tests (when implemented)
npm run test

# Watch mode
npm run test:watch
```

## Deployment

### Build for Production

```bash
# Set production API URL
echo "VITE_API_URL=https://api.yourdomain.com/api/v1" > .env

# Build
npm run build

# Output in dist/ directory
```

### Deploy to Nginx

```bash
# Copy built files
sudo cp -r dist/* /var/www/skybuild/

# Nginx configuration (example)
# See main DEPLOYMENT.md for full configuration
```

### Deploy with Docker

```dockerfile
# See apps/user-frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Performance Optimization

### Code Splitting

Vite automatically code-splits routes and lazy-loaded components:

```typescript
// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EstimateDetails = lazy(() => import('./pages/Estimates/EstimateDetailsNew'))
```

### Asset Optimization

- Images: Use WebP format when possible
- Icons: Material-UI icons are tree-shaken automatically
- Fonts: Roboto font loaded from CDN in `index.html`

### Caching Strategy

Production build includes cache-busting hashes in filenames:
```
index-a1b2c3d4.js
main-e5f6g7h8.css
```

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

Configured in `package.json`:
```json
"browserslist": {
  "production": [">0.2%", "not dead", "not op_mini all"],
  "development": ["last 1 chrome version", "last 1 firefox version"]
}
```

## Contributing

1. Create feature branch
2. Make changes following code style
3. Test thoroughly
4. Submit pull request

## Related Documentation

- [Main README](../../README.md) - Project overview
- [Backend README](../../backend/README.md) - Backend setup
- [Deployment Guide](../../DEPLOYMENT.md) - Production deployment
- [Environment Guide](../../ENVIRONMENT.md) - Configuration

## Support

For issues or questions:
- Check browser console for errors
- Verify API connection
- Review [Common Issues](#common-issues)
- Contact: support@skybuild.pro

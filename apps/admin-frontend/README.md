# SkyBuild Pro - Admin Frontend

React + TypeScript + Vite admin panel for managing SkyBuild Pro platform operations.

## Features

- **Access Request Management**: Review and approve/reject user access requests
- **Price Lists Management**: Create and manage global pricing catalogs
- **CSV Bulk Import**: Import pricing items from CSV files
- **DWG Layer Mapping**: Configure DWG layer to BOQ element type mappings
- **IFC Class Mapping**: Configure IFC class to BOQ element type mappings
- **Admin Dashboard**: Overview of platform statistics

## Tech Stack

- **React** 18.3 with TypeScript
- **Vite** 6.0 - Fast build tool and dev server
- **Material-UI (MUI)** v5 - Component library
- **React Router** v6 - Client-side routing
- **React Query** - Server state management
- **Axios** - HTTP client
- **MUI Data Grid** - Advanced data tables

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:8000` (see `backend/README.md`)
- Admin user account (role: 'admin')

### Installation

```bash
# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

The admin panel will be available at `http://localhost:5174`

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
├── pages/                  # Page components
│   ├── AdminDashboard.tsx  # Main dashboard
│   ├── AccessRequests.tsx  # User access management
│   ├── PriceLists.tsx      # Price list management
│   ├── DwgMappings.tsx     # DWG layer mappings
│   └── IfcMappings.tsx     # IFC class mappings
├── services/               # API client
│   └── api.ts              # Admin API endpoints
├── components/             # Reusable components
│   └── Navbar.tsx
├── hooks/                  # Custom hooks
│   └── useAuth.ts
├── main.tsx                # Application entry point
├── App.tsx                 # Root component
└── theme.ts                # MUI theme
```

## Admin API Endpoints

### Access Requests

```typescript
// List all access requests
GET /admin/access-requests
Response: AccessRequest[]

// Approve/reject access request
PATCH /admin/access-requests/:id
Body: { status: 'approved' | 'rejected' }
Response: AccessRequest
```

### Price Lists

```typescript
// List all price lists
GET /admin/price-lists
Response: PriceList[]

// Get active price list
GET /admin/price-lists/active
Response: PriceList

// Create new price list
POST /admin/price-lists
Body: { name, description?, effective_from? }
Response: PriceList

// Update price list
PATCH /admin/price-lists/:id
Body: { name?, description?, is_active? }
Response: PriceList

// Bulk import items from CSV
POST /admin/price-lists/:id/items:bulk
Body: FormData with CSV file
Response: { imported: number }
```

### Mappings

```typescript
// Get DWG layer mappings
GET /admin/mappings/dwg-layers
Response: DwgLayerMap[]

// Update DWG layer mappings
PUT /admin/mappings/dwg-layers
Body: DwgLayerMap[]
Response: { updated: number }

// Get IFC class mappings
GET /admin/mappings/ifc-classes
Response: IfcClassMap[]

// Update IFC class mappings
PUT /admin/mappings/ifc-classes
Body: IfcClassMap[]
Response: { updated: number }
```

## Authentication

Admin panel requires admin role authentication:

```typescript
// Login as admin
const { access_token } = await auth.login('admin@example.com', 'password')
localStorage.setItem('token', access_token)

// Verify admin role
const user = await auth.me()
if (user.role !== 'admin') {
  // Redirect to user app
}
```

## Key Features

### Access Request Management

Review and process user access requests:

1. View all pending access requests
2. Review user information (email, company, reason)
3. Approve or reject requests
4. Filter by status (pending, approved, rejected)

### Price List Management

Create and manage platform-wide pricing:

1. Create new price lists with effective dates
2. Set active price list
3. Import pricing items from CSV
4. Edit individual pricing items
5. View pricing history

**CSV Format for Bulk Import:**
```csv
code,description,unit,unit_price,currency
WALL-001,Standard Wall,m2,25.50,USD
SLAB-001,Concrete Slab,m3,150.00,USD
```

### DWG Layer Mapping

Configure how DWG layers map to BOQ element types:

1. Define layer name patterns (e.g., "WALL_*")
2. Map to element types (Wall, Slab, etc.)
3. Set default units
4. Save mappings

### IFC Class Mapping

Configure how IFC classes map to BOQ element types:

1. Define IFC class names (e.g., "IfcWall")
2. Map to element types
3. Set default units
4. Save mappings

## Development

### Running in Development

```bash
npm run dev
```

- Admin panel runs on different port than user app (5174 vs 5173)
- Hot module replacement enabled
- TypeScript type checking in IDE

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
# Preview build locally
npm run preview
```

## Security Considerations

### Admin Access Control

- All admin endpoints require `role: 'admin'` in JWT
- Backend validates admin role on every request
- Frontend checks user role and redirects non-admins

### Session Management

- JWT token stored in localStorage
- Auto-redirect to login on 401 errors
- Token included in all API requests via interceptor

## Common Issues

### Access Denied (403)

**Error:** User lacks admin permissions

**Solution:**
1. Verify user has `role: 'admin'` in database
2. Check JWT token contains admin role
3. Re-login to get fresh token

### API Connection Failed

**Error:** Network error or CORS error

**Solution:**
1. Verify backend is running: `curl http://localhost:8000/healthz`
2. Check `VITE_API_URL` in `.env`
3. Ensure backend CORS allows `http://localhost:5174`
4. Restart dev server after changing `.env`

### CSV Import Fails

**Error:** Invalid CSV format

**Solution:**
1. Check CSV has required columns: code, description, unit, unit_price, currency
2. Ensure no special characters in headers
3. Verify encoding is UTF-8
4. Check for proper comma separation

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
sudo cp -r dist/* /var/www/skybuild-admin/

# Nginx configuration
# Serve on admin.yourdomain.com or yourdomain.com/admin
```

### Deploy with Docker

```dockerfile
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

## Admin Tasks

### Creating Admin User

From backend directory:

```bash
# Activate virtual environment
source venv/bin/activate

# Run Python shell
python

# Create admin user
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email="admin@yourdomain.com",
    hash=get_password_hash("secure-admin-password"),
    role="admin",
    email_verified=True,
    credits_balance=0
)
db.add(admin)
db.commit()
print(f"Admin created: {admin.email}")
```

### Activating Price List

1. Go to Price Lists page
2. Find desired price list
3. Click "Set Active" button
4. Only one price list can be active at a time

### Updating Mappings

1. Go to DWG Mappings or IFC Mappings page
2. Edit mappings in the data grid
3. Add new rows as needed
4. Click "Save Mappings" to persist changes

## Performance

### Optimizations

- MUI Data Grid virtualization for large datasets
- React Query caching for API responses
- Code splitting for route-based lazy loading
- Debounced search and filter inputs

### Best Practices

- Keep price lists under 10,000 items for optimal performance
- Use pagination for large datasets
- Cache frequently accessed mappings

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

## Contributing

1. Create feature branch
2. Follow code style guidelines
3. Test admin functionality thoroughly
4. Submit pull request

## Related Documentation

- [Main README](../../README.md) - Project overview
- [Backend README](../../backend/README.md) - Backend setup
- [User Frontend README](../user-frontend/README.md) - User app
- [Deployment Guide](../../DEPLOYMENT.md) - Production deployment
- [Environment Guide](../../ENVIRONMENT.md) - Configuration

## Support

For admin panel issues:
- Check browser console for errors
- Verify admin role in database
- Review backend logs
- Contact: admin@skybuild.pro

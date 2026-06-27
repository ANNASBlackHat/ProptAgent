Folder structure:
/app                    → Next.js App Router pages
/app/api               → API route handlers
/components            → Shared UI components
/lib                   → Utilities (db.ts, auth.ts, email.ts, ai.ts)
/models                → Mongoose models
/types                 → TypeScript interfaces
/hooks                 → Custom React hooks

API response format (always):
  Success: { success: true, data: <payload> }
  Error:   { success: false, error: "<message>" }

Naming:
  Models: PascalCase singular (User, Property, Unit, Application)
  API routes: kebab-case (/api/auth/login, /api/properties/[id]/units)
  Components: PascalCase (PropertyCard, UnitStatusBadge)
  Hooks: camelCase with use prefix (useAuth, useProperties)

Auth middleware:
  All protected API routes use withAuth(handler, allowedRoles[])
  Roles: 'super_admin' | 'landlord' | 'tenant'

Error handling:
  All API routes wrapped in try/catch
  Mongoose validation errors → 400
  Auth errors → 401
  Not found → 404
  Server errors → 500
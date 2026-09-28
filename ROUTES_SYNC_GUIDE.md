# Routes Synchronization Guide

This guide explains how to generate routes from your Next.js app directory and sync them to the database.

## Overview

The route synchronization system consists of two main scripts:

1. **generate-routes.js** - Scans your `app` directory and generates a JSON file with all available routes
2. **sync-routes-to-db.js** - Syncs the generated routes to the database, following specific business logic

## Prerequisites

- Node.js installed
- Database connection configured in `.env`
- Prisma migrations applied

## Step-by-Step Usage

### Step 1: Generate Routes from App Directory

This script scans your Next.js `app` directory and creates a `lib/routes.json` file with all available routes.

**Using npm script:**
```bash
npm run generate-routes
```

**Or using direct node command:**
```bash
node scripts/generate-routes.js
```

**Output:**
```
✓ Generated 12 routes
✓ Saved to lib/routes.json

Routes:
  /
  /admin
  /admin/rbac
  /admin/users
  /dashboard
  /forgot
  /forgot/reset
  /forgot/verify
  /login
  /profile
  /register
  /unauthorized
```

**Generated file:** `lib/routes.json`
```json
{
  "generatedAt": "2026-03-03T05:59:19.377Z",
  "totalRoutes": 12,
  "routes": [
    "/",
    "/admin",
    "/admin/rbac",
    "/admin/users",
    "/dashboard",
    "/forgot",
    "/forgot/reset",
    "/forgot/verify",
    "/login",
    "/profile",
    "/register",
    "/unauthorized"
  ]
}
```

---

### Step 2: Sync Routes to Database

This script takes the generated routes and syncs them to the database with intelligent logic.

**Using npm script:**
```bash
npm run sync-routes
```

**Or using direct node command:**
```bash
node scripts/sync-routes-to-db.js
```

**Output:**
```
Starting route synchronization...

Found 12 routes from app directory

✓ Found existing "Not Assign Routes" group with ID: 1

Found 5 existing routes in database

6 new routes to add:

  ✓ Added: /admin (name: "Admin")
  ✓ Added: /admin/rbac (name: "Rbac")
  ✓ Added: /admin/users (name: "Users")
  ✓ Added: /dashboard (name: "Dashboard")
  ✓ Added: /profile (name: "Profile")
  ✓ Added: /unauthorized (name: "Unauthorized")

✓ Successfully added 6 new routes to database
✓ All routes assigned to group: "Not Assign Routes" (ID: 1)
```

---

## Combined Workflow

Run both scripts in sequence:

**Using npm script:**
```bash
npm run generate-routes && npm run sync-routes
```

**Or using direct node commands:**
```bash
node scripts/generate-routes.js && node scripts/sync-routes-to-db.js
```

---

## How It Works

### Route Generation (`generate-routes.js`)

1. Scans the `app` directory recursively
2. Identifies all `page.tsx` and `page.ts` files
3. Extracts route paths from directory structure
4. Handles route groups (directories in parentheses like `(auth)`)
5. Generates `lib/routes.json` with all routes

### Route Synchronization (`sync-routes-to-db.js`)

The sync script follows this logic:

#### 1. **Check/Create "Not Assign Routes" Group**
   - Queries the `RouteGroup` table for a group named "Not Assign Routes"
   - If it exists, uses that group ID
   - If it doesn't exist, creates a new group with that name

#### 2. **Compare Routes**
   - Reads all routes from `lib/routes.json`
   - Fetches all existing routes from the database
   - Compares using the `path` field with `===` operator
   - Identifies new routes that don't exist in the database

#### 3. **Extract Route Names**
   - Converts path to a readable name
   - Examples:
     - `/admin/users` → "Users" (last segment)
     - `/forgot/reset` → "Reset" (last segment)
     - `/admin/[id]` → "Admin" (previous segment, skips dynamic parts)
     - `/` → "Home" (root path)

#### 4. **Insert New Routes**
   - Creates new route records with:
     - `path`: The route path (e.g., `/admin/users`)
     - `name`: Extracted name (e.g., "Users")
     - `groupId`: "Not Assign Routes" group ID
     - `visibleToAdmin`: `true`
     - `editableByAdmin`: `false`
     - `visibleToSuperAdmin`: `true`
     - `editableBySuperAdmin`: `true`

---

## Database Schema Reference

### RouteGroup Table
```prisma
model RouteGroup {
  id              BigInt           @id @default(autoincrement())
  name            String           @unique
  routes          Route[]
  roleRouteGroups RoleRouteGroup[]
  createdAt       DateTime         @default(now())
}
```

### Route Table
```prisma
model Route {
  id                   BigInt     @id @default(autoincrement())
  path                 String     @unique
  name                 String?
  groupId              BigInt
  visibleToAdmin       Boolean    @default(true)
  editableByAdmin      Boolean    @default(false)
  visibleToSuperAdmin  Boolean    @default(true)
  editableBySuperAdmin Boolean    @default(true)
  group                RouteGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt            DateTime   @default(now())
}
```

---

## Examples

### Example 1: Initial Setup

First time running the sync:

```bash
# Generate routes from app directory
node scripts/generate-routes.js

# Sync all routes to database
node scripts/sync-routes-to-db.js
```

Result: All 12 routes are added to the database under "Not Assign Routes" group.

### Example 2: Adding New Pages

After adding new pages to your app:

```bash
# Regenerate routes
node scripts/generate-routes.js

# Sync only new routes
node scripts/sync-routes-to-db.js
```

Result: Only new routes are added; existing routes are skipped.

### Example 3: Using npm Scripts

```bash
# Generate and sync in one command
npm run generate-routes && npm run sync-routes
```

---

## Troubleshooting

### Issue: "Not Assign Routes" group not found

**Solution:** The script will automatically create it on first run.

### Issue: Routes not syncing

**Solution:** 
1. Verify database connection in `.env`
2. Ensure Prisma migrations are applied: `npm run db:push`
3. Check that `lib/routes.json` exists and is valid

### Issue: Duplicate routes

**Solution:** The script uses `path` field for comparison. If a route already exists with the same path, it will be skipped.

---

## Available npm Scripts

```json
{
  "generate-routes": "node scripts/generate-routes.js",
  "sync-routes": "node scripts/sync-routes-to-db.js"
}
```

Run with:
```bash
npm run generate-routes
npm run sync-routes
npm run generate-routes && npm run sync-routes
```

Or use direct node commands:
```bash
node scripts/generate-routes.js
node scripts/sync-routes-to-db.js
node scripts/generate-routes.js && node scripts/sync-routes-to-db.js
```

---

## Notes

- Routes are automatically assigned to the "Not Assign Routes" group
- Route names are extracted intelligently from the path
- Dynamic routes (with `[id]`) use the previous segment as the name
- Existing routes in the database are never modified or deleted
- The sync is idempotent - running it multiple times is safe

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaMariaDb({
  host: process.env.MARIADB_HOST || '127.0.0.1',
  port: Number(process.env.MARIADB_PORT) || 3306,
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'auth',
});

const prisma = new PrismaClient({ adapter });

async function syncRoutesToDatabase() {
  try {
    console.log('Starting route synchronization...\n');

    // Read generated routes from JSON
    const routesJsonPath = path.join(__dirname, '../lib/routes.json');
    const routesData = JSON.parse(fs.readFileSync(routesJsonPath, 'utf-8'));
    const generatedRoutes = routesData.routes;

    console.log(`Found ${generatedRoutes.length} routes from app directory\n`);

    //RouteGroup Name 
    const GroupName ="Not Assign Routes"

    // Step 1: Check or create "Not Assign Routes" group
    let routeGroup = await prisma.routeGroup.findUnique({
      where: { name: GroupName },
    });

    if (!routeGroup) {
      console.log('Creating "Not Assign Routes" group...');
      routeGroup = await prisma.routeGroup.create({
        data: {
          name: GroupName,
        },
      });
      console.log(`✓ Created group with ID: ${routeGroup.id}\n`);
    } else {
      console.log(`✓ Found existing "Not Assign Routes" group with ID: ${routeGroup.id}\n`);
    }

    // Step 2: Get all existing routes from database
    const existingRoutes = await prisma.route.findMany({
      select: { path: true },
    });
    const existingPaths = new Set(existingRoutes.map(r => r.path));

    console.log(`Found ${existingRoutes.length} existing routes in database\n`);

    // Step 3: Filter new routes (not in database)
    const newRoutes = generatedRoutes.filter(route => !existingPaths.has(route));

    console.log(`${newRoutes.length} new routes to add:\n`);

    // Step 4: Extract route name from path
    function extractRouteName(path) {
      // Remove leading slash
      let cleanPath = path.startsWith('/') ? path.slice(1) : path;

      // If empty (root path), return "Home"
      if (!cleanPath) return 'Home';

      // Split by /
      const segments = cleanPath.split('/');

      // Get the last segment
      let lastSegment = segments[segments.length - 1];

      // If last segment contains brackets like [id], use previous segment
      if (lastSegment.includes('[') && lastSegment.includes(']')) {
        lastSegment = segments[segments.length - 2] || lastSegment;
      }

      // Capitalize first letter and replace hyphens with spaces
      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Step 5: Insert new routes
    let addedCount = 0;
    for (const routePath of newRoutes) {
      const routeName = extractRouteName(routePath);

      await prisma.route.create({
        data: {
          path: routePath,
          name: routeName,
          groupId: routeGroup.id,
          visibleToAdmin: true,
          editableByAdmin: true,
          visibleToSuperAdmin: true,
          editableBySuperAdmin: true,
        },
      });

      console.log(`  ✓ Added: ${routePath} (name: "${routeName}")`);
      addedCount++;
    }

    console.log(`\n✓ Successfully added ${addedCount} new routes to database`);
    console.log(`✓ All routes assigned to group: "Not Assign Routes" (ID: ${routeGroup.id})`);

  } catch (error) {
    console.error('Error syncing routes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncRoutesToDatabase();

require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Step 1: Generate routes from app directory
function generateRoutes() {
  console.log('Generating routes from app directory...\n');
  
  const appDir = path.join(__dirname, '../app');
  const routes = [];

  function scanDirectory(dir, prefix = '') {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip special directories
        if (file.startsWith('.') || file.startsWith('_')) {
          return;
        }

        // Handle route groups (directories in parentheses)
        let routeSegment = file;
        if (file.startsWith('(') && file.endsWith(')')) {
          routeSegment = '';
        }

        const newPrefix = prefix + (routeSegment ? '/' + routeSegment : '');

        // Check if this directory has a page.tsx or page.ts
        const pageFile = fs.readdirSync(fullPath).find(f => f === 'page.tsx' || f === 'page.ts');
        if (pageFile) {
          routes.push(newPrefix || '/');
        }

        // Recursively scan subdirectories
        scanDirectory(fullPath, newPrefix);
      } else if (file === 'page.tsx' || file === 'page.ts') {
        // Add route if page file exists
        if (prefix) {
          routes.push(prefix);
        } else {
          routes.push('/');
        }
      }
    });
  }

  scanDirectory(appDir);

  // Remove duplicates and sort
  const uniqueRoutes = [...new Set(routes)].sort();

  console.log(`✓ Found ${uniqueRoutes.length} routes\n`);
  
  return uniqueRoutes;
}

// Step 2: Sync routes to database
async function syncRoutesToDatabase(generatedRoutes) {
  try {
    console.log('Syncing routes to database...\n');

    const GroupName = "Not Assign Routes";

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

// Main execution
async function main() {
  try {
    console.log('========================================');
    console.log('  Route Generation & Database Sync');
    console.log('========================================\n');

    // Generate routes
    const generatedRoutes = generateRoutes();

    // Sync to database
    await syncRoutesToDatabase(generatedRoutes);

    console.log('\n========================================');
    console.log('  ✓ Process completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

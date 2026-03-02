/**
 * Seed script for RBAC data
 * Run with: node scripts/seed-rbac.js
 * 
 * This script creates:
 * - Route Groups (HRM, Leave, Management, report, Showcase)
 * - Routes with patterns and visibility settings
 * - Roles (administration)
 * - Role-RouteGroup assignments
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🌱 Starting RBAC seed...\n');

  try {
    // ============================================
    // 1. CREATE ROUTE GROUPS
    // ============================================
    console.log('📁 Creating Route Groups...');

    const routeGroups = await Promise.all([
      
      prisma.routeGroup.upsert({
        where: { name: 'Management' },
        update: {},
        create: { name: 'Management' },
      }),
    ]);

    const groupMap = {
      HRM: routeGroups[0],
      Leave: routeGroups[1],
      Management: routeGroups[2],
      report: routeGroups[3],
      Showcase: routeGroups[4],
    };

    console.log('✅ Route Groups created:', Object.keys(groupMap).join(', '));

    // ============================================
    // 2. CREATE ROUTES
    // ============================================
    console.log('\n📍 Creating Routes...');

    const routesData = [
      {
         "path": "/admin/users",
         "name": "Users",
         "group": "Management",
         "visibleToAdmin": false,
         "visibleToSuperAdmin": true,
         "editableByAdmin": false,
         "editableBySuperAdmin": true
      },
      {
         "path": "/profile",
         "name": "profile",
         "group": "Management",
         "visibleToAdmin": true,
         "visibleToSuperAdmin": true,
         "editableByAdmin": true,
         "editableBySuperAdmin": true
      },
      {
         "path": "/admin",
         "name": "Amin",
         "group": "Management",
         "visibleToAdmin": true,
         "visibleToSuperAdmin": true,
         "editableByAdmin": true,
         "editableBySuperAdmin": true
      }
    ];

    const routes = await Promise.all(
      routesData.map((route) =>
        prisma.route.upsert({
          where: { path: route.path },
          update: {
            name: route.name,
            visibleToAdmin: route.visibleToAdmin,
            visibleToSuperAdmin: route.visibleToSuperAdmin,
            editableByAdmin: route.editableByAdmin,
            editableBySuperAdmin: route.editableBySuperAdmin,
          },
          create: route,
        })
      )
    );

    console.log(`✅ ${routes.length} Routes created`);

    // ============================================
    // 3. CREATE ROLES
    // ============================================
    console.log('\n👤 Creating Roles...');

    const role = await prisma.role.upsert({
      where: { name: 'administration' },
      update: {},
      create: { name: 'administration' },
    });

    console.log('✅ Role created:', role.name);

    // ============================================
    // 4. ASSIGN ROUTE GROUPS TO ROLES
    // ============================================
    console.log('\n🔗 Assigning Route Groups to Roles...');

    // administration role gets all route groups
    const roleRouteGroupsData = [
      { roleId: role.id, groupId: groupMap.Management.id },
    ];

    const roleRouteGroups = await Promise.all(
      roleRouteGroupsData.map((rrg) =>
        prisma.roleRouteGroup.upsert({
          where: {
            roleId_groupId: {
              roleId: rrg.roleId,
              groupId: rrg.groupId,
            },
          },
          update: {},
          create: rrg,
        })
      )
    );

    console.log(`✅ ${roleRouteGroups.length} Route Groups assigned to role`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✨ RBAC Seed Completed Successfully!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  • Route Groups: ${Object.keys(groupMap).length}`);
    console.log(`  • Routes: ${routes.length}`);
    console.log(`  • Roles: 1`);
    console.log(`  • Role-RouteGroup Assignments: ${roleRouteGroups.length}`);
    console.log('\n📝 Next Steps:');
    console.log('  1. Go to /rbac page');
    console.log('  2. Assign users to the "administration" role');
    console.log('  3. Users will have access to all routes');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

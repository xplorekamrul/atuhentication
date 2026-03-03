const fs = require('fs');
const path = require('path');

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

// Create output object
const output = {
  generatedAt: new Date().toISOString(),
  totalRoutes: uniqueRoutes.length,
  routes: uniqueRoutes,
};

// Write to file
const outputPath = path.join(__dirname, '../lib/routes.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✓ Generated ${uniqueRoutes.length} routes`);
console.log(`✓ Saved to lib/routes.json`);
console.log('\nRoutes:');
uniqueRoutes.forEach(route => console.log(`  ${route}`));

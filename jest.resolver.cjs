/**
 * Custom Jest resolver to handle path resolution
 */
module.exports = (path, options) => {
  // Special handling for @testing-library/user-event
  if (path === '@testing-library/user-event') {
    try {
      return options.defaultResolver('@testing-library/user-event/dist/cjs/index.js', options);
    } catch (error) {
      // Fallback to normal resolution
    }
  }

  // Call the default resolver
  return options.defaultResolver(path, {
    ...options,
    // Add support for module path mapping
    packageFilter: pkg => {
      // Handle ESM packages
      if (pkg.name === 'next' || pkg.name.startsWith('@next') || pkg.name.startsWith('@supabase')) {
        delete pkg.exports;
        delete pkg.module;
        delete pkg.type;
        pkg.main = pkg.main || 'index.js';
      }
      
      // Handle @testing-library packages
      if (pkg.name.startsWith('@testing-library')) {
        delete pkg.exports;
        delete pkg.module;
        delete pkg.type;
        pkg.main = pkg.main || 'index.js';
      }
      return pkg;
    },
  });
};

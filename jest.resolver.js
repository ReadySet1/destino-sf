/**
 * Custom Jest resolver to handle path resolution
 */
module.exports = (path, options) => {
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
      return pkg;
    },
  });
};

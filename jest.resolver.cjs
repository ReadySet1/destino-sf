/**
 * Custom Jest resolver to handle path resolution - CRITICAL PHASE 2 FIX
 */
module.exports = (path, options) => {
  // CRITICAL FIX for zod v3/index.js error - force specific resolution
  if (path === 'zod') {
    const zodPath = require.resolve('zod');
    return zodPath;
  }
  
  // Handle zod internals - prevent v3/index.js errors
  if (path.includes('zod') && path.includes('v3')) {
    return options.defaultResolver('zod', options);
  }

  // Special handling for @testing-library/user-event
  if (path === '@testing-library/user-event') {
    try {
      return options.defaultResolver('@testing-library/user-event/dist/cjs/index.js', options);
    } catch (error) {
      // Fallback to normal resolution
      return options.defaultResolver(path, options);
    }
  }

  // Special handling for uuid
  if (path === 'uuid') {
    try {
      return options.defaultResolver('uuid/dist/cjs/index.js', options);
    } catch (error) {
      return options.defaultResolver(path, options);
    }
  }

  // Use default resolver for everything else
  return options.defaultResolver(path, options);
};

import React from 'react';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Simply render the children without adding extra containers
  return children;
}

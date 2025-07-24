// Responsive Hook for Admin Layout
// This hook provides responsive state management and breakpoint detection

import { useState, useEffect } from 'react';
import { getCurrentBreakpoint, isBreakpoint } from '@/utils/admin-layout';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide';
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isWide: false,
    currentBreakpoint: 'mobile',
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function updateResponsiveState() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const currentBreakpoint = getCurrentBreakpoint(width);

      setState({
        isMobile: isBreakpoint('mobile', width),
        isTablet: isBreakpoint('tablet', width),
        isDesktop: isBreakpoint('desktop', width),
        isWide: isBreakpoint('wide', width),
        currentBreakpoint,
        width,
        height,
      });
    }

    // Set initial state
    updateResponsiveState();

    // Add event listener
    window.addEventListener('resize', updateResponsiveState);

    // Cleanup
    return () => window.removeEventListener('resize', updateResponsiveState);
  }, []);

  return state;
}

export function useBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide'): boolean {
  const { currentBreakpoint } = useResponsive();
  
  switch (breakpoint) {
    case 'mobile':
      return currentBreakpoint === 'mobile';
    case 'tablet':
      return currentBreakpoint === 'tablet';
    case 'desktop':
      return currentBreakpoint === 'desktop';
    case 'wide':
      return currentBreakpoint === 'wide';
    default:
      return false;
  }
}

export function useIsMobile(): boolean {
  return useBreakpoint('mobile');
}

export function useIsTablet(): boolean {
  return useBreakpoint('tablet');
}

export function useIsDesktop(): boolean {
  return useBreakpoint('desktop');
}

export function useIsWide(): boolean {
  return useBreakpoint('wide');
} 
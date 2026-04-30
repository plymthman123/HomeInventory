import { useWindowDimensions } from 'react-native'

const BREAKPOINTS = {
  tablet:  768,
  desktop: 1024,
}

export function useBreakpoint() {
  const { width } = useWindowDimensions()
  return {
    isMobile:  width < BREAKPOINTS.tablet,
    isTablet:  width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
    // Sidebar shows on tablet and desktop
    showSidebar: width >= BREAKPOINTS.tablet,
  }
}

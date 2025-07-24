// Admin Layout Design System Types
// This file defines the TypeScript interfaces for the admin layout consistency system

export type ResponsiveValue<T> = {
  mobile: T;
  tablet: T;
  desktop: T;
  wide?: T;
};

export type BreakpointSystem = {
  mobile: string;
  tablet: string;
  desktop: string;
  wide: string;
};

export interface AdminLayoutConfig {
  sidebarWidth: ResponsiveValue<string>;
  contentPadding: ResponsiveValue<string>;
  containerMaxWidth: ResponsiveValue<string>;
  headerHeight: ResponsiveValue<string>;
  mobileMenuPosition: {
    top: string;
    right: string;
    left?: string;
  };
}

export interface ComponentSizing {
  touchTarget: string;
  inputHeight: ResponsiveValue<string>;
  buttonSizes: Record<'sm' | 'md' | 'lg', ResponsiveValue<string>>;
  iconSizes: Record<'sm' | 'md' | 'lg', string>;
}

export interface TypographyScale {
  headings: {
    h1: ResponsiveValue<string>;
    h2: ResponsiveValue<string>;
    h3: ResponsiveValue<string>;
    h4: ResponsiveValue<string>;
    h5: ResponsiveValue<string>;
    h6: ResponsiveValue<string>;
  };
  body: ResponsiveValue<string>;
  caption: ResponsiveValue<string>;
  button: ResponsiveValue<string>;
}

export interface SpacingSystem {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  pagePadding: ResponsiveValue<string>;
  componentGap: ResponsiveValue<string>;
  sectionGap: ResponsiveValue<string>;
}

export interface AdminLayoutTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface TableResponsiveConfig {
  mobileCardLayout: boolean;
  horizontalScroll: boolean;
  columnVisibility: ResponsiveValue<Record<string, boolean>>;
  actionButtonLayout: 'stack' | 'horizontal' | 'dropdown';
}

export interface FormLayoutConfig {
  labelPosition: 'top' | 'left';
  inputSpacing: ResponsiveValue<string>;
  buttonLayout: 'stack' | 'horizontal';
  validationMessagePosition: 'below' | 'inline';
}

export interface ModalConfig {
  maxWidth: ResponsiveValue<string>;
  maxHeight: ResponsiveValue<string>;
  padding: ResponsiveValue<string>;
  mobileFullScreen: boolean;
  backdropBlur: boolean;
}

// Default configuration values
export const DEFAULT_BREAKPOINTS: BreakpointSystem = {
  mobile: '0px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};

export const DEFAULT_LAYOUT_CONFIG: AdminLayoutConfig = {
  sidebarWidth: {
    mobile: '280px',
    tablet: '240px',
    desktop: '256px',
    wide: '280px',
  },
  contentPadding: {
    mobile: '1rem',
    tablet: '1.5rem',
    desktop: '2rem',
    wide: '2.5rem',
  },
  containerMaxWidth: {
    mobile: '100%',
    tablet: '100%',
    desktop: '1200px',
    wide: '1400px',
  },
  headerHeight: {
    mobile: '64px',
    tablet: '64px',
    desktop: '72px',
    wide: '72px',
  },
  mobileMenuPosition: {
    top: '1rem',
    right: '1rem',
  },
};

export const DEFAULT_COMPONENT_SIZING: ComponentSizing = {
  touchTarget: '44px',
  inputHeight: {
    mobile: '40px',
    tablet: '40px',
    desktop: '44px',
    wide: '44px',
  },
  buttonSizes: {
    sm: {
      mobile: '32px',
      tablet: '32px',
      desktop: '36px',
      wide: '36px',
    },
    md: {
      mobile: '40px',
      tablet: '40px',
      desktop: '44px',
      wide: '44px',
    },
    lg: {
      mobile: '48px',
      tablet: '48px',
      desktop: '52px',
      wide: '52px',
    },
  },
  iconSizes: {
    sm: '16px',
    md: '20px',
    lg: '24px',
  },
};

export const DEFAULT_TYPOGRAPHY: TypographyScale = {
  headings: {
    h1: {
      mobile: 'text-2xl',
      tablet: 'text-3xl',
      desktop: 'text-4xl',
      wide: 'text-5xl',
    },
    h2: {
      mobile: 'text-xl',
      tablet: 'text-2xl',
      desktop: 'text-3xl',
      wide: 'text-4xl',
    },
    h3: {
      mobile: 'text-lg',
      tablet: 'text-xl',
      desktop: 'text-2xl',
      wide: 'text-3xl',
    },
    h4: {
      mobile: 'text-base',
      tablet: 'text-lg',
      desktop: 'text-xl',
      wide: 'text-2xl',
    },
    h5: {
      mobile: 'text-sm',
      tablet: 'text-base',
      desktop: 'text-lg',
      wide: 'text-xl',
    },
    h6: {
      mobile: 'text-xs',
      tablet: 'text-sm',
      desktop: 'text-base',
      wide: 'text-lg',
    },
  },
  body: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-base',
    wide: 'text-base',
  },
  caption: {
    mobile: 'text-xs',
    tablet: 'text-sm',
    desktop: 'text-sm',
    wide: 'text-sm',
  },
  button: {
    mobile: 'text-sm',
    tablet: 'text-sm',
    desktop: 'text-base',
    wide: 'text-base',
  },
};

export const DEFAULT_SPACING: SpacingSystem = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  pagePadding: {
    mobile: '1rem',
    tablet: '1.5rem',
    desktop: '2rem',
    wide: '2.5rem',
  },
  componentGap: {
    mobile: '0.75rem',
    tablet: '1rem',
    desktop: '1.25rem',
    wide: '1.5rem',
  },
  sectionGap: {
    mobile: '1.5rem',
    tablet: '2rem',
    desktop: '2.5rem',
    wide: '3rem',
  },
};

export const DEFAULT_THEME: AdminLayoutTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
  },
};

export const DEFAULT_TABLE_CONFIG: TableResponsiveConfig = {
  mobileCardLayout: true,
  horizontalScroll: false,
  columnVisibility: {
    mobile: {
      id: true,
      customerName: true,
      status: true,
      total: true,
      actions: true,
    },
    tablet: {
      id: true,
      customerName: true,
      status: true,
      total: true,
      date: true,
      actions: true,
    },
    desktop: {
      id: true,
      customerName: true,
      status: true,
      total: true,
      date: true,
      paymentStatus: true,
      actions: true,
    },
  },
  actionButtonLayout: 'dropdown',
};

export const DEFAULT_FORM_CONFIG: FormLayoutConfig = {
  labelPosition: 'top',
  inputSpacing: {
    mobile: '0.75rem',
    tablet: '1rem',
    desktop: '1.25rem',
    wide: '1.5rem',
  },
  buttonLayout: 'stack',
  validationMessagePosition: 'below',
};

export const DEFAULT_MODAL_CONFIG: ModalConfig = {
  maxWidth: {
    mobile: '100%',
    tablet: '90%',
    desktop: '600px',
    wide: '700px',
  },
  maxHeight: {
    mobile: '100%',
    tablet: '90%',
    desktop: '80%',
    wide: '80%',
  },
  padding: {
    mobile: '1rem',
    tablet: '1.5rem',
    desktop: '2rem',
    wide: '2rem',
  },
  mobileFullScreen: true,
  backdropBlur: true,
}; 
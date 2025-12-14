/**
 * Centralized email design tokens for Destino SF
 * These colors and styles match the e-commerce website brand identity
 */

// =============================================================================
// BRAND COLORS
// =============================================================================

export const emailColors = {
  // Primary brand colors
  primary: '#fdc32d', // Destino Yellow - main brand color
  primaryDark: '#e5b028', // Darker yellow for hover states
  primaryLight: '#fef3c7', // Light yellow for backgrounds

  // Secondary colors
  secondary: '#2d3538', // Charcoal - primary text color
  secondaryLight: '#4a5568', // Lighter charcoal for secondary text

  // Accent colors
  accent: '#f77c22', // Orange - accent color for highlights
  accentLight: '#fed7aa', // Light orange for backgrounds
  accentDark: '#ea580c', // Darker orange for hover

  // Background colors
  background: '#fcfcf5', // Cream - main background
  backgroundAlt: '#f8fafc', // Alternative light background
  white: '#ffffff',

  // Text colors
  text: '#2d3538', // Primary text (charcoal)
  textMuted: '#666970', // Muted text
  textLight: '#94a3b8', // Light text for less emphasis

  // Border colors
  border: '#e5e7eb', // Standard border
  borderLight: '#f3f4f6', // Light border
  borderDark: '#d1d5db', // Dark border

  // Semantic colors (kept for specific use cases)
  success: '#059669', // Green for payment success
  successLight: '#dcfce7', // Light green background
  successDark: '#166534', // Dark green text

  error: '#dc2626', // Red for errors
  errorLight: '#fee2e2', // Light red background
  errorDark: '#991b1b', // Dark red text

  warning: '#f59e0b', // Amber for warnings
  warningLight: '#fef3c7', // Light amber background
  warningDark: '#92400e', // Dark amber text

  info: '#0ea5e9', // Blue for info
  infoLight: '#e0f2fe', // Light blue background
  infoDark: '#0369a1', // Dark blue text
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const emailFonts = {
  // Primary font stack (email-safe)
  primary:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  // Monospace for order IDs, codes, etc.
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const emailFontSizes = {
  xs: '11px',
  sm: '12px',
  base: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',
} as const;

export const emailLineHeights = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.625',
} as const;

// =============================================================================
// SPACING & LAYOUT
// =============================================================================

export const emailSpacing = {
  // Padding
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',

  // Container
  containerMaxWidth: '600px',
  containerPadding: '24px',
  containerPaddingMobile: '16px',
} as const;

export const emailBorderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

// =============================================================================
// COMMON STYLE OBJECTS
// =============================================================================

/**
 * Base body style for all emails
 */
export const baseBodyStyle = {
  fontFamily: emailFonts.primary,
  backgroundColor: emailColors.backgroundAlt,
  margin: '0',
  padding: '20px',
  WebkitTextSizeAdjust: '100%',
  MsTextSizeAdjust: '100%',
} as const;

/**
 * Main container style
 */
export const baseContainerStyle = {
  maxWidth: emailSpacing.containerMaxWidth,
  margin: '0 auto',
  backgroundColor: emailColors.white,
  borderRadius: emailBorderRadius.lg,
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
} as const;

/**
 * Header section style
 */
export const headerStyle = {
  backgroundColor: emailColors.primary,
  padding: `${emailSpacing['2xl']} ${emailSpacing.xl}`,
  textAlign: 'center' as const,
} as const;

/**
 * Footer section style
 */
export const footerStyle = {
  backgroundColor: emailColors.background,
  padding: `${emailSpacing['2xl']} ${emailSpacing.xl}`,
  borderTop: `1px solid ${emailColors.border}`,
} as const;

/**
 * Content section style
 */
export const contentSectionStyle = {
  padding: emailSpacing['2xl'],
} as const;

/**
 * Primary button style
 */
export const primaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: emailColors.primary,
  color: emailColors.secondary,
  padding: `${emailSpacing.md} ${emailSpacing['2xl']}`,
  borderRadius: emailBorderRadius.md,
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: emailFontSizes.md,
  textAlign: 'center' as const,
  minHeight: '44px', // Touch-friendly target size
  lineHeight: '44px',
} as const;

/**
 * Secondary button style
 */
export const secondaryButtonStyle = {
  display: 'inline-block',
  backgroundColor: emailColors.white,
  color: emailColors.secondary,
  padding: `${emailSpacing.md} ${emailSpacing['2xl']}`,
  borderRadius: emailBorderRadius.md,
  border: `2px solid ${emailColors.secondary}`,
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: emailFontSizes.md,
  textAlign: 'center' as const,
  minHeight: '44px',
  lineHeight: '40px', // Account for border
} as const;

/**
 * Accent button style (orange)
 */
export const accentButtonStyle = {
  display: 'inline-block',
  backgroundColor: emailColors.accent,
  color: emailColors.white,
  padding: `${emailSpacing.md} ${emailSpacing['2xl']}`,
  borderRadius: emailBorderRadius.md,
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: emailFontSizes.md,
  textAlign: 'center' as const,
  minHeight: '44px',
  lineHeight: '44px',
} as const;

/**
 * Info box style (yellow background)
 */
export const infoBoxStyle = {
  backgroundColor: emailColors.primaryLight,
  border: `1px solid ${emailColors.primary}`,
  borderRadius: emailBorderRadius.lg,
  padding: emailSpacing.xl,
  margin: `${emailSpacing.xl} 0`,
} as const;

/**
 * Alert box style (for warnings/important info)
 */
export const alertBoxStyle = {
  backgroundColor: emailColors.accentLight,
  border: `1px solid ${emailColors.accent}`,
  borderRadius: emailBorderRadius.lg,
  padding: emailSpacing.xl,
  margin: `${emailSpacing.xl} 0`,
} as const;

/**
 * Success box style
 */
export const successBoxStyle = {
  backgroundColor: emailColors.successLight,
  border: `1px solid ${emailColors.success}`,
  borderRadius: emailBorderRadius.lg,
  padding: emailSpacing.xl,
  margin: `${emailSpacing.xl} 0`,
} as const;

/**
 * Error box style
 */
export const errorBoxStyle = {
  backgroundColor: emailColors.errorLight,
  border: `1px solid ${emailColors.error}`,
  borderRadius: emailBorderRadius.lg,
  padding: emailSpacing.xl,
  margin: `${emailSpacing.xl} 0`,
} as const;

/**
 * Card/section style
 */
export const cardStyle = {
  backgroundColor: emailColors.backgroundAlt,
  border: `1px solid ${emailColors.border}`,
  borderRadius: emailBorderRadius.lg,
  padding: emailSpacing['2xl'],
  margin: `${emailSpacing.lg} 0`,
} as const;

/**
 * Link style
 */
export const linkStyle = {
  color: emailColors.accent,
  textDecoration: 'none',
} as const;

/**
 * Divider/HR style
 */
export const dividerStyle = {
  borderColor: emailColors.border,
  borderWidth: '1px',
  borderStyle: 'solid',
  margin: `${emailSpacing.xl} 0`,
} as const;

// =============================================================================
// TEXT STYLES
// =============================================================================

export const headingStyle = {
  fontFamily: emailFonts.primary,
  color: emailColors.secondary,
  fontWeight: '700',
  margin: '0',
  lineHeight: emailLineHeights.tight,
} as const;

export const heading1Style = {
  ...headingStyle,
  fontSize: emailFontSizes['2xl'],
} as const;

export const heading2Style = {
  ...headingStyle,
  fontSize: emailFontSizes.lg,
} as const;

export const heading3Style = {
  ...headingStyle,
  fontSize: emailFontSizes.md,
} as const;

export const paragraphStyle = {
  fontFamily: emailFonts.primary,
  color: emailColors.text,
  fontSize: emailFontSizes.base,
  lineHeight: emailLineHeights.relaxed,
  margin: `0 0 ${emailSpacing.lg} 0`,
} as const;

export const smallTextStyle = {
  fontFamily: emailFonts.primary,
  color: emailColors.textMuted,
  fontSize: emailFontSizes.sm,
  lineHeight: emailLineHeights.normal,
  margin: '0',
} as const;

export const labelStyle = {
  fontFamily: emailFonts.primary,
  color: emailColors.textMuted,
  fontSize: emailFontSizes.sm,
  fontWeight: '600',
  margin: `${emailSpacing.sm} 0`,
} as const;

export const valueStyle = {
  fontFamily: emailFonts.primary,
  color: emailColors.text,
  fontSize: emailFontSizes.base,
  margin: `${emailSpacing.sm} 0`,
} as const;

// =============================================================================
// LOGO URL
// =============================================================================

/**
 * Get the logo URL for emails
 * In production, this should be an absolute URL to your hosted logo
 */
export const getLogoUrl = (baseUrl: string = 'https://destinosf.com') => {
  return `${baseUrl}/images/logo/logo-destino.png`;
};

// =============================================================================
// PAYMENT STATUS STYLES
// =============================================================================

export const getPaymentStatusStyle = (status: string) => {
  const baseStyle = {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    margin: `${emailSpacing.sm} 0`,
    padding: `${emailSpacing.xs} ${emailSpacing.sm}`,
    borderRadius: emailBorderRadius.sm,
    display: 'inline-block',
  };

  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return {
        ...baseStyle,
        backgroundColor: emailColors.successLight,
        color: emailColors.successDark,
      };
    case 'PENDING':
      return {
        ...baseStyle,
        backgroundColor: emailColors.primaryLight,
        color: emailColors.warningDark,
      };
    case 'FAILED':
      return {
        ...baseStyle,
        backgroundColor: emailColors.errorLight,
        color: emailColors.errorDark,
      };
    case 'REFUNDED':
      return {
        ...baseStyle,
        backgroundColor: emailColors.backgroundAlt,
        color: emailColors.textMuted,
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: emailColors.backgroundAlt,
        color: emailColors.textMuted,
      };
  }
};

// =============================================================================
// PREORDER BADGE STYLE
// =============================================================================

export const preorderBadgeStyle = {
  display: 'inline-block',
  padding: `${emailSpacing.xs} ${emailSpacing.sm}`,
  backgroundColor: emailColors.accentLight,
  color: emailColors.accentDark,
  fontSize: emailFontSizes.xs,
  fontWeight: 'bold',
  borderRadius: emailBorderRadius.sm,
  marginLeft: emailSpacing.sm,
  textTransform: 'uppercase' as const,
} as const;

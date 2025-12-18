export const theme = {
  colors: {
    // Background colors
    background: '#0B0A09',
    card: '#151312',
    cardHover: '#1A1816',
    border: '#2C2622',
    
    // Text colors
    text: '#FBFBFC',
    textSecondary: '#AEB3BB',
    textMuted: '#6B7280',
    
    // Brand colors
    primary: '#FF5C7A',
    primaryLight: '#FF8A9E',
    link: '#34D399',
    
    // Vote colors
    upvote: '#FF5C7A',
    downvote: '#93C5FD',
    
    // Status colors
    success: '#34D399',
    warning: '#FBBF24',
    error: '#EF4444',
    
    // Community flair defaults
    flairBackground: '#1E1A18',
    flairText: '#FF5C7A',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },
  
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export type Theme = typeof theme;

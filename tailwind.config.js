/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        primary: {
          DEFAULT: '#7c00c7',
          hover: '#6a00a8',
          active: '#5a0090',
        },
        secondary: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        
        // Surface Colors
        background: '#ffffff',
        foreground: '#171717',
        
        // Muted Colors
        muted: {
          DEFAULT: '#f3f3f3',
          foreground: '#363636',
          active: '#EFE6F5',
        },
        
        // Card Colors
        card: {
          DEFAULT: '#ffffff',
          foreground: '#171717',
        },
        
        // Border
        border: '#E4E4E4',
        
        // Destructive
        destructive: {
          DEFAULT: '#dc2626',
          foreground: '#ffffff',
        },
      },
      
      fontSize: {
        'xs': ['11px', { lineHeight: '14px' }],
        'sm': ['13px', { lineHeight: '16px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'md': ['16px', { lineHeight: '24px' }],
        'lg': ['20px', { lineHeight: '28px' }],
        'xl': ['24px', { lineHeight: '32px' }],
      },
      
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      
      spacing: {
        '18': '72px',
        '20': '80px',
      },
      
      borderRadius: {
        'button': '100px',
        'sm': '4px',
        'md': '8px',
        'lg': '20px',
      },
      
      letterSpacing: {
        'tight': '0.30px',
      },
      
      boxShadow: {
        'elevation-sm': '0px -7.29px 10.498px 0px rgba(0,0,0,0.03), 0px 31.348px 32.077px 0px rgba(0,0,0,0.09), 0px 0px 32.077px 0px rgba(0,0,0,0.08)',
      },
      
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
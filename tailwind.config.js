/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
        '3xl': '8rem',
      },
      screens: {
        "2xl": "1400px",
        "3xl": "1800px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-family)', 'Noto Sans Thai', 'Mitr', 'sans-serif'],
        'mitr': ['Mitr', 'sans-serif'],
        'sarabun': ['Sarabun', 'sans-serif'],
        'prompt': ['Prompt', 'sans-serif'],
        'noto-thai': ['Noto Sans Thai', 'sans-serif'],
        'oswald': ['Oswald', 'sans-serif'],
      },
      fontSize: {
        // iOS 26 Typography Scale
        'micro': ['var(--font-size-micro)', { lineHeight: '1.4', fontWeight: '500' }],
        'caption': ['var(--font-size-caption)', { lineHeight: '1.36', fontWeight: '500' }],
        'footnote': ['var(--font-size-footnote)', { lineHeight: '1.38', fontWeight: '400' }],
        'subhead': ['var(--font-size-subhead)', { lineHeight: '1.33', fontWeight: '400' }],
        'callout': ['var(--font-size-callout)', { lineHeight: '1.25', fontWeight: '400' }],
        'body': ['var(--font-size-body)', { lineHeight: '1.41', fontWeight: '400' }],
        'headline': ['var(--font-size-headline)', { lineHeight: '1.41', fontWeight: '600' }],
        'title3': ['var(--font-size-title3)', { lineHeight: '1.25', fontWeight: '600' }],
        'title2': ['var(--font-size-title2)', { lineHeight: '1.27', fontWeight: '700' }],
        'title1': ['var(--font-size-title1)', { lineHeight: '1.21', fontWeight: '700' }],
        'large-title': ['var(--font-size-large-title)', { lineHeight: '1.18', fontWeight: '700' }],
        // Responsive scaling
        'scaled-xs': ['calc(0.75rem * var(--font-scale, 0.9))', '1rem'],
        'scaled-sm': ['calc(0.875rem * var(--font-scale, 0.9))', '1.25rem'],
        'scaled-base': ['calc(1rem * var(--font-scale, 0.9))', '1.5rem'],
        'scaled-lg': ['calc(1.125rem * var(--font-scale, 0.9))', '1.75rem'],
        'scaled-xl': ['calc(1.25rem * var(--font-scale, 0.9))', '1.75rem'],
        'scaled-2xl': ['calc(1.5rem * var(--font-scale, 0.9))', '2rem'],
        'scaled-3xl': ['calc(1.875rem * var(--font-scale, 0.9))', '2.25rem'],
        'scaled-4xl': ['calc(2.25rem * var(--font-scale, 0.9))', '2.5rem'],
        'scaled-5xl': ['calc(3rem * var(--font-scale, 0.9))', '1'],
        'scaled-6xl': ['calc(3.75rem * var(--font-scale, 0.9))', '1'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
          "muted-foreground": "hsl(var(--success-muted-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
          "muted-foreground": "hsl(var(--warning-muted-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          muted: "hsl(var(--info-muted))",
          "muted-foreground": "hsl(var(--info-muted-foreground))",
        },
        "destructive-muted": "hsl(var(--destructive-muted))",
        "destructive-muted-foreground": "hsl(var(--destructive-muted-foreground))",
      },
      spacing: {
        // 8px Grid System
        '0.5': '0.125rem', // 2px
        '1.5': '0.375rem', // 6px
        '2.5': '0.625rem', // 10px
        '3.5': '0.875rem', // 14px
        // Enhanced spacing
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
        '144': '36rem',
        // Touch targets
        'touch-min': 'var(--touch-target-min)',
        'touch-comfortable': 'var(--touch-target-comfortable)',
        'touch-generous': 'var(--touch-target-generous)',
        'touch-primary': 'var(--touch-target-primary)',
        'touch-secondary': 'var(--touch-target-secondary)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - 4rem)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "theme-transition": {
          "0%": { opacity: 0.8 },
          "100%": { opacity: 1 },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "theme-transition": "theme-transition 0.3s ease-in-out",
        "fade-in": "fade-in var(--animation-medium) var(--animation-easing)",
        "scale-in": "scale-in var(--animation-medium) var(--animation-easing)",
        "slide-up": "slide-up var(--animation-medium) var(--animation-easing)",
        "slide-down": "slide-down var(--animation-medium) var(--animation-easing)",
      },
      transitionProperty: {
        'colors-opacity': 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity',
        'theme': 'background-color, border-color, color, box-shadow, fill, stroke, opacity',
      },
      boxShadow: {
        'elevation-low': 'var(--shadow-elevation-low)',
        'elevation-medium': 'var(--shadow-elevation-medium)',
        'elevation-high': 'var(--shadow-elevation-high)',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ki Business teal palette
        ki: {
          primary:   '#26A69A',
          secondary: '#7DD3C0',
          accent:    '#2D8A6B',
          text:      '#2C3E50',
          light:     '#E0F7F4',
          muted:     '#80CBC4',
          surface:   '#F0F9F8',
        },
        // Dark surface palette (teal-tinted dark)
        surface: {
          DEFAULT: '#0D1F1E',
          50:  '#122928',
          100: '#16302D',
          200: '#1C3D3A',
          300: '#234845',
        },
        // Legacy primary (kept for internal dashboard pages)
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#273549',
          900: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'ki-gradient':
          'linear-gradient(135deg, #26A69A 0%, #2D8A6B 100%)',
        'ki-gradient-subtle':
          'linear-gradient(135deg, rgba(38,166,154,0.15) 0%, rgba(45,138,107,0.15) 100%)',
        'ki-gradient-radial':
          'radial-gradient(ellipse at center, rgba(38,166,154,0.12) 0%, transparent 70%)',
        'glass-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glow-ki':     '0 0 40px rgba(38,166,154,0.25)',
        'glow-accent': '0 0 40px rgba(45,138,107,0.25)',
        'glass':       '0 8px 32px rgba(44,62,80,0.12)',
        'glass-dark':  '0 8px 32px rgba(0,0,0,0.40)',
        'glass-hover': '0 16px 48px rgba(38,166,154,0.18)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-x':   'gradient-x 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

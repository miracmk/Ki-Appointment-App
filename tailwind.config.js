/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Aurora accent palette
        aurora: {
          cyan:   '#00F0FF',
          blue:   '#0047FF',
          purple: '#B000FF',
          pink:   '#FF006E',
        },
        // Dark surface palette
        surface: {
          DEFAULT: '#0A0B0F',
          50:  '#12141A',
          100: '#1A1D26',
          200: '#222632',
          300: '#2C3040',
        },
        // Legacy primary (kept for backwards compat with existing pages)
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
        'aurora-gradient':
          'linear-gradient(135deg, #0047FF 0%, #B000FF 50%, #00F0FF 100%)',
        'aurora-gradient-subtle':
          'linear-gradient(135deg, rgba(0,71,255,0.15) 0%, rgba(176,0,255,0.15) 50%, rgba(0,240,255,0.15) 100%)',
        'glass-shine':
          'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glow-cyan':   '0 0 40px rgba(0,240,255,0.25)',
        'glow-blue':   '0 0 40px rgba(0,71,255,0.30)',
        'glow-purple': '0 0 40px rgba(176,0,255,0.25)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
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

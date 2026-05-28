module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#060607',
        panel: '#0d0f12',
        accent: '#7c3aed',
        arcane: '#4f46e5',
        magicblue: '#2563eb',
        muted: '#9ca3af',
        gold: '#d4b16a',
        blood: '#6b0219',
        glass: 'rgba(255,255,255,0.04)'
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'panel-md': '0 8px 30px rgba(2,6,23,0.8), inset 0 1px 0 rgba(255,255,255,0.03)'
      },
      backdropBlur: {
        xs: '2px'
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 0px rgba(124,58,237,0.0)' },
          '50%': { boxShadow: '0 6px 28px rgba(124,58,237,0.12)' },
          '100%': { boxShadow: '0 0 0px rgba(124,58,237,0.0)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
}

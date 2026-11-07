/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ivory: '#FBF7EF',
          paper: '#FFFDF8',
          forest: '#1F4D3A',
          forestDark: '#163829',
          sage: '#DCE8DD',
          sageDark: '#B9D0BE',
          coral: '#C2410C',
          coralDark: '#9A3412',
          coralSoft: '#FDEBDD',
          ink: '#1F2A24',
          muted: '#4B5A51',
          line: '#E4DDCF',
          sos: '#B42318',
          sosSoft: '#FEE4E2',
        },
        koode: {
          bg: '#FBF9F5',
          cream: '#F3EFE6',
          card: '#FFFFFF',
          border: '#D8E2DC',
          primary: '#2D6A4F',
          primaryHover: '#1B4332',
          accent: '#52B788',
          accentLight: '#E8F5E9',
          text: '#1E2D24',
          muted: '#4A5D4E',
          alert: '#BC4749',
          alertBg: '#FDF0ED',
          warning: '#D97706',
          warningBg: '#FEF3C7',
          calm: '#3D5A80',
          calmBg: '#E0FBFC'
        },
        sahaaya: {
          bg: '#FBF9F5',
          cream: '#F3EFE6',
          card: '#FFFFFF',
          border: '#D8E2DC',
          primary: '#2D6A4F',
          primaryHover: '#1B4332',
          accent: '#52B788',
          accentLight: '#E8F5E9',
          text: '#1E2D24',
          muted: '#4A5D4E',
          alert: '#BC4749',
          alertBg: '#FDF0ED',
          warning: '#D97706',
          warningBg: '#FEF3C7',
          calm: '#3D5A80',
          calmBg: '#E0FBFC'
        }
      },
      fontFamily: {
        sans: [
          '"Noto Sans Malayalam"',
          '"Nirmala UI"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans Malayalam"',
          'Manjari',
          'sans-serif'
        ]
      },
      fontSize: {
        'elder-sm': '1.125rem',   // 18px
        'elder-base': '1.25rem',  // 20px
        'elder-lg': '1.5rem',     // 24px
        'elder-xl': '1.875rem',   // 30px
        'elder-2xl': '2.25rem',   // 36px
      },
      minHeight: {
        'touch': '3rem', // 48px min touch target
      },
      minWidth: {
        'touch': '3rem',
      }
    },
  },
  plugins: [],
}

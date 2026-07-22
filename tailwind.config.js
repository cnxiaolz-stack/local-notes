/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 玻璃质感配色（通过 CSS 变量驱动，支持深浅色切换）
        bg: {
          light: 'transparent',
          dark: 'transparent'
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.65)',
          dark: 'rgba(30, 27, 50, 0.55)'
        },
        border: {
          light: 'rgba(255, 255, 255, 0.6)',
          dark: 'rgba(255, 255, 255, 0.12)'
        },
        text: {
          primary: {
            light: '#1e1b2e',
            dark: '#f4f4f5'
          },
          secondary: {
            light: '#6b7280',
            dark: '#a1a1aa'
          }
        },
        brand: {
          DEFAULT: '#6366f1',
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca'
        },
        accent: {
          DEFAULT: '#8b5cf6',
          500: '#8b5cf6',
          600: '#7c3aed'
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
}

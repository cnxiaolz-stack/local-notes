/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 中性简约配色（通过 CSS 变量驱动，支持深浅色切换）
        bg: {
          light: '#fafaf9',
          dark: '#1c1c1e'
        },
        surface: {
          light: '#ffffff',
          dark: '#2c2c2e'
        },
        border: {
          light: '#e4e4e7',
          dark: '#3a3a3c'
        },
        text: {
          primary: {
            light: '#18181b',
            dark: '#f4f4f5'
          },
          secondary: {
            light: '#71717a',
            dark: '#a1a1aa'
          }
        },
        brand: {
          DEFAULT: '#3b82f6',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        accent: {
          DEFAULT: '#10b981',
          500: '#10b981',
          600: '#059669'
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

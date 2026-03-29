import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '380px',
      sm: '640px',
      md: '900px',
      lg: '1200px',
      xl: '1440px',
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--bg-card)',
        raise: 'var(--bg-raise)',
        hover: 'var(--bg-hover)',
        gold: 'var(--gold)',
        sage: 'var(--sage)',
        cream: 'var(--cream)',
        muted: 'var(--muted)',
        hint: 'var(--hint)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      spacing: {
        sidebar: 'var(--sidebar-w)',
        'mobile-nav': 'var(--mobile-nav-h)',
        topbar: 'var(--topbar-h)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        md: 'var(--border-md)',
      },
      transitionTimingFunction: {
        ease: 'var(--ease)',
      },
      backgroundImage: {
        'gold-glow': 'radial-gradient(circle, rgba(201,169,110,.08) 0%, transparent 70%)',
        'card-glow': 'radial-gradient(circle, rgba(201,169,110,.06) 0%, transparent 70%)',
        'gold-gradient': 'linear-gradient(135deg, #C9A96E 0%, #d4b478 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up .3s var(--ease) forwards',
        'fade-in': 'fade-in .2s ease forwards',
        shimmer: 'shimmer 1.4s infinite',
        spin: 'spin .8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;


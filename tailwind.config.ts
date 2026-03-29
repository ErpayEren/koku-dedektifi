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
      borderColor: { DEFAULT: 'var(--border)' },
      transitionTimingFunction: { ease: 'var(--ease)' },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#F7EEDB',
        ivory: '#FFF9EC',
        charcoal: '#2F2A24',
        umber: '#6E3C24',
        bronze: '#B8860B',
        gold: '#D6A84F',
        flag: '#C8102E',
      },
      boxShadow: {
        museum: '0 18px 42px rgba(47, 42, 36, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                bitcoin: {
                    orange: '#F7931A',
                    gold: '#FFB347',
                    dark: '#0D0D0D',
                    darker: '#050505',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'bitcoin-glow': 'radial-gradient(ellipse at center, rgba(247, 147, 26, 0.15) 0%, transparent 70%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                },
            },
        },
    },
    plugins: [],
};

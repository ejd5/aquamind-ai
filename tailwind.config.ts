import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        /* AQWELIA — Centralized brand tokens (P6-DESIGN).
                           These reference the --aqwelia-* CSS variables defined
                           in src/app/globals.css so the same tokens power both
                           Tailwind utilities (text-lagoon, bg-night) and raw
                           CSS (var(--aqwelia-lagoon)). Documentation: docs/DESIGN_SYSTEM.md */
                        lagoon: 'var(--aqwelia-lagoon)',
                        aqua: 'var(--aqwelia-aqua)',
                        'deep-teal': 'var(--aqwelia-deep-teal)',
                        night: 'var(--aqwelia-night)',
                        mist: 'var(--aqwelia-mist)',
                        silver: 'var(--aqwelia-silver)',
                        ivory: 'var(--aqwelia-ivory)',
                        champagne: 'var(--aqwelia-champagne)',
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        /* AQWELIA — named radii (P6-DESIGN). Distinct from the
                           shadcn/ui --radius scale to avoid clashing with
                           components that depend on rounded-md/lg/sm defaults. */
                        'aq-sm': 'var(--aqwelia-radius-sm)',
                        'aq-md': 'var(--aqwelia-radius-md)',
                        'aq-lg': 'var(--aqwelia-radius-lg)',
                        'aq-xl': 'var(--aqwelia-radius-xl)',
                },
                boxShadow: {
                        /* AQWELIA — premium elevation (P6-DESIGN) */
                        'aq-sm': 'var(--aqwelia-shadow-sm)',
                        'aq-md': 'var(--aqwelia-shadow-md)',
                        'aq-lg': 'var(--aqwelia-shadow-lg)',
                },
                fontFamily: {
                        /* AQWELIA — brand typography (P6-DESIGN). Display serif
                           for hero headlines (Cormorant Garamond) + body sans. */
                        'aq-display': ['var(--aqwelia-font-display)', 'serif'],
                        'aq-body': ['var(--aqwelia-font-body)', 'sans-serif'],
                },
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;

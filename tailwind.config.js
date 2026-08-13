/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // App/dashboard surfaces — premium dark-blue healthcare theme
        void: "#071B34",       // page background (post-login)
        panel: "#0D2747",      // navbar / secondary background
        panel2: "#0D2747",     // secondary surface (rows, inputs base)
        edge: "rgba(255,255,255,0.10)", // hairline borders on dark surfaces
        sidebar: "#081E3D",
        cardsurface: "#12345B",
        cardhover: "#174C80",

        vital: {
          DEFAULT: "#22D3EE",  // primary accent / cyan
          soft: "#22D3EE1A",
          glow: "#38BDF8",
        },
        ai: {
          DEFAULT: "#3B82F6",  // secondary accent / blue
          soft: "#3B82F61A",
        },
        sky: {
          DEFAULT: "#38BDF8",  // tertiary accent
          soft: "#38BDF81A",
        },
        emerald: {
          DEFAULT: "#10B981",  // success
          soft: "#10B9811A",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "#F59E0B1A",
        },
        emergency: {
          DEFAULT: "#EF4444",  // danger
          soft: "#EF44441A",
        },

        mist: "#D6E4FF",       // secondary / paragraph text
        ink: "#FFFFFF",        // primary text / headings
        navlink: "#EAF4FF",
        placeholder: "#9DB5D3",
        sidebarmuted: "#A9C9FF",

        // Added for the landing page redesign only — new token names,
        // additive, doesn't change any existing token dashboards use.
        body: "#D9E9FF",
        navtext: "#F5FAFF",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        data: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 30px rgba(34,211,238,0.45)",
        "glow-ai": "0 8px 30px -8px rgba(59, 130, 246, 0.45)",
        "glow-em": "0 8px 30px -8px rgba(239, 68, 68, 0.45)",
        card: "0 10px 40px rgba(0,150,255,0.15)",
        "card-lg": "0 16px 56px rgba(0,150,255,0.22)",
      },
      borderRadius: {
        card: "20px",
      },
      keyframes: {
        pulseLine: {
          "0%": { strokeDashoffset: "240" },
          "100%": { strokeDashoffset: "0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(24px,-18px) scale(1.05)" },
          "66%": { transform: "translate(-18px,14px) scale(0.97)" },
        },
      },
      animation: {
        pulseLine: "pulseLine 2.4s linear infinite",
        floaty: "floaty 4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        blob: "blob 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

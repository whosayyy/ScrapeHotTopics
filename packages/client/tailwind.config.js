/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0a0e1a",
          surface: "#111827",
          border: "#1e293b",
          accent: "#06b6d4",
          accent2: "#8b5cf6",
          green: "#10b981",
          red: "#ef4444",
          orange: "#f59e0b",
          text: "#e2e8f0",
          muted: "#64748b",
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(6, 182, 212, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.6)" },
        },
        "slide-in": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

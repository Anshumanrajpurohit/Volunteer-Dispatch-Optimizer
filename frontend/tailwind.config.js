/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102230",
        mist: "#f4f7f8",
        sage: "#d6e5dd",
        ember: "#b9572c",
        pine: "#1e5a46",
      },
    },
  },
  plugins: [],
};

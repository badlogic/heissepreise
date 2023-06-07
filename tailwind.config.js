/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./site/**/*.{html,js}"],
    safelist: [
        {
            pattern: /(bg|border|text)-(yellow|green|purple|pink|rose|orange|blue|purple|teal|stone)-(200)/,
            variants: ["md", "lg", "hover"],
        },
    ],
    theme: {
        extend: {
            colors: {
                primary: "#c9543a",
            },
            scale: {
                flip: "-1",
            },
        },
    },
    plugins: [],
};

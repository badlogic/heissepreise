/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./site/**/*.{html,js,css}"],
    theme: {
        extend: {
            colors: {
                primary: "#c9543a",
            },
            scale: {
                flip: "-1",
            },
            content: {
                label: "attr(data-label)",
                none: "none",
            },
        },
    },
    plugins: [],
};

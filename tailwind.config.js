/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./site/**/*.{html,js,css}"],
    theme: {
        extend: {
            colors: {
                primary: "#c9543a",
                mila: {
                    200: "#2cb3a5",
                    400: "#00867a",
                },
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

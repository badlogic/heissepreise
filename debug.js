const billa = require("./stores/billa");

const main = async () => {
    const categories = await billa.fetchData();
    console.log(categories);
}

main();
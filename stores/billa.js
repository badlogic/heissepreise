const axios = require("axios");
const HITS = Math.floor(30000 + Math.random() * 2000);

exports.getCanonical = function(item, today) {
    return {
        id: item.data.articleId,
        name: item.data.name,
        price: item.data.price.final,
        priceHistory: [{ date: today, price: item.data.price.final }],
        unit: item.data.grammagePriceFactor == 1 ? item.data.grammage : "kg",
        bio: item.data.attributes && item.data.attributes.includes("s_bio"),
        url: `https://shop.billa.at${item.data.canonicalPath}`
    };
}

exports.fetchData = async function() {
    const BILLA_SEARCH = `https://shop.billa.at/api/search/full?searchTerm=*&storeId=00-10&pageSize=${HITS}`;
    return (await axios.get(BILLA_SEARCH)).data.tiles;
}
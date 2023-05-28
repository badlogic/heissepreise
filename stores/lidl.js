const axios = require("axios");
const HITS = Math.floor(30000 + Math.random() * 2000);

exports.getCanonical = function(item, today) {
    return {
        id: item.productId,
        name: `${item.keyfacts?.supplementalDescription?.concat(" ") ?? ""}${item.fullTitle}`,
        price: item.price.price,
        priceHistory: [{ date: today, price: item.price.price }],
        unit: item.price.basePrice?.text ?? "",
        url: `https://www.lidl.at${item.canonicalUrl}`
    };
}

exports.fetchData = async function() {
    const LIDL_SEARCH = `https://www.lidl.at/p/api/gridboxes/AT/de/?max=${HITS}`;
    return (await axios.get(LIDL_SEARCH)).data.filter(item => !!item.price.price);
}
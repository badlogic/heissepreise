const axios = require("axios");
const HITS = Math.floor(30000 + Math.random() * 2000);

exports.getCanonical = function(item, today) {
    let price, unit;
    if (item.masterValues["quantity-selector"]) {
        const [str_price, str_unit] = item.masterValues["price-per-unit"].split('/');
        price = parseFloat(str_price.replace("€", ""));
        unit = str_unit.trim();
    }
    else {
        price = item.masterValues.price;
        unit = item.masterValues["short-description-3"];
    }
    return {
        id: item.masterValues["code-internal"],
        sparId: item.masterValues["product-number"],
        name: item.masterValues.title + " " + item.masterValues["short-description"],
        price,
        priceHistory: [{ date: today, price }],
        unit,
        bio: item.masterValues.biolevel === "Bio"
    };
}

exports.fetchData = async function() {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
}
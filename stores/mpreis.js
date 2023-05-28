const axios = require("axios");

exports.getCanonical = function(item, today) {
    return {
        id: item.code,
        name: item.name[0],
        price: item.prices[0].presentationPrice.effectiveAmount,
        priceHistory: [{ date: today, price: item.prices[0].presentationPrice.effectiveAmount }],
        unit: `${item.prices[0].presentationPrice.measurementUnit.quantity} ${item.prices[0].presentationPrice.measurementUnit.unitCode}`,
        bio: item.mixins.mpreisAttributes.properties?.includes('BIO'),
        url: `https://www.mpreis.at/shop/p/${item.code}`
    };
}

exports.fetchData = async function() {
    const MPREIS_URL = `https://ax2ixv4hll-dsn.algolia.net/1/indexes/prod_mpreis_8450/browse?X-Algolia-API-Key=NmJlMTI0NjY1NGU4MDUwYTRlMmYzYWFjOWFlY2U4MGFkNGZjMDY2NmNjNjQzNWY3OWJlNDY4OTY0ZjEwOTEwYWZpbHRlcnM9cHVibGlzaGVk&X-Algolia-Application-Id=AX2IXV4HLL&X-Algolia-Agent=Vue.js`
    let mpreisItems = [];
    let res = (await axios.get(MPREIS_URL)).data;
    mpreisItems = mpreisItems.concat(res.hits);
    cursor = res.cursor;
    while (cursor) {
        res = (await axios.get(MPREIS_URL + `&cursor=${cursor}`)).data;
        mpreisItems = mpreisItems.concat(res.hits);
        cursor = res.cursor;
    }
    return mpreisItems;
}
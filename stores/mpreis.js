const axios = require("axios");

const conversions = {
    'CM': { unit: 'cm', factor: 1 },
    'DAG': { unit: 'g', factor: 10 },
    'DL': { unit: 'ml', factor: 10 },
    'GRM':   { unit: 'g', factor: 1 },
    'H87': { unit: 'ml', factor: 1000 },
    'HLT': { unit: 'ml', factor: 1000 },
    'KGM': { unit: 'g', factor: 1000 },
    'LTR': { unit: 'ml', factor: 1000 },
    'MLT': { unit: 'ml', factor: 1 },
    'MTR': { unit: 'm', factor: 1 },
    'XRO': { unit: 'stk', factor: 1 },
};

exports.getCanonical = function(item, today) {
    let quantity = item.prices[0].presentationPrice.measurementUnit.quantity
    let unit = item.prices[0].presentationPrice.measurementUnit.unitCode
    if(unit in conversions) {
        const conv = conversions[unit];
        unit = conv.unit;
        quantity = conv.factor * quantity;
    }
    else
        console.error("Unknown mpreis unit:", unit)
    return {
        id: item.code,
        name: item.name[0],
        price: item.prices[0].presentationPrice.effectiveAmount,
        priceHistory: [{ date: today, price: item.prices[0].presentationPrice.effectiveAmount }],
        unit,
        quantity,
        bio: item.mixins.mpreisAttributes.properties?.includes('BIO')
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
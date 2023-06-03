const axios = require("axios");
const utils = require("./utils");

const units = {
    grm: { unit: "g", factor: 1 },
    kgm: { unit: "g", factor: 1000 },
    ltr: { unit: "ml", factor: 1000 },
    mlt: { unit: "ml", factor: 1 },
    mtr: { unit: "m", factor: 1 },
    anw: { unit: "stk", factor: 1 },
    "bl.": { unit: "stk", factor: 1 },
    pkg: { unit: "stk", factor: 1 },
    gr: { unit: "g", factor: 1 },
    er: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = item.prices[0].presentationPrice.measurementUnit.quantity;
    let unit = item.prices[0].presentationPrice.measurementUnit.unitCode.toLowerCase();
    if (["xro", "h87", "hlt"].indexOf(unit) != -1) {
        const q = utils.parseUnitAndQuantityAtEnd(item.mixins.productCustomAttributes.packagingUnit);
        quantity = q[0] ?? quantity;
        unit = q[1];
    }
    if (!(unit in units)) {
        unit = "stk";
    }
    const isWeighted = (item.mixins.productCustomAttributes?.packagingDescription ?? "").startsWith("Gewichtsware");

    return utils.convertUnit(
        {
            id: item.code,
            name: item.name[0],
            isWeighted,
            price: isWeighted ? item.prices[0].effectiveAmount : item.prices[0].presentationPrice.effectiveAmount,
            priceHistory: [{ date: today, price: item.prices[0].presentationPrice.effectiveAmount }],
            unit,
            quantity,
            bio: item.mixins.mpreisAttributes.properties?.includes("BIO"),
        },
        units,
        "mpreis"
    );
};

exports.fetchData = async function () {
    const MPREIS_URL = `https://ax2ixv4hll-dsn.algolia.net/1/indexes/prod_mpreis_8450/browse?X-Algolia-API-Key=NmJlMTI0NjY1NGU4MDUwYTRlMmYzYWFjOWFlY2U4MGFkNGZjMDY2NmNjNjQzNWY3OWJlNDY4OTY0ZjEwOTEwYWZpbHRlcnM9cHVibGlzaGVk&X-Algolia-Application-Id=AX2IXV4HLL&X-Algolia-Agent=Vue.js`;
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
};

exports.urlBase = "https://www.mpreis.at/shop/p/";

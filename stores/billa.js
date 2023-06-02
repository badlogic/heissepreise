const axios = require("axios");
const utils = require("./utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

const conversions = {
    "Beutel": { unit: 'stk', factor: 1 },
    "Blatt": { unit: 'stk', factor: 1 },
    "Bund": { unit: 'stk', factor: 1 },
    "g": { unit: 'g', factor: 1},
    "Gramm": { unit: 'g', factor: 1},
    "kg": { unit: 'g', factor: 1000},
    "Kilogramm": { unit: 'g', factor: 1},
    "l": { unit: 'ml', factor: 1000},
    "Liter": { unit: 'ml', factor: 1000},
    "Meter": { unit: 'cm', factor: 100},
    "Milliliter": { unit: 'ml', factor: 1},
    "ml": { unit: 'ml', factor: 1},
    "Paar": { unit: 'stk', factor: 1 },
    "Packung": { unit: 'stk', factor: 1 },
    "Portion": { unit: 'stk', factor: 1 },
    "Rollen": { unit: 'stk', factor: 1 },
    "Stk": { unit: 'stk', factor: 1 },
    "Stück": { unit: 'stk', factor: 1 },
    "Teebeutel": { unit: 'stk', factor: 1 },
    "Waschgang": { unit: 'wg', factor: 1 },
    "Zentimeter": { unit: 'cm', factor: 1 },
};

exports.getCanonical = function(item, today) {
    let quantity = 1, unit = "kg";
    if(item.data.grammagePriceFactor == 1) {
        const grammage = item.data.grammage !== "" && item.data.grammage.trim().split(' ').length>1 ? item.data.grammage : item.data.price.unit;
        if (grammage) [quantity, unit] = grammage.trim().split(' ').splice(0,2);
    }
    return utils.convertUnit({
        id: item.data.articleId,
        name: item.data.name,
        price: item.data.price.final,
        priceHistory: [{ date: today, price: item.data.price.final }],
        isWeighted : item.data.isWeightArticle,
        unit,
        quantity,
        bio: item.data.attributes && item.data.attributes.includes("s_bio"),
        url: item.data.canonicalPath,
    }, conversions, 'billa');
}

exports.fetchData = async function() {
    const BILLA_SEARCH = `https://shop.billa.at/api/search/full?searchTerm=*&storeId=00-10&pageSize=${HITS}`;
    return (await axios.get(BILLA_SEARCH)).data.tiles;
}

exports.urlBase = "https://shop.billa.at";
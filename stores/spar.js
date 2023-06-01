const axios = require("axios");
const utils = require("./utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

const conversions = {
    'g': { unit: 'g', factor: 1 },
    'kg': { unit: 'g', factor: 1000 },
    'l': { unit: 'ml', factor: 1000 },
    'ml':   { unit: 'ml', factor: 1 },
    'stk': { unit: 'stk', factor: 1 },
    'stück': { unit: 'stk', factor: 1 },
    '100ml': { unit: 'ml', factor: 100 },
    'wg': { unit: 'wg', factor: 1 },
    '100g': { unit: 'g', factor: 100 },
    'm': { unit: 'cm', factor: 100 },
    'cm': { unit: 'cm', factor: 100 },
    'ml': { unit: 'ml', factor: 1 },
    'meter': { unit: 'cm', factor: 100 },
    'mm': { unit: 'cm', factor: .1 },
    'stk.': { unit: 'cm', factor: .1 },
    'cl': { unit: 'ml', factor: 10 },
    'blatt': { unit: 'stk', factor: 1 },
};

exports.getCanonical = function(item, today) {
    let price, unit, quantity;
    const description = item.masterValues["short-description-3"] ?? item.masterValues["short-description-2"];
    if (item.masterValues["quantity-selector"]) {
        const [str_price, str_unit] = item.masterValues["price-per-unit"].split('/');
        price = parseFloat(str_price.replace("€", ""));
    }
    else {
        price = item.masterValues.price;
    }
    if(description) {
        const s = description.replace(" EINWEG", "").replace(" MEHRWEG", "").trim();
        const q = utils.parseUnitAndQuantityAtEnd(s);
        quantity = q[0]
        unit = q[1]
    }
    if(conversions[unit]===undefined) {
      // use price per unit to calculate quantity (less accurate)
      let [unitPrice, unit_] = item.masterValues['price-per-unit'].split('/');
      unitPrice = parseFloat(unitPrice.replace("€", ""));
      quantity = parseFloat((price / unitPrice).toFixed(3));
      unit = unit_.toLowerCase();
    }
    return utils.convertUnit({
        id: item.masterValues["code-internal"],
        sparId: item.masterValues["product-number"],
        name: item.masterValues.title + " " + item.masterValues["short-description"],
        price,
        priceHistory: [{ date: today, price }],
        unit,
        quantity,
        isWeighted: item.masterValues['item-type'] === 'WeightProduct',
        bio: item.masterValues.biolevel === "Bio",
        url: `https://www.interspar.at/shop/lebensmittel${item.masterValues.url}`,
    }, conversions, 'spar');
}

exports.fetchData = async function() {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
}

const axios = require("axios");
const utils = require("./utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    "100ml": { unit: "ml", factor: 100 },
    "500ml": { unit: "ml", factor: 100 },
    "100g": { unit: "g", factor: 100 },
};

exports.getCanonical = function (item, today) {
    let price, unit, quantity;
    if (item.masterValues["quantity-selector"]) {
        const [str_price, str_unit] = item.masterValues["price-per-unit"].split("/");
        price = parseFloat(str_price.replace("€", ""));
    } else {
        price = item.masterValues.price;
    }
    let description = item.masterValues["short-description-3"] ?? item.masterValues["short-description-2"];
    if (!description || description.length == 0) {
        description = (item.masterValues["short-description"] ?? item.masterValues.name).toLowerCase();
        if (description.endsWith("per kg")) [quantity, unit] = [1, "kg"];
        else if (description.endsWith("im topf")) [quantity, unit] = [1, "kg"];
        else [quantity, unit] = [1, "stk."];
    } else {
        const s = description.replace(" EINWEG", "").replace(" MEHRWEG", "").trim();
        const q = utils.parseUnitAndQuantityAtEnd(s);
        quantity = q[0];
        unit = q[1];
    }
    if (!(unit in units) && !(unit in utils.globalUnits)) {
        // use price per unit to calculate quantity (less accurate)
        let [unitPrice, unit_] = item.masterValues["price-per-unit"].split("/");
        unitPrice = parseFloat(unitPrice.replace("€", ""));
        quantity = parseFloat((price / unitPrice).toFixed(3));
        unit = unit_.toLowerCase();
    }

    return utils.convertUnit(
        {
            id: item.masterValues["code-internal"],
            sparId: item.masterValues["product-number"],
            name: item.masterValues.title + " " + (item.masterValues["short-description"] ?? item.masterValues.name).toLowerCase(),
            price,
            priceHistory: [{ date: today, price }],
            unit,
            quantity,
            isWeighted: item.masterValues["item-type"] === "WeightProduct",
            bio: item.masterValues.biolevel === "Bio",
            url: item.masterValues.url,
        },
        units,
        "spar"
    );
};

exports.fetchData = async function () {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
};

exports.urlBase = "https://www.interspar.at/shop/lebensmittel";

const axios = require("axios");
const utils = require("./utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    "100ml": { unit: "ml", factor: 100 },
    "500ml": { unit: "ml", factor: 100 },
    "100g": { unit: "g", factor: 100 },
    kos: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let price, unit, quantity;
    if (item.masterValues["quantity-selector"]) {
        const [str_price, str_unit] = item.masterValues["price-per-unit"].split("/");
        price = parseFloat(str_price.replace("€", ""));
    } else {
        price = item.masterValues.price;
    }

    const s = item.masterValues.title.replace(" EINWEG", "").replace(" MEHRWEG", "").replace("per kg", "1 kg").trim().replace(".", "");
    let tokens = s.split(" ");
    const lastToken = tokens[tokens.length - 1];
    const match = /(\d+)\/(\d+)/.exec(lastToken);
    if (match) {
        quantity = match[1];
        unit = "stk";
    } else {
        const q = utils.parseUnitAndQuantityAtEnd(s);
        quantity = q[0];
        unit = q[1];
    }

    let fallback;
    if (item.masterValues["price-per-unit"]) {
        let [unitPrice, unit_] = item.masterValues["price-per-unit"].split("/");
        unitPrice = parseFloat(unitPrice.replace("€", ""));
        fallback = {
            quantity: parseFloat((price / unitPrice).toFixed(3)),
            unit: unit_.toLowerCase(),
        };
    } else {
        // Needed for Dossier data
        fallback = {
            quantity: 1,
            unit: "kg",
        };
    }

    const isWeighted = item.masterValues["item-type"] === "WeightProduct";
    if (isWeighted) {
        unit = fallback.unit;
        quantity = fallback.quantity;
    }

    let name = item.masterValues.title;
    tokens = item.masterValues.title.split(",");
    if (tokens.length >= 3) {
        name = tokens[1] + " " + tokens[0] + " " + tokens.slice(2).join(" ");
    }

    return utils.convertUnit(
        {
            id: item.masterValues["code-internal"],
            // description: "", not available
            name,
            price,
            priceHistory: [{ date: today, price }],
            unit,
            quantity,
            isWeighted,
            bio: item.masterValues.biolevel === "Bio",
        },
        units,
        "sparSi",
        fallback
    );
};

exports.fetchData = async function () {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_si?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
};

exports.urlBase = "https://www.spar.si/online";

const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");
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
        const s = description.replace(" EINWEG", "").replace(" MEHRWEG", "").replace("per kg", "1 kg").trim().replace(".", "");
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

    return utils.convertUnit(
        {
            id: item.masterValues["product-number"],
            name: item.masterValues.title + " " + (item.masterValues["short-description"] ?? item.masterValues.name),
            description: item.masterValues["marketing-text"] ?? "",
            price,
            priceHistory: [{ date: today, price }],
            unit,
            quantity,
            isWeighted,
            bio: item.masterValues.biolevel === "Bio",
        },
        units,
        "spar",
        fallback
    );
};

exports.fetchData = async function () {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
};

exports.initializeCategoryMapping = async () => {
    let categories = null;
    try {
        const result = (await axios.get("https://www.interspar.at/shop/lebensmittel/")).data;
        const root = HTMLParser.parse(result);
        categories = Array.from(root.querySelectorAll(`.flyout-categories__link`))
            .filter((el) => !(el.innerText.toLowerCase().includes("übersicht") || el.innerText.toLowerCase().includes("zurück")))
            .map((el) => {
                const paths = el.attributes.href.split("/");
                const id = paths[paths.length - 2];
                return {
                    id,
                    description: el.innerText.trim(),
                    url: `https://www.interspar.at/shop/lebensmittel/c/${id}`,
                    code: null,
                };
            });
    } catch (e) {
        console.log("Couldn't fetch SPAR categories.");
        categories = [];
    }
    utils.mergeAndSaveCategories("spar", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    if (!rawItem.masterValues["category-path"]) return null;

    const categoryLookup = exports.categoryLookup;
    if (!categoryLookup) throw Error("Category mapping for spar not initialized.");
    const regex = /F(\d+)-(\d+)/g;
    const categoryPaths = rawItem.masterValues["category-path"]
        .filter((p) => {
            const match = regex.exec(p);
            if (match == null) return false;
            if (Number.parseInt(match[1]) > 13) return false;
            return true;
        })
        .map((p) => p[0]);
    if (categoryPaths.length == 0) return null;
    categoryPaths.sort((a, b) => b.length - a.length);
    let categoryCode = null;
    for (const path of categoryPaths) {
        if (categoryLookup[path]) {
            categoryCode = categoryLookup[path];
            break;
        }
    }
    const longestPath = categoryPaths[0].split("-");
    for (let i = longestPath.length; i > 0; i--) {
        const path = longestPath.slice(0, i).join("-");
        if (categoryLookup[path] && categoryLookup[path].code) {
            categoryCode = categoryLookup[path];
            break;
        }
    }

    return categoryCode.code;
};

exports.urlBase = "https://www.interspar.at/shop/lebensmittel";

if (require.main == module) {
    (async () => {
        await exports.generateCategoryMapping();
    })();
}

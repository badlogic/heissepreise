const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");
const MAXITEMS = 10000;

const units = {
    bd: { unit: "stk", factor: 1 },
    gr: { unit: "g", factor: 1 },
    lt: { unit: "ml", factor: 1000 },
    pk: { unit: "stk", factor: 1 },
    pa: { unit: "stk", factor: 1 },
    rl: { unit: "stk", factor: 1 },
    tb: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = item.amount;
    let unit = item.volumeLabelKey;
    return utils.convertUnit(
        {
            id: item.productId,
            name: item.name,
            // description: "", not available
            price: item.price.regular.value / 100,
            priceHistory: [{ date: today, price: item.price.regular.value / 100 }],
            isWeighted: item.isWeightArticle,
            unit,
            quantity,
            bio: item.name.toLowerCase().includes("bio") && !item.name.toLowerCase().includes("fabio"),
            url: item.sku.replace("-", ""),
        },
        units,
        "penny"
    );
};

exports.fetchData = async function () {
    hits = 100;
    page = 0;
    done = false;
    result = [];
    while (!done) {
        const PENNY_SEARCH = `https://www.penny.at/api/products?page=${page}&pageSize=${hits}`;
        data = (await axios.get(PENNY_SEARCH)).data;
        done = data.count < hits || page * hits > MAXITEMS;
        page++;
        result = result.concat(data.results);
    }
    return result;
};

async function parseCategory(url, parent, result) {
    const data = (await axios.get(url)).data;
    const dom = HTMLParser.parse(data);
    const categories = dom.querySelectorAll('[data-test="category-tree-navigation-button"]');
    for (const category of categories) {
        const link = "https://www.penny.at" + category.getAttribute("href");
        if (!category.querySelector(".subtitle-2")) continue;
        const name = (parent ? parent + " -> " : "") + category.querySelector(".subtitle-2").innerText.trim().replace("&amp;", "&");
        if (name.startsWith("Alle Angebote")) continue;

        result.push({
            id: name,
            url: link,
            code: null,
        });

        await parseCategory(link, name, result);
    }
}

exports.initializeCategoryMapping = async () => {
    const categories = [];
    await parseCategory("https://www.penny.at/kategorie", null, categories);
    utils.mergeAndSaveCategories("penny", categories);

    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    const categoryPath = rawItem.parentCategories.filter((path) => path.length > 0 && !path[0].name.includes("ngebot"))[0];
    const categoryName = categoryPath.map((path) => path.name).join(" -> ");
    const category = exports.categoryLookup[categoryName];
    if (category) return category.code;
    return null;
};

exports.urlBase = "https://www.penny.at/produkte/";

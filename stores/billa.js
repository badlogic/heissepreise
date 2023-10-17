const axios = require("axios");
const utils = require("./utils");
const { categories, toCategoryCode, fromCategoryCode, getCategory } = require("../site/model/categories");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    beutel: { unit: "stk", factor: 1 },
    bund: { unit: "stk", factor: 1 },
    packung: { unit: "stk", factor: 1 },
    portion: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    waschgang: { unit: "wg", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = 1,
        unit = "kg";

    if (item.data.grammagePriceFactor == 1) {
        if (item.data.grammage.indexOf("Per ") == 0) item.data.grammage = item.data.grammage.replace("Per ", "");
        const grammage = item.data.grammage !== "" && item.data.grammage.trim().split(" ").length > 1 ? item.data.grammage : item.data.price.unit;
        if (grammage) [quantity, unit] = grammage.trim().split(" ").splice(0, 2);
    }

    return utils.convertUnit(
        {
            id: item.data.articleId,
            name: item.data.name,
            description: item.data.description ?? "",
            price: item.data.price.final,
            priceHistory: [{ date: today, price: item.data.price.final }],
            isWeighted: item.data.isWeightArticle,
            unit,
            quantity,
            bio: item.data.attributes && item.data.attributes.includes("s_bio"),
        },
        units,
        "billa"
    );
};

exports.getCategories = async function () {
    const categories = {};

    // all letters of alphabet
    for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode("A".charCodeAt(0) + i);
        const BILLA_SEARCH = `https://shop.billa.at/api/categories/search/${letter}?pageSize=1000&storeId=00-10`;
        const data = (await axios.get(BILLA_SEARCH)).data;

        // loop through results
        data.results.forEach((item) => {
            const category = {
                id: item.slug,
                name: item.name
            };
            categories[category.id] = category;
        });
    }

    return categories;
}

exports.fetchData = async function () {
    const categories = await exports.getCategories();
    const items = [];

    console.log(categories);

    Object.keys(categories).forEach(async (category_slug) => {
        const BILLA_SEARCH = `https://shop.billa.at/api/categories/${category_slug}/products?page=0&sortBy=relevance&pageSize=500&storeId=00-10`;
        const data = (await axios.get(BILLA_SEARCH)).data;
        data.results.forEach((item) => {
            items.push(item);
        });

        console.log(items.length);
    });
    return items;
};

exports.initializeCategoryMapping = async () => {
    // FIXME check if categories have changed.
};

exports.mapCategory = (rawItem) => {
    let billaCategory = null;
    for (const groupId of rawItem.data.articleGroupIds) {
        if (billaCategory == null) {
            billaCategory = groupId;
            continue;
        }

        if (groupId.charCodeAt(3) < billaCategory.charCodeAt(3)) {
            billaCategory = groupId;
        }
    }
    let categoryCode = billaCategory.replace("B2-", "").substring(0, 2);
    let [ci, cj] = fromCategoryCode(categoryCode);
    categoryCode = toCategoryCode(ci - 1, cj - 1);
    return categoryCode;
};

exports.urlBase = "https://shop.billa.at";

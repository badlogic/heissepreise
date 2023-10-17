const axios = require("axios");
const utils = require("./utils");
const { categories, toCategoryCode, fromCategoryCode, getCategory } = require("../site/model/categories");
const billaCategories = require("./billa-categories.json");
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

exports.fetchData = async function () {
    
    const items = [];

    billaCategories.forEach(async (category) => {

        // optimistic guess
        let page_size = 500;
        let total_pages = Math.ceil(page_size / 500);
        let current_page = 0;

        // fetch all pages
        while (current_page < total_pages) {
            const BILLA_SEARCH = `https://shop.billa.at/api/categories/${category.id}/products?page=${current_page}&sortBy=relevance&pageSize=${page_size}&storeId=00-10`;
            const data = (await axios.get(BILLA_SEARCH)).data;

            data.results.forEach((item) => {

                // check if we already have product with product ID
                if (items.find((i) => i.productId === item.productId)) return;

                // check if product is available
                items.push(item);
            });

            // update total pages
            total_pages = Math.ceil(data.total / 500);
            current_page++;
        }

        console.log("Product Count: " + items.length);
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

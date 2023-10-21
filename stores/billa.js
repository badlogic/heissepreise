const axios = require("axios");
const utils = require("./utils");
const { categories, toCategoryCode, fromCategoryCode, getCategory } = require("../site/model/categories");
const billaCategories = require("./billa-categories.json");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    beutel: { unit: "stk", factor: 1 },
    bund: { unit: "stk", factor: 1 },
    packung: { unit: "stk", factor: 1 },
    pa: { unit: "stk", factor: 1 },
    fl: { unit: "stk", factor: 1 },
    portion: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    waschgang: { unit: "wg", factor: 1 },
};

exports.getCanonical = function (item, today) {
    
    return utils.convertUnit(
        {
            id: item.productId,
            name: item.name,
            description: item.descriptionShort ?? "",
            price: item.price.regular.value,
            priceHistory: [{ date: today, price: item.price.regular.value }],
            isWeighted: item.weightArticle,
            unit: item.price.baseUnitShort,
            quantity: 1,
            bio: item.badges && item.badges.includes("pp-bio"),
        },
        units,
        "billa"
    );
};

exports.fetchData = async function () {
    const items = [];
    const lookup = {};
    let numDuplicates = 0;

    const categories = (await axios.get("https://shop.billa.at/api/categories/all/child-properties?storeId=00-10")).data;
    const requests = [];
    const pageSize = 500;
    for (const category of categories)
        for (let page = 0; page < Math.ceil(category.total / pageSize); page++)
            requests.push(
                `https://shop.billa.at/api/categories/${category.slug}/products?page=${page}&sortBy=relevance&pageSize=${pageSize}&storeId=00-10`
            );

    // fetch only 10 categories to avoid limiting/timeouts
    const num_parallel_requests = 10;
    for (let i = 0; i < requests.length; i += num_parallel_requests) {
        await Promise.all(
            requests.slice(i, i + num_parallel_requests).map(async (url) => {
                const data = (await axios.get(url)).data;
                data.results.forEach((item) => {
                    try {
                        const canonicalItem = exports.getCanonical(item);
                        if (lookup[canonicalItem.id]) {
                            numDuplicates++;
                            return;
                        }
                        lookup[canonicalItem.id] = item;
                        items.push(item);
                    } catch (e) {
                        // Ignore super tiles
                    }
                });
                console.log(`Duplicate items in BILLA data: ${numDuplicates}, total items: ${items.length}`);
            })
        );
    }
    return items;
};

exports.initializeCategoryMapping = async () => {
    // FIXME check if categories have changed.
};

exports.mapCategory = (rawItem) => {
    let billaCategory = "";
    // for (const groupId of rawItem.data.articleGroupIds) {
    //     if (billaCategory == null) {
    //         billaCategory = groupId;
    //         continue;
    //     }

    //     if (groupId.charCodeAt(3) < billaCategory.charCodeAt(3)) {
    //         billaCategory = groupId;
    //     }
    // }
    let categoryCode = billaCategory.replace("B2-", "").substring(0, 2);
    let [ci, cj] = fromCategoryCode(categoryCode);
    categoryCode = toCategoryCode(ci - 1, cj - 1);
    return categoryCode;
};

exports.urlBase = "https://shop.billa.at";

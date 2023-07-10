const axios = require("axios");
const utils = require("./utils");

const units = {
    wl: { unit: "wg", factor: 1 },
    bl: { unit: "stk", factor: 1 },
    btl: { unit: "stk", factor: 1 },
    portion: { unit: "stk", factor: 1 },
    satz: { unit: "stk", factor: 1 },
    tablette: { unit: "stk", factor: 1 },
    undefined: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = item.netQuantityContent || item.basePriceQuantity;
    let unit = item.contentUnit || item.basePriceUnit;
    return utils.convertUnit(
        {
            id: "" + item.gtin,
            name: `${item.brandName} ${item.title}`,
            // description: "", not available
            price: item.price.value,
            priceHistory: [{ date: today, price: item.price.value }],
            unit,
            quantity,
            ...((item.brandName === "dmBio" || (item.name && /^Bio[ -]/.test(item.name))) && { bio: true }),
        },
        units,
        "dm"
    );
};

exports.fetchData = async function () {
    const DM_BASE_URL = `https://product-search.services.dmtech.com/at/search/crawl?pageSize=1000&`;
    const QUERIES = [
        "allCategories.id=010000&price.value.to=2", //~500 items
        "allCategories.id=010000&price.value.from=2&price.value.to=3", //~600 items
        "allCategories.id=010000&price.value.from=3&price.value.to=4", //~500 items
        "allCategories.id=010000&price.value.from=4&price.value.to=7", //~800 items
        "allCategories.id=010000&price.value.from=7&price.value.to=10", //~900 items
        "allCategories.id=010000&price.value.from=10&price.value.to=15", //~900 items
        "allCategories.id=010000&price.value.from=15", //~300 items
        "allCategories.id=020000&price.value.to=2", //~600 items
        "allCategories.id=020000&price.value.from=2&price.value.to=3", //~550 items
        "allCategories.id=020000&price.value.from=3&price.value.to=4", //~600 items
        "allCategories.id=020000&price.value.from=4&price.value.to=6", //~800 items
        "allCategories.id=020000&price.value.from=6&price.value.to=10", //~850 items
        "allCategories.id=020000&price.value.from=10&price.value.to=18", //~930 items
        "allCategories.id=020000&price.value.from=18&price.value.to=70", //~940 items
        "allCategories.id=020000&price.value.from=70", //~60 items
        "allCategories.id=030000&price.value.to=8", //~900 items
        "allCategories.id=030000&price.value.from=8", //~500 items
        "allCategories.id=040000&price.value.to=2", //~600 items
        "allCategories.id=040000&price.value.from=2&price.value.to=4", //~900 items
        "allCategories.id=040000&price.value.from=4", //~400 items
        "allCategories.id=050000&price.value.to=4", //~600 items
        "allCategories.id=050000&price.value.from=4", //~800 items
        "allCategories.id=060000&price.value.to=4", //~900 items
        "allCategories.id=060000&price.value.from=4", //~500 items
        "allCategories.id=070000", //~300 items
    ];

    let dmItems = [];
    for (let query of QUERIES) {
        var res = await axios.get(DM_BASE_URL + query, {
            validateStatus: function (status) {
                return (status >= 200 && status < 300) || status == 429;
            },
        });

        // exponential backoff
        backoff = 2000;
        while (res.status == 429) {
            console.info(`DM API returned 429, retrying in ${backoff / 1000}s.`);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            backoff *= 2;
            res = await axios.get(DM_BASE_URL + query, {
                validateStatus: function (status) {
                    return (status >= 200 && status < 300) || status == 429;
                },
            });
        }
        let items = res.data;
        if (items.count > items.products.length) {
            console.warn(
                `DM Query matches ${items.count} items, but API only returns first ${items.products.length}. Adjust queries. Query: ${query}`
            );
        }
        dmItems = dmItems.concat(items.products);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return dmItems;
};

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

exports.urlBase = "https://www.dm.at/product-p";

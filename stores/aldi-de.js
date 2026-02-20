const fs = require("fs");
const path = require("path");
const axios = require("axios");
const utils = require("./utils");

const units = {};

exports.getCanonical = function (item, today) {
    let quantity = 1;
    let unit = "stk";
    if (item.preFormattedUnitContent) {
        [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.preFormattedUnitContent);
    }
    return utils.convertUnit(
        {
            id: item.productConcreteSku,
            name: item.name,
            // description: "", not available
            price: item.prices[0].grossAmount / 100,
            priceHistory: [{ date: today, price: item.prices[0].grossAmount / 100 }],
            isWeighted: false,
            unit,
            quantity,
            bio: item.name.toLowerCase().includes("bio"),
            url: `${item.urlSlugText}-${item.productConcreteSku}`,
        },
        units,
        "aldiDe",
        {
            quantity: 1,
            unit: "stk",
        }
    );
};

exports.fetchData = async function () {
    offset = 0;
    items = [];
    done = false;
    while (!done) {
        const ALDI_ITEM_SEARCH = `https://api.de.prod.commerce.ci-aldi.com/v1/catalog-search-product-offers?page[limit]=48&page[offset]=${offset}&merchantReference=ADG045_1`;
        resp = (await axios.get(ALDI_ITEM_SEARCH)).data;
        maxpage = resp.data[0].attributes.pagination.maxPage;
        currentpage = resp.data[0].attributes.pagination.currentPage;
        done = offset > 5000 || currentpage >= maxpage;
        items = items.concat(resp.data[0].attributes.catalogSearchProductOfferResults);
        offset += 48;
    }
    return items;
};

exports.urlBase = "https://www.mein-aldi.de/product/";

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

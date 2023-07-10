const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");

const units = {
    mbe: { unit: "wg", factor: 1 },
};

exports.getUnimarktCategoryPages = async () => {
    const categoryPages = [];

    try {
        var res = await axios.get(exports.urlBase, {
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
        });

        if (res && res.data) {
            var root = HTMLParser.parse(res.data);
            root.querySelectorAll("#menu > li > ul").forEach((list) => {
                // don't scrape category "Themen & Marken" since there are only duplicate
                // products and this will currupt the category mapping logic
                if (list._attrs["id"] !== "submenu-themen-marken") {
                    list.querySelectorAll("a[href^='/']").forEach((category) => {
                        const categoryHref = category._attrs["href"].replace("/", "");
                        categoryPages.push(categoryHref);
                    });
                }
            });
        }
    } catch (err) {
        console.log("Error while getting Unimarkt Category Pages");
    }

    return categoryPages;
};

exports.getCanonical = function (item, today) {
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.unit.replace("/ EINWEG", "").replace("/ MEHRWEG", ""));
    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            // description: "", not available
            price: item.price,
            priceHistory: [{ date: today, price: item.price }],
            quantity,
            unit,
            bio: item.name.toLowerCase().includes("bio"),
            url: item.canonicalUrl,
        },
        units,
        "unimarkt",
        {
            unit: "stk",
            quantity: 1,
        }
    );
};

exports.fetchData = async function () {
    let unimarktItems = [];

    const UNIMARKT_CATEGORIES = await exports.getUnimarktCategoryPages();

    for (let category of UNIMARKT_CATEGORIES) {
        var res = await axios.get(`${exports.urlBase}/${category}`, {
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
        });

        if (res && res.data) {
            var root = HTMLParser.parse(res.data);

            root.querySelectorAll(".articleListItem .produktContainer").forEach((product) => {
                unimarktItems.push({
                    id: product._attrs["data-articleid"],
                    name: product.querySelector(".name").text,
                    price: parseFloat(product._attrs["data-price"]),
                    unit: product.querySelector(".grammatur").text,
                    canonicalUrl: product.querySelector(".image > a")._attrs["href"],
                    categoryPath: category,
                });
            });
        }
    }
    return unimarktItems;
};

exports.initializeCategoryMapping = async () => {
    let categories = [];

    const UNIMARKT_CATEGORIES = await exports.getUnimarktCategoryPages();

    for (let category of UNIMARKT_CATEGORIES) {
        var res = await axios.get(`${exports.urlBase}/${category}`, {
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
        });

        if (res && res.data) {
            var root = HTMLParser.parse(res.data);

            let categoryName = [];
            // don't select the first child because it's the homepage-link in the breadcrumb
            root.querySelectorAll(".breadcrumb li:not(:first-child)").forEach((listItem) => {
                categoryName.push(listItem.querySelector("span").text);
            });

            categories.push({
                id: category,
                description: categoryName.join(" -> "),
                url: `${exports.urlBase}/${category}`,
                code: null,
            });
        }
    }

    utils.mergeAndSaveCategories("unimarkt", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    return exports.categoryLookup[rawItem.categoryPath]?.code;
};

exports.urlBase = "https://shop.unimarkt.at";

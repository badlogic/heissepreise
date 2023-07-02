const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");
const { URL } = require("url");

const units = {
    mbe: { unit: "wg", factor: 1 },
};

exports.getBipaCategoryPages = async () => {
    const categoryPages = [];

    var res = await axios.get(`${exports.urlBase}/sitemap_2-category.xml`, {
        validateStatus: function (status) {
            return status >= 200 && status < 300;
        },
    });

    if (res && res.data) {
        let pages = res.data.replace(/[\s]*/gm, "").match(/<url>(.*?)<\/url>/gm);
        pages = pages.filter((page) => /<changefreq>daily<\/changefreq>/g.test(page)); // only return pages which change daily ("monthly" are mainly seo, brand or offer pages)
        pages = pages.map((page) => page.match(/<loc>(.*)<\/loc>/gm)[0]);
        pages = pages.map((page) => page.replace(/<\/{0,1}loc>/g, "")); // remove <loc> xml-tags
        pages = pages.filter((page) => /\/c\/.*\/.{1,}/g.test(page)); // only return 2nd level category pages (level 1 is mostly landing pages or some special offer pages)
        categoryPages.push(...pages);
    }

    return categoryPages;
};

exports.getCanonical = function (item, today) {
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.unit);
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
    let bipaItems = [];

    const BIPA_CATEGORIES = await exports.getBipaCategoryPages();

    for (let categoryPageRawUrl of BIPA_CATEGORIES) {
        const res = await axios.get(`${categoryPageRawUrl}?start=0&sz=1000`, {
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
        });

        if (res && res.data) {
            const root = HTMLParser.parse(res.data);

            root.querySelectorAll(".product-tile-card").forEach((product) => {
                const gtmdataRaw = product._attrs["data-gtmdata"];
                if (gtmdataRaw && gtmdataRaw !== "undefined") {
                    const canonicalUrl = product.querySelector("a.stretched-link")._attrs["href"];
                    try {
                        const gtmdata = JSON.parse(gtmdataRaw);
                        bipaItems.push({
                            id: gtmdata.id,
                            name: gtmdata.name,
                            price: parseFloat(gtmdata.price),
                            unit: product.querySelector(".product-info").text.replace("Inhalt:").trim(),
                            canonicalUrl: canonicalUrl,
                            categoryPath: gtmdata.category.replace("-", "/"), // use slashes for seperation to match format used in sitemap.xml
                        });
                    } catch (error) {
                        console.log(`Error parsing json on ${categoryPageRawUrl} for product: ${canonicalUrl}`);
                    }
                }
            });
        }
    }

    return bipaItems;
};

exports.initializeCategoryMapping = async () => {
    let categories = [];

    const BIPA_CATEGORIES = await exports.getBipaCategoryPages();

    for (let categoryPageRawUrl of BIPA_CATEGORIES) {
        const categoryPageUrl = new URL(categoryPageRawUrl);
        const categoryId = categoryPageUrl.pathname.replace("/c/", "");

        categories.push({
            id: categoryId,
            description: categoryId.replace("/", " -> "),
            url: categoryPageRawUrl,
            code: null,
        });
    }

    utils.mergeAndSaveCategories("bipa", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    return exports.categoryLookup[rawItem.categoryPath]?.code;
};

exports.urlBase = "https://www.bipa.at";

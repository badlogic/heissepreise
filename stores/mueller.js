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

const categoriesExcludeList = ["Spielwaren", "Multi-Media", "Schreibwaren", "Strümpfe", "Handarbeit", "Bücher"];

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
        "mueller"
    );
};

function mapMullerProducts(product) {
    return {
        id: product.productId,
        name: product.name,
        price: parseFloat(product.impressionDataLayer.ecommerce.impressions[0].price),
        unit: product.quantityOfContent,
        canonicalUrl: product.productUrl.replace(exports.urlBase, ""),
        category: product.impressionDataLayer.ecommerce.impressions[0].category,
    };
}

exports.fetchData = async function () {
    let muellerItems = [];

    const MUELLER_CATEGORY_PAGES = [];
    const data = (await axios.get(`${exports.urlBase}/ajax/burgermenu/`)).data;
    data.forEach((category) => {
        if (!categoriesExcludeList.includes(category.name)) {
            const subcategories = category.subcategories.map((subcategory) => subcategory.url);
            MUELLER_CATEGORY_PAGES.push(...subcategories);
        }
    });

    for (let page of MUELLER_CATEGORY_PAGES) {
        let response = await axios.get(`${page}?ajax=true&p=1`, {
            validateStatus: function (status) {
                return (status >= 200 && status < 300) || status == 404;
            },
        });
        let backoff = 2000;
        while (response.status == 404) {
            response = await axios.get(`${page}?ajax=true&p=1`, {
                validateStatus: function (status) {
                    return (status >= 200 && status < 300) || status == 404;
                },
            });
            if (response.status == 404) {
                console.error(`Couldn't fetch ${page}?ajax=true&p=1, retrying in ${backoff / 1000}s.`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
                backoff *= 2;
            }
        }

        const plp = response?.data?.productlistresult;

        if (plp && plp.products && plp.products.length) {
            const plpProducts = plp.products.map(mapMullerProducts);
            muellerItems.push(...plpProducts);

            // loop throw pagination
            // start at second page
            let pages = plp.pager.maxPage;
            for (let i = 2; i < pages.length; i++) {
                const paginatedResponse = await axios.get(`${page}?ajax=true&p=1`);
                const paginatedPlp = paginatedResponse?.data?.productlistresult;
                if (paginatedPlp && paginatedPlp.products && paginatedPlp.products.length) {
                    const paginatedPlpProducts = paginatedPlp.products.map(mapMullerProducts);
                    muellerItems.push(...paginatedPlpProducts);
                }
            }
        }
    }

    return muellerItems;
};

function getSubcategories(json) {
    const subcategories = [];

    function traverseCategories(categories, parent = "", url, mainCategory) {
        if (!mainCategory) {
            subcategories.push({ id: parent, url: url, code: null });
        }

        for (const category of categories) {
            const { name, subcategories, url } = category;
            const current = parent ? `${parent}/${name}` : name;
            traverseCategories(subcategories, current, url, false);
        }
    }

    traverseCategories(json.subcategories, json.name, json.url, true);

    return subcategories;
}

exports.initializeCategoryMapping = async () => {
    const categories = [];

    const data = (await axios.get(`${exports.urlBase}/ajax/burgermenu/`)).data;
    data.forEach((category) => {
        if (!categoriesExcludeList.includes(category.name)) {
            const subcategories = getSubcategories(category);
            categories.push(...subcategories);
        }
    });

    utils.mergeAndSaveCategories("mueller", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    return exports.categoryLookup[rawItem.category]?.code;
};

exports.urlBase = "https://www.mueller.at";

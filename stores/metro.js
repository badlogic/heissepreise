const axios = require("axios");
const utils = require("./utils");

const METRO_WEBSHOP_BASE_URL = "https://shop.metro.at/shop/1";
const METRO_API_BASE_RL = "https://api.shop.metro.at/2.0";
const METRO_API_USER = "onlinesortiment11@metro.at";
const METRO_API_PASSWORD = "Welcome1";
const PRODUCT_LIST_CHUNK_SIZE = 1000;
const PRODUCT_CATEGORIES_NOT_RELEVANT = [
    13409, // Elektronik & Computerzubehör
    14382, // Sicherheit und Arbeitsschutz
];

const units = {
    // TODO: units mapping
};

exports.getCanonical = function (item, today) {
    let id = item["productId"];
    let name = item["productName"];
    if (item["brandName"]) {
        name = `${item["brandName"]} ${name}`;
    }
    if (item["packaging_description"]) {
        name = `${name} ${item["packaging_description"]}`;
    }

    const unit = item["price_unit"];
    const quantity = item["packaging_quantity"];
    const best_price = item["best_price"][0];
    const price = quantity * best_price["price"] * (1 + best_price["vat"] / 100);
    const bio = item["attributes"].some((a) => a["name"] === "BIO" && a["value"] === "1");
    const url = `${METRO_WEBSHOP_BASE_URL}/${id}`;

    return utils.convertUnit({ id, name, price, priceHistory: [{ date: today, price }], unit, quantity, bio, url }, units, "METRO", {
        quantity,
        unit,
    });
};

exports.fetchData = async function () {
    const responseSignIn = await axios.get(`${METRO_API_BASE_RL}/signin`, {
        params: {
            email: METRO_API_USER,
            password: METRO_API_PASSWORD,
        },
    });

    const headers = {
        auth: responseSignIn.data.token,
        "accept-encoding": "gzip",
    };

    const responseCategoriesList = await axios.get(`${METRO_API_BASE_RL}/categories/list`, {
        headers,
    });
    const filteredCategories = responseCategoriesList.data.filter((c) => !PRODUCT_CATEGORIES_NOT_RELEVANT.includes(c.id));

    return await fetchProductsOfCategoriesRecursively(filteredCategories, headers);
};

const fetchProductsOfCategoriesRecursively = async (categoryList, headers) => {
    let productList = [];
    for (const category of categoryList) {
        try {
            const productsOfCategory = await fetchProductsOfCategoryInChunks(category, headers);
            productList.push(...productsOfCategory);
        } catch (error) {
            // sometimes fetch fails with 500
            // among other things this seems to be caused by miss-configured products,
            // e.g. when the product has no image (cross-checked with web-shop)
            // in this case, the fetch logic tries to fetch by subcategories if available,
            // in order to get at least all products of the sibling categories
            console.warn(error.message);
            if (Array.isArray(category.subcategories)) {
                // console.debug(`Trying to fetch subcategories of ${category.id}/${category.name} ...`);
                productList = await fetchProductsOfCategoriesRecursively(category.subcategories, headers);
            }
        }
    }
    return productList;
};

const fetchProductsOfCategoryInChunks = async (category, headers) => {
    let metroItems = [];
    let offset = 0;
    let products_count = PRODUCT_LIST_CHUNK_SIZE;

    try {
        do {
            const responseProducts = await axios.post(
                `${METRO_API_BASE_RL}/shop/products`,
                {},
                {
                    headers,
                    params: { cat_id: category.id, limit: PRODUCT_LIST_CHUNK_SIZE, offset },
                }
            );
            products_count = responseProducts.data["products_count"];
            const products = responseProducts.data["products"];
            metroItems.push(...products);

            // console.debug(`Fetched ${metroItems.length}/${products_count} products for category ${category.id}/${category.name} ...`);

            offset += PRODUCT_LIST_CHUNK_SIZE;
            // await waitForAnother(100);
        } while (offset < products_count);
    } catch (error) {
        throw new Error(`Fetch ${metroItems.length}/${products_count} failed for category ${category.id}/${category.name}: ${error.message}`);
    }

    return metroItems;
};
const waitForAnother = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.urlBase = METRO_WEBSHOP_BASE_URL;

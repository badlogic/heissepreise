const axios = require("axios");
const utils = require("./utils");

const units = {
    kps: { unit: "stk", factor: 1 },
    euro: { unit: "stk", factor: 1 },
    tab: { unit: "stk", factor: 1 },
    kapseln: { unit: "stk", factor: 1 },
    dragees: { unit: "stk", factor: 1 },
    tabletten: { unit: "stk", factor: 1 },
    tbl: { unit: "stk", factor: 1 },
    fb: { unit: "stk", factor: 1 },
    gg: { unit: "stk", factor: 1 },
    Lutschtabletten: { unit: "stk", factor: 1 },
    undefined: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.name.toLowerCase().replace(/\"|Sondergröße|PET\.\+|mariniert/gm, ""));
    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            priceHistory: [{ date: today, price: item.price }],
            quantity,
            unit,
            bio: item.name.toLowerCase().includes("bio"),
            url: item.canonicalUrl,
        },
        units,
        "reformstark"
    );
};

const buildTotalPagesQuery = function () {
    return `query {
        products(search: "") {
            page_info {
                total_pages
            }
        }
    }`;
};

const buildProductsQuery = function (page) {
    const currentPage = page || 1;
    return `query {
        products(search: "", currentPage: ${currentPage}) {
            page_info {
                current_page,
                total_pages
            }
            items {
                id,
                name
                canonical_url,
                meta_description,
                price_range {
                    minimum_price {
                        final_price {
                            value
                        }
                    }
                }
                categories {
                    id,
                    name
                }
            }
        }
    }`;
};

exports.fetchData = async function () {
    let reformstarkItems = [];

    let totalPages = (
        await axios.post(`${exports.urlBase}/graphql`, { query: buildTotalPagesQuery() }, { headers: { "Content-Type": "application/json" } })
    ).data?.data?.products?.page_info?.total_pages;

    if (totalPages) {
        for (let currentPage = 1; currentPage < totalPages; currentPage++) {
            let products = (
                await axios.post(
                    `${exports.urlBase}/graphql`,
                    { query: buildProductsQuery(currentPage) },
                    { headers: { "Content-Type": "application/json" } }
                )
            ).data;

            products = products?.data?.products?.items?.map((product) => {
                return {
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price_range.minimum_price.final_price.value),
                    desciption: product.meta_description,
                    canonicalUrl: product.canonical_url,
                    canonicalUrl: product.canonical_url,
                    category: product.categories.map((category) => category.id).join("-"),
                };
            });

            reformstarkItems.push(...products);
        }
    }

    return reformstarkItems;
};

const getSubcategories = function (json) {
    const subcategories = [];

    function traverseCategories(categories, parentId = "", parentName = "", url, mainCategory) {
        for (const category of categories) {
            const { id, name, children, url_path } = category;
            const currentId = parentId ? `${parentId}-${id}` : id;
            const currentName = parentName ? `${parentName} -> ${name}` : name;
            subcategories.push({ id: currentId, desciption: currentName, url: `${exports.urlBase}/${url}.html`, code: null });
            if (children && children.length) {
                traverseCategories(children, currentId, currentName, url_path, false);
            }
        }
    }

    traverseCategories(json.children, json.id, json.name, json.url_path, true);

    return subcategories;
};

const buildCategoryQuery = function (parentCategoryId) {
    const categoryId = parentCategoryId || 2; // 2 = id of root-category
    return `query {
        categoryList(filters: { ids: { eq: "${categoryId}" } }) {
            id
            name
            children {
                id
                name
                url_path
                children {
                    id
                    name
                    url_path
                    children {
                        id
                        name
                        url_path
                        children {
                            id
                            name
                            url_path
                        }
                    }
                }
            }
        }
    }`;
};

exports.initializeCategoryMapping = async () => {
    let categories = [];

    let categoryList = (
        await axios.post(`${exports.urlBase}/graphql`, { query: buildCategoryQuery(2) }, { headers: { "Content-Type": "application/json" } })
    ).data?.data?.categoryList;

    categoryList[0].children.forEach((child) => {
        const subcategories = getSubcategories(child);
        categories.push(...subcategories);
    });

    utils.mergeAndSaveCategories("reformstark", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    return exports.categoryLookup[rawItem.category]?.code;
};

exports.urlBase = "https://www.reformmarkt.com";

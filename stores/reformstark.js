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

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

exports.urlBase = "https://www.reformmarkt.com";

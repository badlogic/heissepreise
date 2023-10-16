const fs = require("fs");
const path = require("path");
const axios = require("axios");
const utils = require("./utils");
const analysis = require("../analysis");

const units = {
    "": { unit: "stk", factor: 1 },
    gg: { unit: "g", factor: 1 },
    er: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    // try to read quantity and unit from product name
    const name = item.productName;
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(name);

    return utils.convertUnit(
        {
            id: item.productID,
            name,
            // description: "", not available
            price: item.price,
            priceHistory: [{ date: today, price: item.price }],
            isWeighted: item.isBulk,
            unit: !unit ? item.unitType : unit,
            quantity: !quantity ? item.unit : quantity,
            bio: item.isBio,
            url: `${item.categorySEOName}/${item.sEOName}`,
        },
        units,
        "hofer",
        {
            quantity: item.unit,
            unit: item.unitType,
        }
    );
};

const HOFER_BASE_URL = `https://shopservice.roksh.at`;
const CATEGORIES = HOFER_BASE_URL + `/category/GetFullCategoryList/`;
const CONFIG = { headers: { authorization: null } };
const TOKEN_DATA = {
    OwnWebshopProviderCode: "",
    SetUserSelectedShopsOnFirstSiteLoad: true,
    RedirectToDashboardNeeded: false,
    ShopsSelectedForRoot: "hofer",
    BrandProviderSelectedForRoot: null,
    UserSelectedShops: [],
};
const ITEMS = HOFER_BASE_URL + `/productlist/CategoryProductList`;

exports.fetchData = async function () {
    const { subCategories } = await exports.getCategories();

    let hoferItems = [];
    for (let subCategory of subCategories) {
        let categoryData = (await axios.get(`${ITEMS}?progId=${subCategory.ProgID}&firstLoadProductListResultNum=4&listResultProductNum=24`, CONFIG))
            .data;
        const numPages = categoryData.ProductListResults[0].ListContext.TotalPages;

        for (let iPage = 1; iPage <= numPages; iPage++) {
            let items = (
                await axios.post(`${HOFER_BASE_URL}/productlist/GetProductList`, { CategoryProgId: subCategory.ProgID, Page: iPage }, CONFIG)
            ).data;
            hoferItems = hoferItems.concat(items.ProductList);
        }
    }

    return hoferItems;
};

exports.getCategories = async () => {
    const token = (
        await axios.post("https://shopservice.roksh.at/session/configure", TOKEN_DATA, {
            headers: { Accept: "application/json", "Content-Type": "application/json" },
        })
    ).headers["jwt-auth"];
    CONFIG.headers.authorization = "Bearer " + token;

    // concat all subcategories (categories.[i].ChildList)
    const categories = (await axios.post(CATEGORIES, {}, CONFIG)).data;
    const subCategories = categories.reduce((acc, category) => acc.concat(category.ChildList), []);
    return { categories, subCategories };
};

exports.urlBase = "https://www.roksh.at/hofer/produkte/";

exports.initializeCategoryMapping = async (rawItems) => {
    rawItems = rawItems ?? (await exports.fetchData());
    const rawCategories = (await exports.getCategories()).categories;
    const lookup = {};
    const processCategory = (category) => {
        lookup[category.ProgID] = {
            id: category.ProgID,
            description: category.CategoryName,
            url: "https://www.roksh.at/" + category.Url,
            code: null,
        };

        for (const child of category.ChildList) {
            processCategory(child);
        }
    };
    for (const category of rawCategories) {
        processCategory(category);
    }

    for (const item of rawItems) {
        if (!lookup[item.CategorySEOName]) {
            // console.log(`Couldn't find category '${item.CategorySEOName}' for Hofer product ${item.ProductName}`);
            lookup[item.CategorySEOName] = {
                id: item.CategorySEOName,
                url: "https://www.roksh.at/hofer/angebot/" + item.CategorySEOName,
                code: "",
            };
        } else {
            const category = lookup[item.CategorySEOName];
        }
    }
    let categories = [];
    Object.keys(lookup).forEach((key) => categories.push(lookup[key]));
    categories = utils.mergeAndSaveCategories("hofer", categories);
    exports.categoryLookup = {};
    for (const category of categories) {
        exports.categoryLookup[category.id] = category;
    }
};

exports.mapCategory = (rawItem) => {
    const category = exports.categoryLookup[rawItem.CategorySEOName];
    return category?.code;
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const utils = require("./utils");

const units = {
    "": { unit: "stk", factor: 1 },
    gg: { unit: "g", factor: 1 },
    er: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    // try to read quantity and unit from product name
    const name = item.ProductName;
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(name);

    return utils.convertUnit(
        {
            id: item.ProductID,
            name,
            // description: "", not available
            price: item.Price,
            priceHistory: [{ date: today, price: item.Price }],
            isWeighted: item.IsBulk,
            unit: !unit ? item.UnitType : unit,
            quantity: !quantity ? item.Unit : quantity,
            bio: item.IsBio,
            url: `${item.CategorySEOName}/${item.SEOName}`,
        },
        units,
        "hofer",
        {
            quantity: item.Unit,
            unit: item.UnitType,
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

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

exports.generateCategoryMapping = async (rawItems) => {
    const { categories } = await exports.getCategories();
    const lookup = {};
    const processCategory = (category) => {
        lookup[category.ProgID] = {
            category: category.ProgID,
            url: category.Url,
            code: "",
            numItems: 0,
        };

        for (const child of category.ChildList) {
            processCategory(child);
        }
    };
    for (const category of categories) {
        processCategory(category);
    }

    let total = 0;
    for (const item of rawItems) {
        if (!lookup[item.CategorySEOName]) {
            console.log(`Couldn't find category '${item.CategorySEOName}' for Hofer product ${item.ProductName}`);
            total++;
            lookup[item.CategorySEOName] = {
                category: item.CategorySEOName,
                url: "",
                code: "",
                numItems: 1,
            };
        } else {
            const category = lookup[item.CategorySEOName];
            category.item = item;
            category.numItems++;
        }
    }
    const output = Object.keys(lookup).map((key) => lookup[key]);
    const oldCategories = path.join(__dirname, "hofer-categories.json");
    fs.writeFileSync(path.join(__dirname, "hofer-categories.json"), JSON.stringify(output, null, 2));
};

// Generate JSON for category mapping in stores/hofer-categories.json
if (require.main === module) {
    (async () => {
        const { readJSON } = require("../analysis");
        // const rawItems = await this.fetchData();
        const rawItems = readJSON("data/hofer-2023-06-20.json.br");
        await exports.generateCategoryMapping(rawItems);
    })();
}

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

exports.fetchData = async function () {
    const HOFER_BASE_URL = `https://shopservice.roksh.at`;
    const CATEGORIES = HOFER_BASE_URL + `/category/GetFullCategoryList/`;
    const CONFIG = { headers: { authorization: null } };
    const ITEMS = HOFER_BASE_URL + `/productlist/CategoryProductList`;

    // fetch access token
    const token_data = {
        OwnWebshopProviderCode: "",
        SetUserSelectedShopsOnFirstSiteLoad: true,
        RedirectToDashboardNeeded: false,
        ShopsSelectedForRoot: "hofer",
        BrandProviderSelectedForRoot: null,
        UserSelectedShops: [],
    };
    const token = (
        await axios.post("https://shopservice.roksh.at/session/configure", token_data, {
            headers: { Accept: "application/json", "Content-Type": "application/json" },
        })
    ).headers["jwt-auth"];
    CONFIG.headers.authorization = "Bearer " + token;

    // concat all subcategories (categories.[i].ChildList)
    const categories = (await axios.post(CATEGORIES, {}, CONFIG)).data;
    const subCategories = categories.reduce((acc, category) => acc.concat(category.ChildList), []);

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

exports.urlBase = "https://www.roksh.at/hofer/produkte/";

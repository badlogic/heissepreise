const axios = require("axios");

exports.getCanonical = function(item, today) {
    return {
        id: item.ProductID,
        name: item.ProductName,
        price: item.Price,
        priceHistory: [{ date: today, price: item.Price }],
        unit: `${item.Unit} ${item.UnitType}`,
        bio: item.IsBio,
        url: `https://www.roksh.at/hofer/produkte/${item.CategorySEOName}/${item.SEOName}`
    };
}

exports.fetchData = async function() {
    const HOFER_BASE_URL = `https://shopservice.roksh.at`
    const CATEGORIES = HOFER_BASE_URL + `/category/GetFullCategoryList/`
    const CONFIG = { headers: { authorization: null } }
    const ITEMS = HOFER_BASE_URL + `/productlist/CategoryProductList`

    // fetch access token
    const token_data = { "OwnWebshopProviderCode": "", "SetUserSelectedShopsOnFirstSiteLoad": true, "RedirectToDashboardNeeded": false, "ShopsSelectedForRoot": "hofer", "BrandProviderSelectedForRoot": null, "UserSelectedShops": [] }
    const token = (await axios.post("https://shopservice.roksh.at/session/configure", token_data, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } })).headers['jwt-auth'];
    CONFIG.headers.authorization = "Bearer " + token;

    // concat all subcategories (categories.[i].ChildList)
    const categories = (await axios.post(CATEGORIES, {}, CONFIG)).data;
    const subCategories = categories.reduce((acc, category) => acc.concat(category.ChildList), []);

    let hoferItems = [];
    for (let subCategory of subCategories) {
        let categoryData = (await axios.get(`${ITEMS}?progId=${subCategory.ProgID}&firstLoadProductListResultNum=4&listResultProductNum=24`, CONFIG)).data;
        const numPages = categoryData.ProductListResults[0].ListContext.TotalPages;

        for (let iPage = 1; iPage <= numPages; iPage++) {
            let items = (await axios.post(`${HOFER_BASE_URL}/productlist/GetProductList`, { CategoryProgId: subCategory.ProgID, Page: iPage }, CONFIG)).data;
            hoferItems = hoferItems.concat(items.ProductList);
        }
    }

    return hoferItems;
}
const axios = require("axios");

const conversions = {
    "": {unit: "stk", factor: 1},
    "Blatt": {unit: "stk", factor: 1},
    "g": {unit: "g", factor: 1},
    "gg": {unit: "g", factor: 1},
    "gramm": {unit: "g", factor: 1},
    "kg": {unit: "g", factor: 1000},
    "KG": {unit: "g", factor: 1000},
    "cl": {unit: "ml", factor: 100},
    "l": {unit: "ml", factor: 1000},
    "L": {unit: "ml", factor: 1000},
    "ml": {unit: "ml", factor: 1},
    "Paar": {unit: "stk", factor: 1},
    "Stk.": {unit: "stk", factor: 1},
    "stück": {unit: "stk", factor: 1},
    "Stück": {unit: "stk", factor: 1},
    "er": {unit: "stk", factor: 1},
    "Teebeutel": {unit: "stk", factor: 1},
};

exports.getCanonical = function(item, today) {
    // try to read quantity and unit from product name
    let unit, quantity = 1;
    const name = item.ProductName;
    const nameTokens = name.trim().replaceAll('(','').replaceAll(')','').replaceAll(',', '.').split(' ');
    const lastToken = nameTokens[nameTokens.length-1];
    const secondLastToken = nameTokens.length > 2 ? nameTokens[nameTokens.length-2] : null;
    const regex = /^([0-9.x]+)(.*)$/;
    const matches = lastToken.match(regex);
    if(matches) {
      matches[1].split('x').forEach( (q)=> {
        quantity = quantity * parseFloat(q)
      })
      unit = matches[2];
    }
    else if(secondLastToken !== null && secondLastToken.match(/^([0-9.]+)$/)) {
      quantity = parseFloat(secondLastToken)
      unit = lastToken;
    }
    else {
        // fallback: use given quantity and unit (including packaging)
        quantity = item.Unit
        unit= item.UnitType
    }
    if(unit in conversions) {
      const conv = conversions[unit];
      quantity = conv.factor * quantity;
      unit = conv.unit;
    }
    else
      console.error(`Unknown unit in hofer: '${unit}'`)
    return {
        id: item.ProductID,
        name: item.ProductName,
        price: item.Price,
        priceHistory: [{ date: today, price: item.Price }],
        isWeighted: item.IsBulk,
        unit,
        quantity,
        bio: item.IsBio
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

const axios = require("axios");
const analysis = require("./analysis");
const stores = require("./stores");
const utils = require("./stores/utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

(async () => {
    let total = 0;

    let result = [];

    for (let i = 1; i <= utils.globalCategories.length; i++) {
        const categoryName = utils.globalCategories[i - 1];
        const categoryCode = i < 10 ? "" + i : String.fromCharCode("A".charCodeAt(0) + (i - 10));

        const category = {
            code: categoryCode,
            name: categoryName,
            subCategories: [],
        };
        result.push(category);

        for (let j = 1; j <= categoryName.subcategories.length; j++) {
            const subCategoryName = categoryName.subcategories[j - 1];
            const subCategoryCode = j < 10 ? "" + j : String.fromCharCode("A".charCodeAt(0) + (j - 10));
            const code = `B2-${categoryCode}${subCategoryCode}`;
            const subCategory = {
                code: subCategoryCode,
                name: `${categoryName.name}>${subCategoryName}`,
                items: [],
            };
            category.subCategories.push(subCategory);

            console.log("Fetching items for category " + code + ` ${categoryName.name} > ${subCategoryName}`);
            const BILLA_SEARCH = `https://shop.billa.at/api/search/full?searchTerm=*&storeId=00-10&pageSize=${HITS}&category=${code}`;
            const data = (await axios.get(BILLA_SEARCH)).data;
            data.tiles.forEach((item) => {
                try {
                    const canonicalItem = stores.billa.getCanonical(item);
                    canonicalItem.categoryCode = `${categoryCode}${subCategoryCode}`;
                    canonicalItem.categoryName = `${categoryName.name} > ${subCategoryName}`;
                    subCategory.items.push(canonicalItem);
                } catch (e) {
                    // Ignore super tiles
                }
            });
            total += subCategory.items.length;
            console.log(subCategory.items.length + " items");
        }
    }
    console.log("Total: " + total);
    analysis.writeJSON("categories.json", result);

    const lookup = {};
    for (const category of result) {
        for (const subCategory of category.subCategories) {
            for (const item of subCategory.items) {
                if (lookup[item.id]) {
                    console.log(`Duplicate item: ${item.name} in category ${item.categoryName} and ${lookup[item.id].categoryName}`);
                } else {
                    lookup[(item.id = item)];
                }
            }
        }
    }
})();

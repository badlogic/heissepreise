const fs = require("fs");
const axios = require("axios");
const analysis = require("./analysis");
const stores = require("./stores");
const utils = require("./stores/utils");
const siteUtils = require("./site/utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

(async () => {
    let total = 0;

    let categories;
    if (!fs.existsSync("categories.json")) {
        categories = [];
        for (let i = 1; i <= utils.globalCategories.length; i++) {
            const categoryName = utils.globalCategories[i - 1];
            const categoryCode = i < 10 ? "" + i : String.fromCharCode("A".charCodeAt(0) + (i - 10));

            const category = {
                code: categoryCode,
                name: categoryName,
                subCategories: [],
            };
            categories.push(category);

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
        analysis.writeJSON("categories.json", categories);
    } else {
        categories = analysis.readJSON("categories.json");
    }

    const items = [];
    const lookup = {};
    for (const category of categories) {
        for (const subCategory of category.subCategories) {
            for (const item of subCategory.items) {
                if (item.name.toLowerCase().indexOf("erdapfel") >= 0) item.name += " kartoffel";
                if (item.name.toLowerCase().indexOf("erdäpfel") >= 0) item.name += " kartoffeln";
                items.push(item);
                lookup[item.id] = item;
            }
        }
    }

    const useUnits = true;
    console.log("Vectorizing items");
    siteUtils.vectorizeItems(items, useUnits);

    console.log("Categorizing items");
    const file = process?.argv?.[2] ?? "site/data/momentum-cart.json";
    let momentumItems = analysis.readJSON(file);
    if (momentumItems.items) momentumItems = momentumItems.items;
    siteUtils.vectorizeItems(momentumItems, useUnits);
    const start = performance.now();
    for (const item of momentumItems) {
        const similar = siteUtils.findMostSimilarItems(item, items, 9, (ref, other) => ref.unit == other.unit);
        console.log(`${item.name}`);
        similar.sort((a, b) => b.similarity - a.similarity);
        similar.forEach((s) => console.log(`${s.item.categoryName}, ${s.item.name}, ${s.similarity}`));
        console.log();
    }
    const took = (performance.now() - start) / 1000;
    console.log("Took: " + took.toFixed(3) + ", " + (momentumItems.length / took).toFixed(2) + "/s");
})();

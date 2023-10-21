const axios = require("axios");
const fs = require("fs");

const baseCategorySlugs = [
    "obst-und-gemuese-13751",
    "brot-und-gebaeck-13766",
    "getraenke-13784",
    "kuehlwaren-13841",
    "tiefkuehl-13916",
    "nahrungsmittel-13943",
    "suesses-und-salziges-14057",
    "pflege-14083",
    "haushalt-14126",
    "haustier-14181",
];

// Map from old categories (see categories.js) to new categories in new Billa Store
const subCategoryMap = {
    "vegan-13911": "3A",
    "tofu-14529": "3A",
    "fleisch-und-gefluegel-13921": "42",
    "fisch-und-meeresfruechte-13930": "43",
    "pizza-baguette-und-gebaeck-13936": "46",
    "pommes-frites-und-mehr-13935": "45",
    "tiefkuehlgerichte-13922": "42",
    "gemuese-kraeuter-und-obst-13934": "44",
    "eis-13917": "40",
    "suessspeisen-und-torten-13939": "47",
    "vegane-ernaehrung-14048": "5D",
    "filter-und-entkalker-14535": "88",
    "hygiene-schutzartikel-14536": "8F",
};

exports.generateCategories = async function () {
    const categories = [];
    let baseIndex = 0;
    for (const baseSlug of baseCategorySlugs) {
        const data = await axios.get(`https://shop.billa.at/api/categories/${baseSlug}/child-properties?storeId=00-10`);
        data.data.forEach((value, index) => {
            const code = subCategoryMap[value.slug] ?? baseIndex.toString(16).toUpperCase() + index.toString(16).toUpperCase();
            categories.push({
                id: value.slug,
                description: value.name,
                url: "https://shop.billa.at/kategorie/" + value.slug,
                code,
            });
        });
        baseIndex++;
    }
    return categories;
};

exports.fetchData = async function () {
    const categories = await exports.generateCategories();
    const rawItems = [];
    for (const category of categories) {
        let page = 0;
        while (true) {
            const data = await axios.get(`https://shop.billa.at/api/categories/${category.id}/products?pageSize=500&storeId=00-10&page=${page}`);
            page++;
            if (data.data.count == 0) break;
            for (const rawItem of data.data.results) {
                rawItem.mappedCategory = category.code;
            }
            rawItems.push(...data.data.results);
        }
        console.log("Fetched Billa category " + category.id);
    }
    const lookup = {};
    const dedupRawItems = [];
    let duplicates = 0;
    for (const rawItem of rawItems) {
        if (lookup[rawItem.sku]) {
            duplicates++;
        } else {
            lookup[rawItem.sku] = rawItem;
            dedupRawItems.push(rawItem);
        }
    }
    console.log("Billa duplicates: " + duplicates);
    console.log("Billa total items: " + dedupRawItems.length);
    return dedupRawItems;
};

if (require.main === module) {
    main();
}

async function main() {
    const oldItems = JSON.parse(fs.readFileSync("latest-canonical.json")).filter((item) => item.store == "billa");
    const oldItemsLookup = {};
    for (const oldItem of oldItems) {
        oldItemsLookup[oldItem.id] = oldItem;
    }
    const newItems = await exports.fetchData();
    for (const newItem of newItems) {
        if (!oldItemsLookup[newItem.sku]) {
            console.log("Couldn't find " + newItem.sku + " " + newItem.name);
        }
    }
}

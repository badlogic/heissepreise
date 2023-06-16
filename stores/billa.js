const axios = require("axios");
const utils = require("./utils");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    beutel: { unit: "stk", factor: 1 },
    bund: { unit: "stk", factor: 1 },
    packung: { unit: "stk", factor: 1 },
    portion: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    waschgang: { unit: "wg", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = 1,
        unit = "kg";

    if (item.data.grammagePriceFactor == 1) {
        if (item.data.grammage.indexOf("Per ") == 0) item.data.grammage = item.data.grammage.replace("Per ", "");
        const grammage = item.data.grammage !== "" && item.data.grammage.trim().split(" ").length > 1 ? item.data.grammage : item.data.price.unit;
        if (grammage) [quantity, unit] = grammage.trim().split(" ").splice(0, 2);
    }

    return utils.convertUnit(
        {
            id: item.data.articleId,
            name: item.data.name,
            price: item.data.price.final,
            priceHistory: [{ date: today, price: item.data.price.final }],
            isWeighted: item.data.isWeightArticle,
            unit,
            quantity,
            bio: item.data.attributes && item.data.attributes.includes("s_bio"),
        },
        units,
        "billa"
    );
};

exports.fetchData = async function () {
    const items = [];
    const lookup = {};
    let numDuplicates = 0;

    for (let i = 1; i <= utils.globalCategories.length; i++) {
        const category = utils.globalCategories[i - 1];
        const categoryCode = i < 10 ? "" + i : String.fromCharCode("A".charCodeAt(0) + (i - 10));

        for (let j = 1; j <= category.subcategories.length; j++) {
            const subCategoryCode = j < 10 ? "" + j : String.fromCharCode("A".charCodeAt(0) + (j - 10));
            const code = `B2-${categoryCode}${subCategoryCode}`;

            const BILLA_SEARCH = `https://shop.billa.at/api/search/full?searchTerm=*&storeId=00-10&pageSize=${HITS}&category=${code}`;
            const data = (await axios.get(BILLA_SEARCH)).data;
            data.tiles.forEach((item) => {
                try {
                    const canonicalItem = exports.getCanonical(item);
                    if (lookup[canonicalItem.id]) {
                        numDuplicates++;
                        return;
                    }
                    lookup[canonicalItem.id] = item;
                    items.push(item);
                } catch (e) {
                    // Ignore super tiles
                }
            });
        }
    }
    console.log(`Duplicate items in BILLA data: ${numDuplicates}, total items: ${items.length}`);
    return items;
};

exports.urlBase = "https://shop.billa.at";

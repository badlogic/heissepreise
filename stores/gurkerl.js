const axios = require("axios");
const utils = require("./utils");

const units = {
    bund: { unit: "stk", factor: 1 },
    pack: { unit: "stk", factor: 1 },
    wl: { unit: "stk", factor: 1 },
    " 200 stk": { unit: "stk", factor: 200 },
};

const GURKERL_WARHOUSE = 9000;

async function getCategories() {
    let path = `https://www.gurkerl.at/services/frontend-service/renderer/navigation/flat.json?warehouseId=${GURKERL_WARHOUSE}`;
    let json = await axios.get(path);
    let cids = [];

    for (const [key, value] of Object.entries(json.data.navigation)) {
        if (value.parentId > 0) {
            continue;
        }
        cids.push(value.id);
    }

    return cids;
}

async function getChunked(urlPrefix, ids, chunkSize = 200) {
    let res = [];
    let chunks = [];
    let retries = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
    }

    for (let [idx, chunk] of chunks.entries()) {
        // console.log(`Chunk ${idx+1}/${chunks.length}`);
        let json;
        try {
            json = await axios.get(urlPrefix + chunk.join("&"), { timeout: 2000 });
        } catch (ex) {
            console.error(ex);
        }

        if (json) {
            res = res.concat(json.data);
        } else {
            idx--;
            retries++;
        }
        await sleep(retries * 100);
    }

    return res;
}

async function getProducts(cid) {
    let path = `https://www.gurkerl.at/api/v1/categories/normal/${cid}/products?page=0&size=10000`;
    let pidsJSON = await axios.get(path);
    let pids = pidsJSON.data.productIds;

    let pidsQuery = pids.map((pid) => `products=${pid}`);
    let products = await getChunked(`https://www.gurkerl.at/api/v1/products?`, pidsQuery);

    let jsonPrices = await getChunked(`https://www.gurkerl.at/api/v1/products/prices?`, pidsQuery);
    jsonPrices.forEach((p) => {
        let pIndex = products.findIndex((prod) => prod.id == p.productId);
        products[pIndex].price = p.price;
        products[pIndex].sales = p.sales;
    });

    return products;
}

exports.getCanonical = function (item, today) {
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.textualAmount);

    let price = item.price.amount;
    if (item.sales?.[0]?.type == "sale") {
        // Temp. discounted price
        price = item.sales[0].price.amount;
    }

    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            price: price,
            priceHistory: [{ date: today, price: price }],
            quantity,
            unit,
            bio: item.name.toLowerCase().includes("bio"),
            slug: item.id, // @TODO: add real slug, id only works though
        },
        units,
        "gurkerl"
    );
};

exports.fetchData = async function () {
    let cids = await getCategories();
    let products = [];

    for (let cid of cids) {
        console.log(`Fetching category ${cid}:`);
        products = products.concat(await getProducts(cid));
    }

    return products;
};

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

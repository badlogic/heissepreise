const fs = require("fs");
const fsAsync = require("fs").promises;
const zlib = require("zlib");
const stores = require("./stores");
const { FILE } = require("dns");
const { promisify } = require("util");

const STORE_KEYS = Object.keys(stores);
exports.STORE_KEYS = STORE_KEYS;

const BROTLI_OPTIONS = {
    params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 9,
        [zlib.constants.BROTLI_PARAM_LGWIN]: 22,
    },
};

const FILE_COMPRESSOR = "br";
exports.FILE_COMPRESSOR = FILE_COMPRESSOR;

function readJSON(file) {
    let data = fs.readFileSync(file);
    if (file.endsWith(".gz")) data = zlib.gunzipSync(data);
    if (file.endsWith(".br")) data = zlib.brotliDecompressSync(data);
    return JSON.parse(data);
}
exports.readJSON = readJSON;

async function readJSONAsync(file) {
    const gunzipAsync = promisify(zlib.gunzip);
    const brotliDecompressAsync = promisify(zlib.brotliDecompress);

    let data = await fsAsync.readFile(file);
    if (file.endsWith(".gz")) data = await gunzipAsync(data);
    if (file.endsWith(".br")) data = await brotliDecompressAsync(data);
    return JSON.parse(data);
}
exports.readJSONAsync = readJSONAsync;

function writeJSON(file, data, fileCompressor = false, spacer = 2, compressData = false) {
    if (compressData) data = compress(data);
    data = JSON.stringify(data, null, spacer);
    if (fileCompressor == "gz") data = zlib.gzipSync(data);
    if (fileCompressor == "br") data = zlib.brotliCompressSync(data, BROTLI_OPTIONS);
    fs.writeFileSync(`${file}${fileCompressor ? "." + fileCompressor : ""}`, data);
}
exports.writeJSON = writeJSON;

function currentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCanonicalFor(store, rawItems, today) {
    const canonicalItems = [];
    for (let i = 0; i < rawItems.length; i++) {
        const item = stores[store]?.getCanonical(rawItems[i], today);
        if (item)
            canonicalItems.push({
                store,
                ...item,
            });
    }
    return canonicalItems;
}

function mergePriceHistory(oldItems, items) {
    if (oldItems == null) return items;

    const lookup = {};
    for (oldItem of oldItems) {
        lookup[oldItem.store + oldItem.id] = oldItem;
    }

    for (item of items) {
        let oldItem = lookup[item.store + item.id];
        delete lookup[item.store + item.id];
        let currPrice = item.priceHistory[0];
        if (oldItem) {
            if (oldItem.priceHistory[0].price == currPrice.price) {
                item.priceHistory = oldItem.priceHistory;
                continue;
            }

            for (oldPrice of oldItem.priceHistory) {
                item.priceHistory.push(oldPrice);
            }
        }
    }

    console.log(`${Object.keys(lookup).length} not in latest list.`);
    for (key of Object.keys(lookup)) {
        items.push(lookup[key]);
    }

    sortItems(items);
    console.log(`Items: ${items.length}`);

    return items;
}

function compareItems(refItems, items) {
    const changes = [];
    const lookup = {};
    for (let refItem of refItems) lookup[refItem.store + refItem.id] = refItem;

    for (let item of items) {
        const refItem = lookup[item.store + item.id] ?? {};
        const itemChanges = {};
        for (let key of Object.keys(item)) {
            const ref = (refItem[key] ?? "").toString();
            const now = (item[key] ?? "").toString();
            // second checks remove comparison artifacts for invalid prices
            if (now !== ref && !(now == "NaN" && ref == "")) {
                itemChanges[key] = "" + ref + " -> " + now;
            }
        }

        if (Object.keys(itemChanges).length) {
            itemChanges.name = itemChanges.name ?? refItem.name;
            itemChanges.store = itemChanges.store ?? refItem.store;
            changes.push(itemChanges);
        }
    }
    console.log(`Compared with reference file: ${changes.length} items changed`);
    return changes;
}

function sortItems(items) {
    items.sort((a, b) => {
        if (a.store < b.store) {
            return -1;
        } else if (a.store > b.store) {
            return 1;
        }

        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }

        return 0;
    });
}

// Keep this in sync with utils.js:decompress
function compress(items) {
    const compressed = {
        stores: STORE_KEYS,
        n: items.length,
        data: [],
    };
    const data = compressed.data;
    for (item of items) {
        data.push(STORE_KEYS.indexOf(item.store));
        data.push(item.id);
        data.push(item.name);
        data.push(item.priceHistory.length);
        for (price of item.priceHistory) {
            data.push(price.date.replaceAll("-", ""));
            data.push(price.price);
        }
        data.push(item.unit);
        data.push(item.quantity);
        data.push(item.isWeighted ? 1 : 0);
        data.push(item.bio ? 1 : 0);
        data.push(item.url?.replace(stores[item.store].urlBase, ""));
    }
    return compressed;
}
exports.compress = compress;

/// Given a directory of raw data of the form `$store-$date.json`, constructs
/// a canonical list of all products and their historical price data.
exports.replay = function (rawDataDir) {
    const today = currentDate();

    const files = fs
        .readdirSync(rawDataDir)
        .filter((file) => file.indexOf("canonical") == -1 && STORE_KEYS.some((store) => file.indexOf(`${store}-`) == 0));

    const dateSort = (a, b) => {
        const dateA = new Date(a.match(/\d{4}-\d{2}-\d{2}/)[0]);
        const dateB = new Date(b.match(/\d{4}-\d{2}-\d{2}/)[0]);
        return dateA - dateB;
    };

    const getFilteredFilesFor = (store) =>
        files
            .filter((file) => file.indexOf(`${store}-`) == 0)
            .sort(dateSort)
            .map((file) => rawDataDir + "/" + file);

    const storeFiles = {};
    const canonicalFiles = {};

    for (const store of STORE_KEYS) {
        storeFiles[store] = getFilteredFilesFor(store);
        canonicalFiles[store] = storeFiles[store].map((file) => getCanonicalFor(store, readJSON(file), file.match(/\d{4}-\d{2}-\d{2}/)[0]));
        canonicalFiles[store].reverse();
    }

    const allFilesCanonical = [];
    const len = Math.max(...Object.values(canonicalFiles).map((filesByStore) => filesByStore.length));
    for (let i = 0; i < len; i++) {
        const canonical = [];
        Object.values(canonicalFiles).forEach((filesByStore) => {
            const file = filesByStore.pop();
            if (file) canonical.push(...file);
        });
        allFilesCanonical.push(canonical);
    }

    if (allFilesCanonical.length == 0) return null;
    if (allFilesCanonical.length == 1) return allFilesCanonical[0];

    let prev = allFilesCanonical[0];
    let curr = null;
    for (let i = 1; i < allFilesCanonical.length; i++) {
        curr = allFilesCanonical[i];
        mergePriceHistory(prev, curr);
        prev = curr;
    }
    return curr;
};

exports.updateData = async function (dataDir, done) {
    const today = currentDate();
    console.log("Fetching data for date: " + today);
    const storeFetchPromises = [];
    for (const store of STORE_KEYS) {
        storeFetchPromises.push(
            new Promise(async (resolve) => {
                const start = performance.now();
                try {
                    const rawDataFile = `${dataDir}/${store}-${today}.json`;
                    let storeItems;
                    if ("SKIP_FETCHING_STORE_DATA" in process.env && fs.existsSync(rawDataFile + "." + FILE_COMPRESSOR))
                        storeItems = await readJSONAsync(rawDataFile + "." + FILE_COMPRESSOR);
                    else {
                        storeItems = await stores[store].fetchData();
                        writeJSON(rawDataFile, storeItems, FILE_COMPRESSOR);
                    }
                    const storeItemsCanonical = getCanonicalFor(store, storeItems, today);
                    console.log(`Fetched ${store.toUpperCase()} data, took ${(performance.now() - start) / 1000} seconds`);
                    resolve(storeItemsCanonical);
                } catch (e) {
                    console.error(`Error while fetching data from ${store}, continuing after ${(performance.now() - start) / 1000} seconds...`, e);
                    resolve([]);
                }
            })
        );
    }

    const items = [].concat(...(await Promise.all(storeFetchPromises)));

    if (fs.existsSync(`${dataDir}/latest-canonical.json.${FILE_COMPRESSOR}`)) {
        const oldItems = readJSON(`${dataDir}/latest-canonical.json.${FILE_COMPRESSOR}`);
        mergePriceHistory(oldItems, items);
        console.log("Merged price history");
    }

    if (fs.existsSync(`${dataDir}/latest-canonical-reference.json.${FILE_COMPRESSOR}`)) {
        const refItems = readJSON(`${dataDir}/latest-canonical-reference.json.${FILE_COMPRESSOR}`);
        const changes = compareItems(refItems, items);
        writeJSON(`${dataDir}/latest-canonical-changes.json`, changes, FILE_COMPRESSOR);
    }

    sortItems(items);
    writeJSON(`${dataDir}/latest-canonical.json`, items, FILE_COMPRESSOR);

    if (done) done(items);
    return items;
};

exports.migrateCompression = (dataDir, fromSuffix, toSuffix, remove = true) => {
    console.log(`Migrating ${fromSuffix} data to ${toSuffix}`);
    let fileCompressor = toSuffix == ".json" ? false : toSuffix.replace(".json.", "");
    const files = fs
        .readdirSync(dataDir)
        .filter(
            (file) => (file.startsWith("latest-canonical") || STORE_KEYS.some((store) => file.startsWith(`${store}-`))) && file.endsWith(fromSuffix)
        );
    for (const file of files) {
        const fromPath = `${dataDir}/${file}`;
        const toPath = fromPath.substring(0, fromPath.length - fromSuffix.length) + toSuffix;
        console.log(`${fromPath} -> ${toPath}`);
        const data = readJSON(fromPath);
        writeJSON(toPath.substring(0, toPath.lastIndexOf(".json") + 5), data, fileCompressor);
    }
    if (remove) {
        for (const file of files) {
            const path = `${dataDir}/${file}`;
            fs.unlinkSync(path);
        }
    }
};

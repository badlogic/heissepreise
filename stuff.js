const fs = require("fs");
const stores = require("./stores");
const STORE_KEYS = Object.keys(stores);

function grammageAnalysis() {
    const items = JSON.parse(fs.readFileSync("docker/data/latest-canonical.json"));
    items.sort((item) => item.priceHistory.length);

    for (item of items) {
        if (item.priceHistory.length > 2) console.log(JSON.stringify(item, null, 2));
    }

    const units = {};
    const unitsSmall = {};

    for (item of items) {
        const tokens = item.unit ? item.unit.split(/\s+/) : [];
        if (tokens.length == 0) continue;
        if (tokens[0].charAt(0) >= "0" && tokens[0].charAt(0) <= "9") {
            tokens.splice(0, 1);
        }
        units[tokens.join(" ")] = item;
        unitsSmall[tokens[0]] = item;
    }
    console.log(JSON.stringify(Object.keys(units), null, 2));
    console.log(Object.keys(units).length);
    console.log(JSON.stringify(Object.keys(unitsSmall), null, 2));
    console.log(Object.keys(unitsSmall).length);

    const hofer = JSON.parse(fs.readFileSync("docker/data/hofer-2023-05-19.json"));
    const unitTypes = {};
    for (item of hofer) {
        unitTypes[item.UnitType] = true;
    }
    console.log(JSON.stringify(unitTypes, null, 2));

    {
        console.log("BILLA Units ===============");
        const billa = JSON.parse(fs.readFileSync("docker/data/billa-2023-05-19.json"));
        const billaUnits = {};
        let noGrammage = 0;
        let zeroTokens = 0;
        let zeroUnits = {};
        for (item of billa) {
            if (!item.data.grammage) {
                noGrammage++;
                continue;
            }
            let tokens = item.data.grammage.split(" ");
            if (tokens.length > 0) {
                if (tokens[0].charAt(0) >= 0 && tokens[0].charAt(0) <= 9 && tokens.length >= 2) {
                    tokens.splice(0, 1);
                    billaUnits[tokens[0]] = billaUnits[tokens[0]] ? billaUnits[tokens[0]] + 1 : 1;
                } else {
                    zeroUnits[item.data.grammage] = zeroUnits[item.data.grammage] ? zeroUnits[item.data.grammage] + 1 : 1;
                }
            } else {
                zeroTokens++;
            }
        }
        console.log(JSON.stringify(billaUnits, null, 2));
        console.log(`no grammage: ${noGrammage}, zero tokens: ${zeroTokens}`);
        console.log(JSON.stringify(zeroUnits, null, 2));
    }

    {
        console.log("SPAR Units ===============");
        const billa = JSON.parse(fs.readFileSync("docker/data/spar-2023-05-19.json"));
        const billaUnits = {};
        let noGrammage = [];
        let noGrammageUnits = {};
        let zeroTokens = 0;
        let zeroUnits = {};
        for (item of billa) {
            let unit;
            if (item.masterValues["quantity-selector"]) {
                const [str_price, str_unit] = item.masterValues["price-per-unit"].split("/");
                unit = str_unit.trim();
            } else {
                unit = item.masterValues["short-description-3"];
            }

            if (!unit) {
                noGrammage.push(item);
                noGrammageUnits[item.masterValues["sales-unit"]] = noGrammageUnits[item.masterValues["sales-unit"]]
                    ? noGrammageUnits[item.masterValues["sales-unit"]] + 1
                    : 1;
                continue;
            }
            let tokens = unit.split(" ");
            if (tokens.length > 0) {
                if (tokens[0].charAt(0) >= 0 && tokens[0].charAt(0) <= 9 && tokens.length >= 2) {
                    tokens.splice(0, 1);
                    billaUnits[tokens[0]] = billaUnits[tokens[0]] ? billaUnits[tokens[0]] + 1 : 1;
                } else {
                    zeroUnits[unit] = zeroUnits[unit] ? zeroUnits[unit] + 1 : 1;
                }
            } else {
                zeroTokens++;
            }
        }
        console.log(JSON.stringify(billaUnits, null, 2));
        console.log(`no grammage: ${noGrammage.length}, zero tokens: ${zeroTokens}`);
        console.log(JSON.stringify(zeroUnits, null, 2));
        console.log(JSON.stringify(noGrammageUnits, null, 2));
        fs.writeFileSync("spar-no-grammage.json", JSON.stringify(noGrammage, null, 2));
    }
}

function momentumCartConversion() {
    const items = JSON.parse(fs.readFileSync("docker/data/latest-canonical.json"));
    const lookup = {};
    for (item of items) {
        lookup[item.sparId ? item.sparId : item.id] = item;
    }

    const lines = fs.readFileSync("momentum-cart.csv").toString().split(/\r?\n/);
    const cart = {
        name: "Momentum Eigenmarken Vergleich",
        items: [],
    };
    for (line of lines) {
        const [sparId, billaId] = line.split(/\s+/);
        const sparItem = lookup[sparId];
        const billaItem = lookup[billaId];
        if (!sparItem) {
            console.log(`Spar item ${sparId} not found`);
            console.log(line);
            continue;
        }
        if (!billaItem) {
            console.log(`Billa item ${billaId} not found`);
            console.log(line);
            continue;
        }
        cart.items.push(sparItem);
        cart.items.push(billaItem);
    }
    fs.writeFileSync("site/momentum-cart.json", JSON.stringify(cart, null, 2));
}

function fixSparHistoricalData(dataDir) {
    const files = fs.readdirSync(dataDir).filter((file) => file.indexOf("canonical") == -1 && file.indexOf(`spar-`) == 0);
    console.log(files);

    for (file of files) {
        const items = JSON.parse(fs.readFileSync(`${dataDir}/${file}`));
        if (items.hits) {
            console.log(`Rewriting ${file}`);
            fs.writeFileSync(`${dataDir}/${file}`, JSON.stringify(items.hits, null, 2));
        }
    }
}

const nReadlines = require("n-readlines");

function convertDossierData(dataDir, file) {
    console.log(`Converting ${file}`);
    const lookup = {};
    for (item of JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`))) {
        lookup[item.store + item.id] = item;
        if (item.sparId) lookup[item.store + "-" + item.sparId] = item;
    }

    const lines = new nReadlines(file);

    const itemsPerDate = {};
    let line = null;
    const store = file.indexOf("spar") == 0 ? "spar" : "billa";
    lines.next();
    let itemsTotal = 0;
    let notFound = 0;
    while ((line = lines.next())) {
        itemsTotal++;
        const tokens = line.toString("utf-8").split(";");
        const dateTokens = tokens[0].split(".");
        const date = "20" + dateTokens[2] + "-" + dateTokens[1] + "-" + dateTokens[0];
        const producer = tokens[5];
        const name = tokens[3];
        const unit = tokens[6];
        const price = Number.parseFloat(tokens[7].replace("€", "").trim().replace(",", "."));
        const id = tokens[4].replace("ARTIKELNUMMER: ", "").replace("Art. Nr.: ", "");
        let item = lookup[store + id];
        if (!item) item = lookup[store + "-" + id];
        if (!item) {
            // console.log("Couldn't find item " + name);
            notFound++;
            continue;
        }
        let items = itemsPerDate[date];
        if (!items) itemsPerDate[date] = items = [];
        if (store == "spar") {
            items.push({
                masterValues: {
                    "code-internal": item.id,
                    "product-number": id,
                    price,
                    title: producer,
                    "short-description": name,
                    "short-description-3": unit,
                    bioLevel: "",
                },
            });
        } else {
            items.push({
                data: {
                    articleId: id,
                    name: name,
                    price: {
                        final: price,
                    },
                    grammagePriceFactor: 1,
                    grammage: unit,
                },
            });
        }
    }
    console.log("total: " + itemsTotal);
    console.log("not found: " + notFound);

    const dates = Object.keys(itemsPerDate).sort((a, b) => b.localeCompare(a));
    for (date of dates) {
        fs.writeFileSync(`${dataDir}/${store}-${date}.json`, JSON.stringify(itemsPerDate[date], null, 2));
    }
    console.log(`Wrote files for ${file}`);
}

function clownCompress(dataDir) {
    const items = JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`));
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
            data.push(price.date.replace("-", ""));
            data.push(price.price);
        }
        data.push(item.unit);
        data.push(item.quantity);
        data.push(item.isWeighted ? 1 : 0);
        data.push(item.bio ? 1 : 0);
        switch (item.store) {
            case "billa":
                data.push(item.url.replace("https://shop.billa.at", ""));
                break;
            case "dm":
                data.push("");
                break;
            case "hofer":
                data.push(item.url.replace("https://www.roksh.at/hofer/produkte/", ""));
                break;
            case "lidl":
                data.push(item.url.replace("https://www.lidl.at", ""));
                break;
            case "mpreis":
                data.push("");
                break;
            case "spar":
                data.push(item.url.replace("https://www.interspar.at/shop/lebensmittel", ""));
                break;
            case "unimarkt":
                data.push(item.url.replace("https://shop.unimarkt.at", ""));
                break;
        }
    }
    fs.writeFileSync(`${dataDir}/clown.json`, JSON.stringify(compressed));
}

const clustering = require("./site/utils");

/*let items = JSON.parse(fs.readFileSync("palmolive.json"));
clustering.vectorizeItems(items);
let originalItems = JSON.parse(JSON.stringify(items));
let sortedItems = clustering.similaritySortItems(items);
for (item of sortedItems) {
    console.log(`${item.store} - ${item.name} - ${item.quantity} ${item.unit}`);
}*/

/* let clusters = clustering.cluster(items);
 let clusters = clustering.cluster(JSON.parse(fs.readFileSync("kellyssmall.json")));
for (cluster of clusters) {
    for (item of cluster.items) {
        console.log(`${item.store} - ${item.name} - ${item.quantity} ${item.unit} - ${item.similarity}`);
    }
    console.log("--------");
}*/

// clownCompress("data");
// momentumCartConversion();
// convertDossierData("data", "spar-2020.csv");
// convertDossierData("data", "billa-2020.csv");

(async () => {
    // let items = await stores.reweDe.fetchData();
    let items = JSON.parse(fs.readFileSync("tmp/reweDe-2023-05-31.json"));
    for (item of items) stores.reweDe.getCanonical(item);
})();

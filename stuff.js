const fs = require("fs");
const analysis = require("./analysis");

function grammageAnalysis() {
    const items = JSON.parse(fs.readFileSync("docker/data/latest-canonical.json"));
    items.sort(item => item.priceHistory.length);

    for (item of items) {
        if (item.priceHistory.length > 2)
            console.log(JSON.stringify(item, null, 2));
    }

    const units = {};
    const unitsSmall = {}

    for (item of items) {
        const tokens = item.unit ? item.unit.split(/\s+/) : [];
        if (tokens.length == 0) continue;
        if (tokens[0].charAt(0) >= '0' && tokens[0].charAt(0) <= '9') {
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
    const unitTypes = {}
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
                const [str_price, str_unit] = item.masterValues["price-per-unit"].split('/');
                unit = str_unit.trim();
            } else {
                unit = item.masterValues["short-description-3"];
            }

            if (!unit) {
                noGrammage.push(item);
                noGrammageUnits[item.masterValues["sales-unit"]] = noGrammageUnits[item.masterValues["sales-unit"]] ? noGrammageUnits[item.masterValues["sales-unit"]] + 1 : 1;
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
        items: []
    }
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

momentumCartConversion();
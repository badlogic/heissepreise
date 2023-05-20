const fs = require("fs");

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

const billa = JSON.parse(fs.readFileSync("docker/data/billa-2023-05-19.json"));
for (item of billa) {
    if (item.data.grammagePriceFactor != 1) {
        console.log(JSON.stringify(item.data.name + " " + item.data.grammage, null, 2));
    }
}

const spar = JSON.parse(fs.readFileSync("docker/data/spar-2023-05-19.json"));
for (item of spar) {
    if (item.masterValues["quantity-selector"]) {
        console.log(JSON.stringify(item.masterValues["short-description"] + " " + item.masterValues["price-per-unit"], null, 2));
    }
}
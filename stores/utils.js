const fs = require("fs");
const path = require("path");
const globalUnits = require("./global-units");

exports.mergeAndSaveCategories = (store, categories) => {
    const mappingFile = path.join(__dirname, `${store}-categories.json`);
    if (fs.existsSync(mappingFile)) {
        const oldMapping = JSON.parse(fs.readFileSync(mappingFile));
        const oldLookup = {};
        for (const category of oldMapping) {
            oldLookup[category.id] = category;
        }

        for (const category of categories) {
            const oldCategory = oldLookup[category.id];
            if (oldCategory == null) {
                console.log(`Found new unmapped category for ${store}: ${category.id} - ${category.description}`);
            } else {
                category.code = oldCategory.code;
                delete oldLookup[category.id];
            }
        }

        if (Object.keys(oldLookup).length > 0) {
            for (const key in oldLookup) {
                const category = oldLookup[key];
                console.log(`Found category absent in latest mapping for ${store}: ${category.id} - ${category.description}`);
                categories.push(category);
            }
        }
    }
    fs.writeFileSync(mappingFile, JSON.stringify(categories, null, 2));
    return categories;
};

exports.convertUnit = function (item, units, store, fallback) {
    if (typeof item.quantity == "string") item.quantity = parseFloat(item.quantity.replace(",", "."));

    let unit = item.unit;
    if (typeof unit === "string") unit = unit.toLowerCase();

    const conv = unit in globalUnits.globalUnits ? globalUnits.globalUnits[unit] : units[unit];
    if (conv === undefined) {
        if (fallback) {
            item.quantity = fallback.quantity;
            item.unit = fallback.unit;
        } else {
            console.error(`Unknown unit in ${store}: '${unit}' in item ${item.name}`);
        }
        return item;
    }

    item.quantity = conv.factor * item.quantity;
    item.unit = conv.unit;
    return item;
};

exports.parseUnitAndQuantityAtEnd = function (name) {
    if (!name) return [undefined, undefined];
    let unit,
        quantity = 1;
    const nameTokens = name.trim().replaceAll("(", "").replaceAll(")", "").replaceAll(",", ".").split(" ");
    const lastToken = nameTokens[nameTokens.length - 1];
    const secondLastToken = nameTokens.length >= 2 ? nameTokens[nameTokens.length - 2] : null;

    const token = parseFloat(lastToken) ? lastToken : secondLastToken + lastToken;
    const regex = /^([0-9.x]+)(.*)$/;
    const matches = token.match(regex);
    if (matches) {
        matches[1].split("x").forEach((q) => {
            quantity = quantity * parseFloat(q);
        });
        unit = matches[2];
        return [quantity, unit.toLowerCase()];
    }
    return [undefined, undefined];
};

exports.showHeap = () => {
    setInterval(() => {
        const mu = process.memoryUsage();
        // # bytes / KB / MB / GB
        const gbNow = mu["heapUsed"] / 1024 / 1024 / 1024;
        const gbRounded = Math.round(gbNow * 100) / 100;

        console.log(`Heap allocated ${gbRounded} GB`);
    }, 5000);
};

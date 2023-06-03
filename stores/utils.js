exports.globalUnits = {
    "stk.": { unit: "stk", factor: 1 },
    blatt: { unit: "stk", factor: 1 },
    paar: { unit: "stk", factor: 1 },
    stk: { unit: "stk", factor: 1 },
    st: { unit: "stk", factor: 1 },
    stück: { unit: "stk", factor: 1 },
    mm: { unit: "cm", factor: 0.1 },
    cm: { unit: "cm", factor: 1 },
    zentimeter: { unit: "cm", factor: 1 },
    m: { unit: "cm", factor: 100 },
    meter: { unit: "cm", factor: 100 },
    g: { unit: "g", factor: 1 },
    gramm: { unit: "g", factor: 1 },
    dag: { unit: "g", factor: 10 },
    kg: { unit: "g", factor: 1000 },
    kilogramm: { unit: "g", factor: 1000 },
    ml: { unit: "ml", factor: 1 },
    milliliter: { unit: "ml", factor: 1 },
    dl: { unit: "ml", factor: 10 },
    cl: { unit: "ml", factor: 100 },
    l: { unit: "ml", factor: 1000 },
    liter: { unit: "ml", factor: 1000 },
    wg: { unit: "wg", factor: 1 },
};

exports.convertUnit = function (item, units, store) {
    if (typeof item.quantity == "string") item.quantity = parseFloat(item.quantity.replace(",", "."));

    let unit = item.unit;
    if (typeof unit === "string") unit = unit.toLowerCase();

    const conv = unit in exports.globalUnits ? exports.globalUnits[unit] : units[unit];
    if (conv === undefined) {
        console.error(`Unknown unit in ${store}: '${unit}' in item ${item.name}`);
        return item;
    }

    item.quantity = conv.factor * item.quantity;
    item.unit = conv.unit;
    return item;
};

exports.parseUnitAndQuantityAtEnd = function (name) {
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

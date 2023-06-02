exports.convertUnit = function (item, units, store) {
    if (!(item.unit in units)) {
        console.error(`Unknown unit in ${store}: '${item.unit}' in item ${item.name}`);
        return item;
    }

    if (typeof item.quantity == "string") item.quantity = parseFloat(item.quantity.replace(",", "."));

    const conv = units[item.unit];
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

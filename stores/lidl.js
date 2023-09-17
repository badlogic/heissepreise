const axios = require("axios");
const utils = require("./utils");

const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    "": { unit: "stk", factor: 1 },
    dosen: { unit: "stk", factor: 1 },
    flasche: { unit: "stk", factor: 1 },
    flaschen: { unit: "stk", factor: 1 },
    "pkg.": { unit: "stk", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let quantity = 1;
    let unit = "";
    let text = (item.price.basePrice?.text ?? "").trim().split("(")[0].replaceAll(",", ".").toLowerCase();
    let isWeighted = false;

    if (text === "per kg") {
        isWeighted = true;
        unit = "kg";
    } else {
        if (text.startsWith("bei") && text.search("je ") != -1) text = text.substr(text.search("je "));

        for (let s of ["ab ", "je ", "ca. ", "z.b.: ", "z.b. "]) text = text.replace(s, "").trim();

        const regex = /^([0-9.x ]+)(.*)$/;
        const matches = text.match(regex);
        if (matches) {
            matches[1].split("x").forEach((q) => {
                quantity = quantity * parseFloat(q.split("/")[0]);
            });
            unit = matches[2].split("/")[0].trim().split(" ")[0];
        }
        unit = unit.split("-")[0];
    }

    const name = `${item.keyfacts?.supplementalDescription?.concat(" ") ?? ""}${item.fullTitle}`;

    return utils.convertUnit(
        {
            id: item.productId,
            name,
            description: item.keyfacts?.description ?? "",
            price: item.price.price,
            priceHistory: [{ date: today, price: item.price.price }],
            unit,
            quantity,
            url: item.canonicalUrl,
            bio: name.toLowerCase().includes("bio"),
        },
        units,
        "lidl"
    );
};

exports.fetchData = async function () {
    const LIDL_SEARCH = `https://www.lidl.cz/p/api/gridboxes/CZ/cs/?max=${HITS}`;
    return (await axios.get(LIDL_SEARCH)).data.filter((item) => !!item.price.price);
};

exports.initializeCategoryMapping = async () => {};

exports.mapCategory = (rawItem) => {};

exports.urlBase = "https://www.lidl.cz";

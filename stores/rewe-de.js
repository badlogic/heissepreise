const axios = require("axios");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const utils = require("./utils");
const { decompress } = require("../site/model/items");

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
    if (item.isCanonical) return item;

    let quantity = 1,
        unit = "kg";
    if (item.grammage && item.grammage.length > 0) {
        let grammage = item.grammage
            .trim()
            .replace(/\([^)]*\)/g, "")
            .replace(",", ".")
            .trim();
        let multiplier = 1;
        if (grammage.indexOf("x") != -1) {
            let tokens = grammage.split("x");
            multiplier = Number.parseFloat(tokens[0]);
            grammage = tokens[1];
        }

        let tokens = grammage.split(" ");
        if (tokens.length > 1) {
            quantity = Number.parseFloat(tokens[0]);
            unit = tokens[1];
        } else {
            [quantity, unit] = grammage.match(/^(\d+(?:\.\d+)?)(\D+)$/).slice(1);
            quantity = Number.parseFloat(quantity);
        }
        quantity *= multiplier;
    } else {
        quantity = 1;
        unit = "Stk";
    }

    let price = Number.parseFloat(item.currentPrice.split(" ")[0].replace(",", "."));
    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            price,
            priceHistory: [{ date: today, price }],
            isWeighted: false,
            unit,
            quantity,
            bio: false,
        },
        units,
        "reweDe"
    );
};

exports.fetchData = async function () {
    // For some unholy reason, Axios returns 403 when accessing the endpoint
    // Hack: use curl...
    /*const agent = new https.Agent({
        rejectUnauthorized: false
    });
    let axiosNoDefaults = axios.create({ headers: {} });
    const headers = {
        'Rd-Service-Types': 'PICKUP',
        'Rd-Market-Id': '440405',
        "User-Agent": "curl/7.84.0"
    }
    return (await axiosNoDefaults.get('https://mobile-api.rewe.de/api/v3/product-search?searchTerm=*&page=1&sorting=RELEVANCE_DESC&objectsPerPage=250&marketCode=440405&serviceTypes=PICKUP', { headers, httpsAgent: agent })).data;*/

    try {
        let pageId = 1;
        let result = (
            await exec(
                `curl -s "https://mobile-api.rewe.de/api/v3/product-search\?searchTerm\=\*\&page\=${pageId++}\&sorting\=RELEVANCE_DESC\&objectsPerPage\=250\&marketCode\=440405\&serviceTypes\=PICKUP" -H "Rd-Service-Types: PICKUP" -H "Rd-Market-Id: 440405"`
            )
        ).stdout;
        const firstPage = JSON.parse(result);
        const totalPages = firstPage.totalPages;
        const items = [...firstPage.products];
        for (let i = 2; i <= totalPages; i++) {
            items.push(
                ...JSON.parse(
                    (
                        await exec(
                            `curl -s "https://mobile-api.rewe.de/api/v3/product-search\?searchTerm\=\*\&page\=${pageId++}\&sorting\=RELEVANCE_DESC\&objectsPerPage\=250\&marketCode\=440405\&serviceTypes\=PICKUP" -H "Rd-Service-Types: PICKUP" -H "Rd-Market-Id: 440405"`
                        )
                    ).stdout
                ).products
            );
        }
        return items;
    } catch (e) {
        console.log("Failed to fetch REWE-DE data, either CURL is not installed, or CloudFlare protection kicked in.");
        const compressedItems = (await axios.get("https://heissepreise.github.io/data/latest-canonical.reweDe.compressed.json")).data;
        const items = decompress.decompress(compressedItems);
        for (const item of items) {
            item.isCanonical = true;
        }
        return items;
    }
};

exports.urlBase = "";

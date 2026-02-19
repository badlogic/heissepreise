const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");

const urlBase = "https://lotzapp.net/shop_v2/c45147dee729311ef5b5c3003946c48f";
exports.urlBase = urlBase;

// Fetch leaf category paths from navigation
const getMilaCategoryPages = async () => {
    const res = await axios.get(urlBase);
    const root = HTMLParser.parse(res.data);

    const allLinks = [];
    root.querySelectorAll(".katspalte a").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const path = href.replace(urlBase + "/", "");
        if (!/^\d+_/.test(path) || path.includes("/")) return;
        const isH4 = !!a.querySelector("h4");
        const isListText = !!a.querySelector(".list_text");
        if (isH4 || isListText) allLinks.push({ path, isH4, isListText });
    });

    // Deduplicate (nav appears twice: desktop + mobile)
    const seen = new Set();
    const unique = allLinks.filter(({ path }) => (seen.has(path) ? false : seen.add(path)));

    // Keep: list_text links (leaf subcategories) + h4 links with no list_text siblings (standalone)
    return unique
        .filter(({ isListText, isH4 }, i, arr) => {
            if (isListText) return true;
            if (isH4) {
                // Include if not followed by any list_text before next h4
                for (let j = i + 1; j < arr.length; j++) {
                    if (arr[j].isH4) break;
                    if (arr[j].isListText) return false;
                }
                return true;
            }
            return false;
        })
        .map(({ path }) => path);
};

// Parse "€ 1,76 / Stk." → { price: 1.76, unit: "stk." }
function parsePrice(text) {
    const match = text.replace(/&euro;/g, "€").match(/€\s*([\d,]+)\s*\/\s*(.+)/);
    if (!match) return { price: NaN, unit: "stk." };
    return {
        price: parseFloat(match[1].replace(",", ".")),
        unit: match[2].trim().toLowerCase(),
    };
}

exports.fetchData = async function () {
    const items = [];
    const categories = await getMilaCategoryPages();

    for (const category of categories) {
        const categoryId = category.split("_")[0];

        // Fetch all products
        const res = await axios.get(`${urlBase}/${category}`);
        const root = HTMLParser.parse(res.data);

        // Fetch bio product IDs via filter API
        const bioIds = new Set();
        try {
            const bioRes = await axios.post(urlBase + "/", `x=filter&v1=bio&v2=${categoryId}`, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
            const bioRoot = HTMLParser.parse(bioRes.data);
            bioRoot.querySelectorAll("input.artikel_img_menge_c").forEach((input) => {
                const id = (input.getAttribute("id") || "").replace("menge", "");
                if (id) bioIds.add(id);
            });
        } catch (e) {
            // bio detection is best-effort
        }

        root.querySelectorAll(".block.blockart").forEach((product) => {
            const input = product.querySelector("input.artikel_img_menge_c");
            if (!input) return;
            const id = (input.getAttribute("id") || "").replace("menge", "");
            if (!id) return;

            const link = product.querySelector("a");
            const rawHref = link?.getAttribute("href") || "";
            const url = rawHref ? new URL(rawHref, `${urlBase}/${category}`).href : "";

            const nameEl = product.querySelector(".text_artikelname");
            const name = (nameEl?.text || "").split("\n")[0].trim();

            const priceEl = product.querySelector(".text_preis i");
            if (!priceEl) return;
            const { price, unit } = parsePrice(priceEl.text);
            if (!name || isNaN(price)) return;

            items.push({ id, name, price, unit, url, categoryPath: category, bio: bioIds.has(id) });
        });
    }
    return items;
};

exports.getCanonical = function (item, today) {
    // Strip container-type suffixes before unit parsing (EWP = Einwegpfand, EW = Einweg, MW/MEHRWEG = Mehrweg)
    const nameForParsing = item.name.replace(/\b(EWP|EW|MW|MEHRWEG)\b/gi, "").trim();
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(nameForParsing);

    if (!quantity || !unit) {
        // Fallback: use selling unit from price text (e.g. "kg" for weight-sold items)
        quantity = 1;
        unit = item.unit.replace(".", "");
    }

    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            price: item.price,
            priceHistory: [{ date: today, price: item.price }],
            quantity,
            unit,
            bio: item.bio,
            url: item.url,
        },
        {},
        "mila",
        { unit: "stk", quantity: 1 }
    );
};

exports.initializeCategoryMapping = async (rawItems) => {
    const seen = new Set();
    const categories = [];
    for (const item of rawItems) {
        if (!seen.has(item.categoryPath)) {
            seen.add(item.categoryPath);
            const namePart = item.categoryPath.replace(/^\d+_/, "").replace(/__/g, " > ").replace(/_/g, " ");
            categories.push({
                id: item.categoryPath,
                description: namePart,
                url: `${urlBase}/${item.categoryPath}`,
                code: null,
            });
        }
    }
    utils.mergeAndSaveCategories("mila", categories);
    exports.categoryLookup = {};
    for (const cat of categories) {
        exports.categoryLookup[cat.id] = cat;
    }
};

exports.mapCategory = (rawItem) => exports.categoryLookup?.[rawItem.categoryPath]?.code;

const allSpacesRegex = / /g;

exports.stores = {
    billa: {
        name: "Billa",
        budgetBrands: ["clever"],
        color: "yellow",
        getUrl: (item) => `https://shop.billa.at${item.url}`,
    },
    spar: {
        name: "Spar",
        budgetBrands: ["s-budget"],
        color: "green",
        getUrl: (item) => `https://www.interspar.at/shop/lebensmittel${item.url}`,
    },
    hofer: {
        name: "Hofer",
        budgetBrands: ["milfina"],
        color: "purple",
        getUrl: (item) => `https://www.roksh.at/hofer/produkte/${item.url}`,
    },
    lidl: {
        name: "Lidl",
        budgetBrands: ["milbona"],
        color: "pink",
        getUrl: (item) => `https://www.lidl.at${item.url}`,
    },
    mpreis: {
        name: "MPREIS",
        budgetBrands: [],
        color: "rose",
        getUrl: (item) => `https://www.mpreis.at/shop/p/${item.id}`,
    },
    dm: {
        name: "DM",
        budgetBrands: ["balea"],
        color: "orange",
        getUrl: (item) => `https://www.dm.at/product-p${item.id}.html`,
    },
    unimarkt: {
        name: "Unimarkt",
        budgetBrands: ["jeden tag", "unipur"],
        color: "blue",
        getUrl: (item) => `https://shop.unimarkt.at/${item.url}`,
    },
    penny: {
        name: "Penny",
        budgetBrands: ["bravo", "echt bio!", "san fabio", "federike", "blik", "berida", "today", "ich bin österreich"],
        color: "purple",
        getUrl: (item) => `https://www.penny.at/produkte/${item.url}`,
    },
    dmDe: {
        name: "DM DE",
        budgetBrands: ["balea"],
        color: "teal",
        getUrl: (item) => `https://www.dm.de/product-p${item.id}.html`,
    },
    reweDe: {
        name: "REWE DE",
        budgetBrands: ["ja!"],
        color: "stone",
        getUrl: (item) => `https://shop.rewe.de/p/${item.name.toLowerCase().replace(allSpacesRegex, "-")}/${item.id}`,
    },
};

exports.STORE_KEYS = Object.keys(exports.stores);
exports.BUDGET_BRANDS = [...new Set([].concat(...Object.values(exports.stores).map((store) => store.budgetBrands)))];

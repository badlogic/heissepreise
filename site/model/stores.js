const allSpacesRegex = / /g;

exports.stores = {
    billa: {
        name: "Billa",
        budgetBrands: ["clever"],
        color: "yellow",
        defaultChecked: true,
        getUrl: (item) => `https://shop.billa.at/produkte/${item.id}`,
    },
    spar: {
        name: "Spar",
        budgetBrands: ["s-budget"],
        color: "green",
        defaultChecked: true,
        getUrl: (item) => `https://www.interspar.at/shop/lebensmittel/p/${item.id}`,
    },
    hofer: {
        name: "Hofer",
        budgetBrands: ["milfina"],
        color: "purple",
        defaultChecked: true,
        getUrl: (item) => `https://www.roksh.at/hofer/produkte/${item.url}`,
    },
    lidl: {
        name: "Lidl",
        budgetBrands: ["milbona", "alpengut", "cien", "livarno", "wiesentaler"],
        color: "pink",
        defaultChecked: true,
        getUrl: (item) => `https://www.lidl.at${item.url}`,
        removeOld: true,
    },
    mpreis: {
        name: "MPREIS",
        budgetBrands: [],
        color: "rose",
        defaultChecked: true,
        getUrl: (item) => `https://www.mpreis.at/shop/p/${item.id}`,
    },
    dm: {
        name: "DM",
        budgetBrands: ["balea"],
        color: "orange",
        defaultChecked: true,
        getUrl: (item) => `https://www.dm.at/product-p${item.id}.html`,
    },
    mueller: {
        name: "Müller",
        budgetBrands: ["aveo"],
        color: "emerald",
        defaultChecked: true,
        getUrl: (item) => `https://www.mueller.at${item.url}`,
    },
    unimarkt: {
        name: "Unimarkt",
        budgetBrands: ["jeden tag", "unipur"],
        color: "blue",
        defaultChecked: true,
        getUrl: (item) => `https://shop.unimarkt.at/${item.url}`,
    },
    penny: {
        name: "Penny",
        budgetBrands: ["bravo", "echt bio!", "san fabio", "federike", "blik", "berida", "today", "ich bin österreich"],
        color: "purple",
        defaultChecked: true,
        getUrl: (item) => `https://www.penny.at/produkte/${item.url}`,
        removeOld: true,
    },
    reformstark: {
        name: "Reformstark Martin",
        budgetBrands: [],
        color: "green",
        defaultChecked: true,
        getUrl: (item) => `https://www.reformmarkt.com/catalog/product/view/id/${item.id}`,
    },
    dmDe: {
        name: "DM DE",
        budgetBrands: ["balea"],
        color: "teal",
        defaultChecked: false,
        getUrl: (item) => `https://www.dm.de/product-p${item.id}.html`,
    },
    reweDe: {
        name: "REWE DE",
        budgetBrands: ["ja!"],
        color: "stone",
        defaultChecked: false,
        getUrl: (item) => `https://shop.rewe.de/p/${item.name.toLowerCase().replace(allSpacesRegex, "-")}/${item.id}`,
    },
    sparSi: {
        name: "Spar SI",
        budgetBrands: ["s-budget"],
        color: "emerald",
        defaultChecked: false,
        getUrl: (item) => `https://www.spar.si/online/p/${item.id}`,
    },
    muellerDe: {
        name: "Müller DE",
        budgetBrands: ["aveo"],
        color: "stone",
        defaultChecked: false,
        getUrl: (item) => `https://www.muller.de/${item.url}`,
    },
};

exports.STORE_KEYS = Object.keys(exports.stores);
exports.BUDGET_BRANDS = [...new Set([].concat(...Object.values(exports.stores).map((store) => store.budgetBrands)))];

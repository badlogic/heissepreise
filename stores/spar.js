const axios = require("axios");
const utils = require("./utils");
const { UNKNOWN_CATEGORY } = require("../site/model/categories");
const HITS = Math.floor(30000 + Math.random() * 2000);

const units = {
    "100ml": { unit: "ml", factor: 100 },
    "500ml": { unit: "ml", factor: 100 },
    "100g": { unit: "g", factor: 100 },
};

function getCategory(item) {
    if (!item.masterValues["category-path"]) return null;
    const regex = /F(\d+)-(\d+)/g;
    const categoryPath = item.masterValues["category-path"]
        .filter((p) => {
            const match = regex.exec(p);
            if (match == null) return false;
            if (Number.parseInt(match[1]) > 13) return false;
            return true;
        })
        .map((p) => p[0]);
    if (categoryPath.length == 0) return null;
    const sparCategory = categoryPath[0];
    // console.log(sparCategory);
    return UNKNOWN_CATEGORY;
}

exports.getCanonical = function (item, today) {
    let price, unit, quantity;
    if (item.masterValues["quantity-selector"]) {
        const [str_price, str_unit] = item.masterValues["price-per-unit"].split("/");
        price = parseFloat(str_price.replace("€", ""));
    } else {
        price = item.masterValues.price;
    }
    let description = item.masterValues["short-description-3"] ?? item.masterValues["short-description-2"];
    if (!description || description.length == 0) {
        description = (item.masterValues["short-description"] ?? item.masterValues.name).toLowerCase();
        if (description.endsWith("per kg")) [quantity, unit] = [1, "kg"];
        else if (description.endsWith("im topf")) [quantity, unit] = [1, "kg"];
        else [quantity, unit] = [1, "stk."];
    } else {
        const s = description.replace(" EINWEG", "").replace(" MEHRWEG", "").replace("per kg", "1 kg").trim().replace(".", "");
        const q = utils.parseUnitAndQuantityAtEnd(s);
        quantity = q[0];
        unit = q[1];
    }

    let fallback;
    if (item.masterValues["price-per-unit"]) {
        let [unitPrice, unit_] = item.masterValues["price-per-unit"].split("/");
        unitPrice = parseFloat(unitPrice.replace("€", ""));
        fallback = {
            quantity: parseFloat((price / unitPrice).toFixed(3)),
            unit: unit_.toLowerCase(),
        };
    } else {
        // Needed for Dossier data
        fallback = {
            quantity: 1,
            unit: "kg",
        };
    }

    const isWeighted = item.masterValues["item-type"] === "WeightProduct";
    if (isWeighted) {
        unit = fallback.unit;
        quantity = fallback.quantity;
    }

    const category = getCategory(item);

    return utils.convertUnit(
        {
            id: item.masterValues["product-number"],
            name: item.masterValues.title + " " + (item.masterValues["short-description"] ?? item.masterValues.name),
            description: item.masterValues["marketing-text"] ?? "",
            category,
            price,
            priceHistory: [{ date: today, price }],
            unit,
            quantity,
            isWeighted,
            bio: item.masterValues.biolevel === "Bio",
        },
        units,
        "spar",
        fallback
    );
};

exports.fetchData = async function () {
    const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
    const rawItems = (await axios.get(SPAR_SEARCH)).data.hits;
    return rawItems?.hits || rawItems;
};

exports.urlBase = "https://www.interspar.at/shop/lebensmittel";

// Generated in Chrome dev tools at https://www.interspar.at/shop/lebensmittel/ via:
//
// Array.from(document.querySelectorAll(`.flyout-categories__link`)).filter(el => !(el.innerText.toLowerCase().includes("übersicht") || el.innerText.toLowerCase().includes("zurück"))).map(el => {
//    const paths = el.href.split("/");
//    return { category: paths[paths.length - 2], name: el.innerText.trim(), code: "" };
// })
//
const categoryMapping = [
    {
        category: "F1-1",
        name: "Frischgemüse",
        code: "01",
    },
    {
        category: "F1-2",
        name: "Frischobst",
        code: "00",
    },
    {
        category: "F1-3",
        name: "Obst-, Gemüse- & Salat-Zubereitungen",
        code: "01",
    },
    {
        category: "F1-4",
        name: "Saisonartikel",
        code: "01",
    },
    {
        category: "F1-5",
        name: "Obst- & Gemüsekisten",
        code: "00",
    },
    {
        category: "F2",
        name: "KÜHLREGAL",
        code: "",
    },
    {
        category: "F2-1",
        name: "Molkerei & Eier",
        code: "",
    },
    {
        category: "F2-1-1",
        name: "Milch",
        code: "34",
    },
    {
        category: "F2-1-2",
        name: "Milchgetränk",
        code: "34",
    },
    {
        category: "F2-1-3",
        name: "Eiskaffee",
        code: "20",
    },
    {
        category: "F2-1-4",
        name: "Produkte auf Pflanzenbasis",
        code: "5D",
    },
    {
        category: "F2-1-5",
        name: "Rahm, Schlagobers & Topfen",
        code: "34",
    },
    {
        category: "F2-1-7",
        name: "Butter, Margarine & Fette",
        code: "34",
    },
    {
        category: "F2-1-8",
        name: "Eier",
        code: "31",
    },
    {
        category: "F2-2",
        name: "Joghurt & Desserts",
        code: "34",
    },
    {
        category: "F2-3",
        name: "Käse",
        code: "33",
    },
    {
        category: "F2-4",
        name: "Aufstriche & Salate",
        code: "33",
    },
    {
        category: "F2-5",
        name: "Fertiggerichte, Snacks & Teige",
        code: "30",
    },
    {
        category: "F2-6",
        name: "Vegetarisch, Tofu, Soja & Co",
        code: "3B",
    },
    {
        category: "F3-1",
        name: "Wurst & Selchwaren",
        code: "37",
    },
    {
        category: "F3-2",
        name: "Frischfleisch & -Geflügel",
        code: "32",
    },
    {
        category: "F3-3",
        name: "Fisch",
        code: "39",
    },
    {
        category: "F4-1",
        name: "Feinkost & Konserven",
        code: "57",
    },
    {
        category: "F4-2-1",
        name: "Konfitüre",
        code: "56",
    },
    {
        category: "F4-2-2",
        name: "Honig",
        code: "56",
    },
    {
        category: "F4-2-3",
        name: "Nuss- & Schokoaufstriche",
        code: "56",
    },
    {
        category: "F4-2-4",
        name: "Cerealien & Müsli",
        code: "5A",
    },
    {
        category: "F4-3-1",
        name: "Gewürze",
        code: "55",
    },
    {
        category: "F4-3-2",
        name: "Saucen & Würze",
        code: "5C",
    },
    {
        category: "F4-3-3",
        name: "Saucen Süß",
        code: "5C",
    },
    {
        category: "F4-3-4",
        name: "Senf & Kren",
        code: "5C",
    },
    {
        category: "F4-3-5",
        name: "Ketchup & Mayonnaise",
        code: "5C",
    },
    {
        category: "F4-3-6",
        name: "Essig",
        code: "53",
    },
    {
        category: "F4-3-7",
        name: "Öl",
        code: "53",
    },
    {
        category: "F4-3-8",
        name: "Dressing & Croutons",
        code: "5C",
    },
    {
        category: "F4-3-9",
        name: "Zucker",
        code: "5E",
    },
    {
        category: "F4-3-10",
        name: "Salz",
        code: "",
    },
    {
        category: "F4-4-1",
        name: "Teigwaren",
        code: "5B",
    },
    {
        category: "F4-4-2",
        name: "Reis",
        code: "5B",
    },
    {
        category: "F4-4-3",
        name: "Kartoffelprodukte",
        code: "5F",
    },
    {
        category: "F4-4-4",
        name: "Samen & Hülsenfrüchte",
        code: "57",
    },
    {
        category: "F4-4-5",
        name: "Fix- & Basisprodukte",
        code: "5F",
    },
    {
        category: "F4-4-7",
        name: "Saucen & Würze",
        code: "5C",
    },
    {
        category: "F4-4-8",
        name: "Einkochen",
        code: "52",
    },
    {
        category: "F4-4-10",
        name: "Desserts",
        code: "58",
    },
    {
        category: "F4-4-6",
        name: "Suppen & Bouillons",
        code: "54",
    },
    {
        category: "F4-5-1",
        name: "Mehl",
        code: "59",
    },
    {
        category: "F4-5-2",
        name: "Grieß & Co",
        code: "59",
    },
    {
        category: "F4-5-3",
        name: "Getreideprodukte",
        code: "59",
    },
    {
        category: "F4-5-4",
        name: "Backmischungen",
        code: "52",
    },
    {
        category: "F4-5-5",
        name: "Backzutaten & Hilfsmittel",
        code: "52",
    },
    {
        category: "F4-5-6",
        name: "Verfeinerungen",
        code: "52",
    },
    {
        category: "F4-6",
        name: "Trockenfrüchte, Nüsse & Kerne",
        code: "03",
    },
    {
        category: "F4-7",
        name: "Reform & Nahrungsergänzung",
        code: "5D",
    },
    {
        category: "F4-8",
        name: "Asien & Mexiko",
        code: "50",
    },
    {
        category: "F5-1",
        name: "Süßwaren",
        code: "64",
    },
    {
        category: "F5-2",
        name: "Knabbergebäck",
        code: "63",
    },
    {
        category: "F6-1",
        name: "Aufbackware Brot & Gebäck",
        code: "10",
    },
    {
        category: "F6-2",
        name: "Brot",
        code: "11",
    },
    {
        category: "F6-3",
        name: "Gebäck",
        code: "11",
    },
    {
        category: "F6-4",
        name: "Feinbackwaren",
        code: "12",
    },
    {
        category: "F6-5",
        name: "Knäckebrot & Zwieback",
        code: "12",
    },
    {
        category: "F6-6",
        name: "Brösel & Semmelwürfel",
        code: "14",
    },
    {
        category: "F7-1",
        name: "Softdrinks & Säfte",
        code: "20",
    },
    {
        category: "F7-2",
        name: "Mineral- & Tafelwasser",
        code: "26",
    },
    {
        category: "F7-3",
        name: "Kaffee",
        code: "22",
    },
    {
        category: "F7-4",
        name: "Tee",
        code: "22",
    },
    {
        category: "F7-5",
        name: "Kakao",
        code: "22",
    },
    {
        category: "F7-6",
        name: "Bier",
        code: "21",
    },
    {
        category: "F7-7-1",
        name: "Rotwein",
        code: "25",
    },
    {
        category: "F7-7-2",
        name: "Weißwein",
        code: "25",
    },
    {
        category: "F7-7-3",
        name: "Rosewein",
        code: "25",
    },
    {
        category: "F7-7-4",
        name: "Dessertwein, Sherry & Port",
        code: "25",
    },
    {
        category: "F7-7-5",
        name: "Sekt & Champagner",
        code: "23",
    },
    {
        category: "F7-7-6",
        name: "Frizzante & Prosecco",
        code: "23",
    },
    {
        category: "F7-7-7",
        name: "Cider & Fruchtschaumwein",
        code: "25",
    },
    {
        category: "F7-7-8",
        name: "Weinhaltige Getränke",
        code: "25",
    },
    {
        category: "F7-7-9",
        name: "Alkoholfreier Wein & Schaumwein",
        code: "25",
    },
    {
        category: "F7-8",
        name: "Spirituosen",
        code: "24",
    },
    {
        category: "F8-1-1",
        name: "Schwein",
        code: "42",
    },
    {
        category: "F8-1-2",
        name: "Rind & Wild",
        code: "42",
    },
    {
        category: "F8-1-3",
        name: "Gans & Ente",
        code: "42",
    },
    {
        category: "F8-1-4",
        name: "Huhn & Pute",
        code: "42",
    },
    {
        category: "F8-1-5",
        name: "Fisch",
        code: "43",
    },
    {
        category: "F8-1-6",
        name: "Meeresfrüchte",
        code: "43",
    },
    {
        category: "F8-2-1",
        name: "Gemüse",
        code: "44",
    },
    {
        category: "F8-2-2",
        name: "Kräuter & Pilze",
        code: "44",
    },
    {
        category: "F8-2-3",
        name: "Obst",
        code: "47",
    },
    {
        category: "F8-2-4",
        name: "Pommes Frites",
        code: "45",
    },
    {
        category: "F8-2-5",
        name: "Kroketten & Co",
        code: "45",
    },
    {
        category: "F8-3",
        name: "Fertiggerichte & Teige",
        code: "42",
    },
    {
        category: "F8-4-1",
        name: "Baguette",
        code: "46",
    },
    {
        category: "F8-4-2",
        name: "Pizzasnacks",
        code: "46",
    },
    {
        category: "F8-4-3",
        name: "American Style Pizza",
        code: "46",
    },
    {
        category: "F8-4-4",
        name: "Italian Style Pizza",
        code: "46",
    },
    {
        category: "F8-4-5",
        name: "Tiefkühl Gebäck",
        code: "46",
    },
    {
        category: "F8-5-1",
        name: "Süße Knödel",
        code: "47",
    },
    {
        category: "F8-5-2",
        name: "Strudel",
        code: "47",
    },
    {
        category: "F8-5-3",
        name: "Nudeln",
        code: "47",
    },
    {
        category: "F8-5-5",
        name: "Sonstige klassische Mehlspeisen",
        code: "47",
    },
    {
        category: "F8-5-6",
        name: "Torten, Kuchen & Desserts",
        code: "47",
    },
    {
        category: "F8-5-7",
        name: "Eisbecher",
        code: "40",
    },
    {
        category: "F8-5-8",
        name: "Eis am Stiel & Stanitzel",
        code: "40",
    },
    {
        category: "F8-5-10",
        name: "Eis",
        code: "40",
    },
    {
        category: "F9-1",
        name: "Babynahrung & Getränke",
        code: "51",
    },
    {
        category: "F9-1-1",
        name: "Milchfertignahrung",
        code: "51",
    },
    {
        category: "F9-1-2",
        name: "Breie",
        code: "51",
    },
    {
        category: "F9-1-3",
        name: "Menüs",
        code: "51",
    },
    {
        category: "F9-1-4",
        name: "Gemüse & Gemüsemischungen",
        code: "51",
    },
    {
        category: "F9-1-5",
        name: "Früchte, Mischungen & Desserts",
        code: "51",
    },
    {
        category: "F9-1-6",
        name: "Snacks",
        code: "51",
    },
    {
        category: "F9-1-7",
        name: "Getränke",
        code: "51",
    },
    {
        category: "F9-2",
        name: "Flaschen & Sauger",
        code: "70",
    },
    {
        category: "F9-2-2",
        name: "Sauger",
        code: "70",
    },
    {
        category: "F9-3",
        name: "Pflege & Windeln",
        code: "60",
    },
    {
        category: "F10-1-1",
        name: "Hund",
        code: "90",
    },
    {
        category: "F10-1-2",
        name: "Katze",
        code: "91",
    },
    {
        category: "F10-1-3",
        name: "Nager",
        code: "92",
    },
    {
        category: "F10-1-4",
        name: "Vögel",
        code: "93",
    },
    {
        category: "F10-2-1",
        name: "Hund",
        code: "90",
    },
    {
        category: "F10-2-2",
        name: "Katze",
        code: "91",
    },
    {
        category: "F10-3-1",
        name: "Heimtier Heu",
        code: "92",
    },
    {
        category: "F10-3-2",
        name: "Heimtier Streu",
        code: "91",
    },
    {
        category: "F10-3-3",
        name: "Heimtier Sand",
        code: "91",
    },
    {
        category: "F10-3-4",
        name: "Heimtier sonstige Verbrauchsstoffe",
        code: "90",
    },
    {
        category: "F11-1-1",
        name: "Nagellackentferner & -härter",
        code: "75",
    },
    {
        category: "F11-1-2",
        name: "Düfte",
        code: "72",
    },
    {
        category: "F11-2",
        name: "Haare",
        code: "73",
    },
    {
        category: "F11-3",
        name: "Mund & Zahn",
        code: "76",
    },
    {
        category: "F11-4-1",
        name: "Baden & Duschen",
        code: "78",
    },
    {
        category: "F11-4-2",
        name: "Seifen",
        code: "78",
    },
    {
        category: "F11-4-3",
        name: "Händedesinfektion",
        code: "74",
    },
    {
        category: "F11-4-4",
        name: "Deodorants",
        code: "72",
    },
    {
        category: "F11-4-5",
        name: "Hautpflege",
        code: "75",
    },
    {
        category: "F11-4-6",
        name: "Fußpflege & Zubehör",
        code: "7B",
    },
    {
        category: "F11-4-7",
        name: "Rasur & Haarentfernung",
        code: "77",
    },
    {
        category: "F11-4-8",
        name: "Sonnen- & Insektenschutz",
        code: "79",
    },
    {
        category: "F11-5-1",
        name: "Desinfektionsmittel & Gesichtsmasken",
        code: "74",
    },
    {
        category: "F11-5-2",
        name: "Kondome & Gleitmittel",
        code: "7A",
    },
    {
        category: "F11-5-3",
        name: "Wundversorgung",
        code: "74",
    },
    {
        category: "F11-5-4",
        name: "Massage- & Einreibemittel",
        code: "75",
    },
    {
        category: "F12-1",
        name: "Haushaltspapier & Hygiene",
        code: "",
    },
    {
        category: "F12-1-1",
        name: "Taschentücher",
        code: "",
    },
    {
        category: "F12-1-3",
        name: "Watte",
        code: "",
    },
    {
        category: "F12-1-4",
        name: "Damenhygiene",
        code: "",
    },
    {
        category: "F12-1-5",
        name: "Küchenrollen",
        code: "",
    },
    {
        category: "F12-1-6",
        name: "Toilettenpapier",
        code: "",
    },
    {
        category: "F12-1-7",
        name: "Inkontinenz",
        code: "",
    },
    {
        category: "F12-2",
        name: "Putzen & Reinigen",
        code: "",
    },
    {
        category: "F12-2-1",
        name: "Geschirrreiniger",
        code: "",
    },
    {
        category: "F12-2-2",
        name: "Allzweckreiniger",
        code: "",
    },
    {
        category: "F12-2-3",
        name: "WC Reiniger",
        code: "",
    },
    {
        category: "F12-2-4",
        name: "Bodenpflege",
        code: "",
    },
    {
        category: "F12-2-5",
        name: "Glasreiniger",
        code: "",
    },
    {
        category: "F12-2-6",
        name: "Küchenreiniger",
        code: "",
    },
    {
        category: "F12-2-7",
        name: "Metallpflege & Entkalker",
        code: "",
    },
    {
        category: "F12-2-8",
        name: "Badreiniger",
        code: "",
    },
    {
        category: "F12-2-9",
        name: "Hygienereiniger & Desinfektion",
        code: "",
    },
    {
        category: "F12-2-10",
        name: "Abflussreiniger",
        code: "",
    },
    {
        category: "F12-2-11",
        name: "Möbelpflege",
        code: "",
    },
    {
        category: "F12-2-12",
        name: "Schuhpflege",
        code: "",
    },
    {
        category: "F12-2-13",
        name: "Putzutensilien",
        code: "",
    },
    {
        category: "F12-2-14",
        name: "Lufterfrischer",
        code: "",
    },
    {
        category: "F12-3",
        name: "Elektrische Putzgeräte",
        code: "",
    },
    {
        category: "F12-3-1",
        name: "Staubsauger & Reinigungsgeräte",
        code: "",
    },
    {
        category: "F12-3-2",
        name: "Staubbeutel & Zubehör",
        code: "",
    },
    {
        category: "F12-4",
        name: "Waschen, Trocknen & Bügeln",
        code: "",
    },
    {
        category: "F12-4-1",
        name: "Waschmittel",
        code: "",
    },
    {
        category: "F12-4-2",
        name: "Weichspüler",
        code: "",
    },
    {
        category: "F12-4-3",
        name: "Fleckenentferner & Textilfarben",
        code: "",
    },
    {
        category: "F12-4-4",
        name: "Wäschestärke, -desinfektion & Imprägnieren",
        code: "",
    },
    {
        category: "F12-4-5",
        name: "Wasserenthärter",
        code: "",
    },
    {
        category: "F12-4-6",
        name: "Textilerfrischer",
        code: "",
    },
    {
        category: "F12-4-7",
        name: "Waschzubehör",
        code: "",
    },
    {
        category: "F12-4-8",
        name: "Bügeln",
        code: "",
    },
    {
        category: "F12-5",
        name: "Haushaltszubehör",
        code: "",
    },
    {
        category: "F12-5-1",
        name: "Kleiderbügel & Türhaken",
        code: "",
    },
    {
        category: "F12-5-2",
        name: "Putzutensilien",
        code: "",
    },
    {
        category: "F12-5-3",
        name: "Aufbewahrung & Abfalleimer",
        code: "",
    },
    {
        category: "F12-5-4",
        name: "Akkus, Batterien & Ladegeräte",
        code: "",
    },
    {
        category: "F12-5-5",
        name: "Beleuchtung & Taschenlampen",
        code: "",
    },
    {
        category: "F12-5-6",
        name: "Technik & Elektronik",
        code: "",
    },
    {
        category: "F12-5-7",
        name: "Nähen & Kurzware",
        code: "",
    },
    {
        category: "F12-5-8",
        name: "Grillen & Zubehör",
        code: "",
    },
    {
        category: "F12-5-9",
        name: "Pflanzenpflege & Insektenschutz",
        code: "",
    },
    {
        category: "F12-5-10",
        name: "Kerzen, Raumdüfte & Anzündhilfe",
        code: "",
    },
    {
        category: "F12-5-11",
        name: "Papier, Schule & Büro",
        code: "",
    },
    {
        category: "F12-5-12",
        name: "Party- & Festtagsartikel",
        code: "",
    },
    {
        category: "F12-5-13",
        name: "Autopflege",
        code: "",
    },
    {
        category: "F12-6",
        name: "Spielware",
        code: "",
    },
    {
        category: "F12-7",
        name: "Regenschirme",
        code: "",
    },
    {
        category: "F13",
        name: "KÜCHE & TISCH",
        code: "",
    },
    {
        category: "F13-1",
        name: "Kochgeschirr",
        code: "",
    },
    {
        category: "F13-1-1",
        name: "Töpfe & Deckel",
        code: "",
    },
    {
        category: "F13-1-2",
        name: "Pfannen & Deckel",
        code: "",
    },
    {
        category: "F13-1-3",
        name: "Sets & Garnituren",
        code: "",
    },
    {
        category: "F13-1-4",
        name: "Fondue-Sets, Plattengrill, Raclette & Co",
        code: "",
    },
    {
        category: "F13-1-5",
        name: "Bräter & Auflaufformen",
        code: "",
    },
    {
        category: "F13-2",
        name: "Gedeckter Tisch",
        code: "",
    },
    {
        category: "F13-2-1",
        name: "Essbesteck",
        code: "",
    },
    {
        category: "F13-2-2",
        name: "Gläser & Glaswaren",
        code: "",
    },
    {
        category: "F13-2-3",
        name: "Porzellan",
        code: "",
    },
    {
        category: "F13-2-4",
        name: "Servietten",
        code: "",
    },
    {
        category: "F13-2-5",
        name: "Tischdecken & Läufer",
        code: "",
    },
    {
        category: "F13-3",
        name: "Backen",
        code: "",
    },
    {
        category: "F13-3-1",
        name: "Backblech & Formen",
        code: "",
    },
    {
        category: "F13-3-2",
        name: "Backzubehör",
        code: "",
    },
    {
        category: "F13-4",
        name: "Küchenhelfer",
        code: "",
    },
    {
        category: "F13-4-1",
        name: "Rühren",
        code: "",
    },
    {
        category: "F13-4-3",
        name: "Küchenwaagen",
        code: "",
    },
    {
        category: "F13-4-4",
        name: "Messbecher",
        code: "",
    },
    {
        category: "F13-4-5",
        name: "Schälen & Zerteilen",
        code: "",
    },
    {
        category: "F13-4-6",
        name: "Siebe & Trichter",
        code: "",
    },
    {
        category: "F13-4-7",
        name: "Weinzubehör",
        code: "",
    },
    {
        category: "F13-4-8",
        name: "Reiben",
        code: "",
    },
    {
        category: "F13-4-9",
        name: "Bratenwender & Schaumlöffel",
        code: "",
    },
    {
        category: "F13-4-10",
        name: "Suppenkelle & Löffel",
        code: "",
    },
    {
        category: "F13-4-11",
        name: "Sonstige Küchenhelfer",
        code: "",
    },
    {
        category: "F13-4-12",
        name: "Schneidebretter, Untersetzer & Tablett",
        code: "",
    },
    {
        category: "F13-4-13",
        name: "Messer",
        code: "",
    },
    {
        category: "F13-4-14",
        name: "Salz- & Pfeffermühlen",
        code: "",
    },
    {
        category: "F13-4-15",
        name: "Kunststoffgeschirr",
        code: "",
    },
    {
        category: "F13-4-16",
        name: "Einkochen",
        code: "",
    },
    {
        category: "F13-5",
        name: "Folien, Säcke & Filter",
        code: "",
    },
    {
        category: "F13-6",
        name: "Aufbewahrung",
        code: "",
    },
    {
        category: "F13-7",
        name: "Sodaprodukte & Sahneaufbereitung",
        code: "",
    },
    {
        category: "F13-7-1",
        name: "Sodamaker & Sodaprodukte",
        code: "",
    },
    {
        category: "F13-7-2",
        name: "Sahneaufbereitung",
        code: "",
    },
    {
        category: "F13-8",
        name: "Küchenwäsche",
        code: "",
    },
    {
        category: "F13-9",
        name: "Trink- & Isolierflaschen",
        code: "",
    },
    {
        category: "F13-10",
        name: "Wasseraufbereitung",
        code: "",
    },
    {
        category: "F13-11",
        name: "Einweggeschirr & Strohhalme",
        code: "",
    },
    {
        category: "F13-12",
        name: "Party- & Festtagsartikel",
        code: "",
    },
    {
        category: "F13-13",
        name: "Elektrische Küchengeräte",
        code: "",
    },
    {
        category: "F13-13-1",
        name: "Kaffeemaschinen",
        code: "",
    },
    {
        category: "F13-13-2",
        name: "Fondue-Sets, Plattengrill, Raclette & Co",
        code: "",
    },
    {
        category: "F13-13-3",
        name: "Mikrowelle & Kleinküchen",
        code: "",
    },
    {
        category: "F13-13-4",
        name: "Mixer & Küchenmaschinen",
        code: "",
    },
    {
        category: "F13-13-6",
        name: "Wasserkocher",
        code: "",
    },
    {
        category: "F13-13-8",
        name: "Entsafter & Zitruspressen",
        code: "",
    },
    {
        category: "F13-13-9",
        name: "Elektrische Schneidegeräte",
        code: "",
    },
    {
        category: "F13-13-10",
        name: "Toaster",
        code: "",
    },
];

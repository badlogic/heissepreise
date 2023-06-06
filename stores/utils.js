// These are a match of the Billa categories, which are organized in a 2-level hierarchy.
// Each category in the top level gets a code from 1-Z, each sub category also gets a code.
// Together the two codes from a unique id for the category, which we store in the item.category
// field. E.g. "Obst & Gemüse > Salate" has the code "13", "Kühlwaren > Tofu" has the code "4C"
exports.globalCategories = [
    {
        name: "Obst & Gemüse",
        subcategories: ["Obst", "Gemüse", "Salate", "Trockenfrüchte & Nüsse"],
    },
    {
        name: "Brot & Gebäck",
        subcategories: ["Aufbackbrötchen & Toast", "Brot & Gebäck", "Knäckebrot & Zwieback", "Kuchen & Co.", "Semmelwürfel & Brösel"],
    },
    {
        name: "Getränke",
        subcategories: ["Alkoholfreie Getränke", "Bier & Radler", "Kaffee, Tee & Co.", "Sekt & Champagner", "Spirituosen", "Wein", "Mineralwasser"],
    },
    {
        name: "Kühlwaren",
        subcategories: [
            "Schnelle Küche",
            "Eier",
            "Fleisch",
            "Käse, Aufstriche & Salate",
            "Milchprodukte",
            "Feinkostplatten & Brötchen",
            "Blätterteig, Strudelteig",
            "Wurst, Schinken & Speck",
            "Feinkost",
            "Fisch",
            "Unbekannt", // Not available in Billa hierarchy, left blank
            "Tofu",
        ],
    },
    {
        name: "Tiefkühl",
        subcategories: [
            "Eis",
            "Unbekannt", // Not available in Billa hierarchy, left blank
            "Fertiggerichte",
            "Fisch & Garnelen",
            "Gemüse & Kräuter",
            "Pommes Frites & Co.",
            "Pizza & Baguette",
            "Desserts & Früchte",
        ],
    },
    {
        name: "Grundnahrungsmittel",
        subcategories: [
            "Asia & Mexican Produkte",
            "Baby",
            "Backen",
            "Essig & Öl",
            "Fertiggerichte",
            "Gewürze & Würzmittel",
            "Honig, Marmelade & Co.",
            "Konserven & Sauerwaren",
            "Kuchen & Co.",
            "Mehl & Getreideprodukte",
            "Müsli & Cerealien",
            "Reis, Teigwaren & Sugo",
            "Saucen & Dressings",
            "Spezielle Ernährung",
            "Zucker & Süßstoffe",
            "Fixprodukte",
        ],
    },
    {
        name: "Süßes & Salziges",
        subcategories: ["Biskotten & Eiswaffeln", "Für kluge Naschkatzen", "Müsliriegel", "Chips & Co.", "Süßes"],
    },
    {
        name: "Pflege",
        subcategories: [
            "Baby",
            "Damenhygiene",
            "Deodorants",
            "Haarpflege & Haarfarben",
            "Pflaster & Verbandsmaterial",
            "Haut- & Lippenpflege",
            "Mund- & Zahnhygiene",
            "Rasierbedarf",
            "Seife & Duschbäder",
            "Sonnen- & Gelsenschutzmittel",
            "Verhütungsmittel",
            "Fußpflege",
            "Strumpfhosen & Socken",
        ],
    },
    {
        name: "Haushalt",
        subcategories: [
            "Büro- & Schulartikel",
            "Garten",
            "Kleben & Befestigen",
            "Küchenartikel",
            "Küchenrollen & WC-Papier",
            "Lampen & Batterien",
            "Müllsäcke, Gefrierbeutel & Co.",
            "Raumsprays & Kerzen",
            "Reinigen & Pflegen",
            "Taschentücher & Servietten",
            "Waschmittel & Weichspüler",
            "Schuhpflege",
            "Kunststoffbehälter",
            "Insektenschutz",
            "Spielwaren",
            "Hygiene-Schutzartikel",
        ],
    },
    {
        name: "Haustier",
        subcategories: ["Hunde", "Katzen", "Nager", "Vögel"],
    },
];

exports.globalUnits = {
    "stk.": { unit: "stk", factor: 1 },
    blatt: { unit: "stk", factor: 1 },
    paar: { unit: "stk", factor: 1 },
    stk: { unit: "stk", factor: 1 },
    st: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    tücher: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    tabs: { unit: "stk", factor: 1 },
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

exports.convertUnit = function (item, units, store, fallback) {
    if (typeof item.quantity == "string") item.quantity = parseFloat(item.quantity.replace(",", "."));

    let unit = item.unit;
    if (typeof unit === "string") unit = unit.toLowerCase();

    const conv = unit in exports.globalUnits ? exports.globalUnits[unit] : units[unit];
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

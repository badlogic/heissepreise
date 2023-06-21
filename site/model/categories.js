// These are a match of the Billa categories, which are organized in a 2-level hierarchy.
// Each category in the top level gets a code from 1-Z, each sub category also gets a code.
// Together the two codes from a unique id for the category, which we store in the item.category
// field. E.g. "Obst & Gemüse > Salate" has the code "13", "Kühlwaren > Tofu" has the code "4C"
exports.categories = [
    {
        name: "🍌🥑 Obst & Gemüse",
        subcategories: [
            /*00*/ "Obst",
            /*01*/ "Gemüse",
            /*02*/ "Salate",
            /*03*/ "Trockenfrüchte & Nüsse", // I don't know how to make formatting stop.
        ],
    },
    {
        name: "🍞🥐 Brot & Gebäck",
        subcategories: [
            /*10*/ "Aufbackbrötchen & Toast",
            /*11*/ "Brot & Gebäck",
            /*12*/ "Knäckebrot & Zwieback",
            /*13*/ "Kuchen & Co.",
            /*14*/ "Semmelwürfel & Brösel", // I don't know how to make formatting stop.
        ],
    },
    {
        name: "🥤🍺 Getränke",
        subcategories: [
            /*20*/ "Alkoholfreie Getränke",
            /*21*/ "Bier & Radler",
            /*22*/ "Kaffee, Tee & Co.",
            /*23*/ "Sekt & Champagner",
            /*24*/ "Spirituosen",
            /*25*/ "Wein",
            /*26*/ "Mineralwasser", // I don't know how to make formatting stop.
        ],
    },
    {
        name: "🥚🥛🥩 Kühlwaren",
        subcategories: [
            /*30*/ "Schnelle Küche",
            /*31*/ "Eier",
            /*32*/ "Fleisch",
            /*33*/ "Käse, Aufstriche & Salate",
            /*34*/ "Milchprodukte",
            /*35*/ "Feinkostplatten & Brötchen",
            /*36*/ "Blätterteig, Strudelteig",
            /*37*/ "Wurst, Schinken & Speck",
            /*38*/ "Feinkost",
            /*39*/ "Fisch",
            /*3A*/ "Unbekannt", // Not available in Billa hierarchy, left blank
            /*3B*/ "Vegetarisch, Tofu, Soja & Co",
        ],
    },
    {
        name: "🧊🍦 Tiefkühl",
        subcategories: [
            /*40*/ "Eis",
            /*41*/ "Unbekannt", // Not available in Billa hierarchy, left blank
            /*42*/ "Fertiggerichte",
            /*43*/ "Fisch & Garnelen",
            /*44*/ "Gemüse & Kräuter",
            /*45*/ "Pommes Frites & Co.",
            /*46*/ "Pizza & Baguette",
            /*47*/ "Desserts & Früchte",
        ],
    },
    {
        name: "🌾 Grundnahrungsmittel",
        subcategories: [
            /*50*/ "Asia & Mexican Produkte",
            /*51*/ "Baby",
            /*52*/ "Backen",
            /*53*/ "Essig & Öl",
            /*54*/ "Fertiggerichte",
            /*55*/ "Gewürze & Würzmittel",
            /*56*/ "Honig, Marmelade & Co.",
            /*57*/ "Konserven & Sauerwaren",
            /*58*/ "Kuchen & Co.",
            /*59*/ "Mehl & Getreideprodukte",
            /*5A*/ "Müsli & Cerealien",
            /*5B*/ "Reis, Teigwaren & Sugo",
            /*5C*/ "Saucen & Dressings",
            /*5D*/ "Spezielle Ernährung",
            /*5E*/ "Zucker & Süßstoffe",
            /*5F*/ "Fixprodukte",
        ],
    },
    {
        name: "🍫🍿 Süßes & Salziges",
        subcategories: [
            /*60*/ "Biskotten & Eiswaffeln",
            /*61*/ "Für kluge Naschkatzen",
            /*62*/ "Müsliriegel",
            /*63*/ "Chips & Co.",
            /*64*/ "Süßes", // I don't know how to make formatting stop.
        ],
    },
    {
        name: "👄👶 Pflege",
        subcategories: [
            /*70*/ "Baby",
            /*71*/ "Damenhygiene",
            /*72*/ "Deodorants",
            /*73*/ "Haarpflege & Haarfarben",
            /*74*/ "Pflaster & Verbandsmaterial",
            /*75*/ "Haut- & Lippenpflege",
            /*76*/ "Mund- & Zahnhygiene",
            /*77*/ "Rasierbedarf",
            /*78*/ "Seife & Duschbäder",
            /*79*/ "Sonnen- & Gelsenschutzmittel",
            /*7A*/ "Verhütungsmittel",
            /*7B*/ "Fußpflege",
            /*7C*/ "Strumpfhosen & Socken",
        ],
    },
    {
        name: "🧹🧺 Haushalt",
        subcategories: [
            /*80*/ "Büro- & Schulartikel",
            /*81*/ "Garten",
            /*82*/ "Kleben & Befestigen",
            /*83*/ "Küchenartikel",
            /*84*/ "Küchenrollen & WC-Papier",
            /*85*/ "Lampen & Batterien",
            /*86*/ "Müllsäcke, Gefrierbeutel & Co.",
            /*87*/ "Raumsprays & Kerzen",
            /*88*/ "Reinigen & Pflegen",
            /*89*/ "Taschentücher & Servietten",
            /*8A*/ "Waschmittel & Weichspüler",
            /*8B*/ "Schuhpflege",
            /*8C*/ "Kunststoffbehälter",
            /*8D*/ "Insektenschutz",
            /*8E*/ "Spielwaren",
            /*8F*/ "Hygiene-Schutzartikel",
        ],
    },
    {
        name: "🐶🐱 Haustier",
        subcategories: [
            /*90*/ "Hunde",
            /*91*/ "Katzen",
            /*92*/ "Nager",
            /*93*/ "Vögel", // I don't know how to make formatting stop.
        ],
    },
    {
        name: "Unbekannt",
        subcategories: [/*A0*/ "Unbekannt"],
    },
];

exports.categories.forEach((category, index) => (category.index = index));

exports.toCategoryCode = (i, j) => {
    return (
        (i < 10 ? "" + i : String.fromCharCode("A".charCodeAt(0) + (i - 10))) + (j < 10 ? "" + j : String.fromCharCode("A".charCodeAt(0) + (j - 10)))
    );
};

exports.fromCategoryCode = (code) => {
    if (!code || code.length != 2) return [exports.categories.length - 1, 0];
    const codeI = code.charCodeAt(0);
    const codeJ = code.charCodeAt(1);
    return [
        codeI - (codeI < "A".charCodeAt(0) ? "0".charCodeAt(0) : "A".charCodeAt(0) - 10),
        codeJ - (codeJ < "A".charCodeAt(0) ? "0".charCodeAt(0) : "A".charCodeAt(0) - 10),
    ];
};

exports.isValidCode = (code) => {
    const [i, j] = exports.fromCategoryCode(code);
    if (i < 0 || i >= exports.categories.length) return false;
    const category = exports.categories[i];
    if (j < 0 || j >= exports.categories.subcategories) return false;
    return true;
};

exports.getCategory = (code) => {
    const [i, j] = exports.fromCategoryCode(code);
    return [exports.categories[i], exports.categories[i].subcategories[j]];
};

exports.UNKNOWN_CATEGORY = exports.toCategoryCode(exports.categories.length - 1, 0);

if (require.main === module) {
    const code = exports.toCategoryCode(10, 1);
    console.log(code);
    const [i, j] = exports.fromCategoryCode("A1");
    console.log(i + ", " + j);
    console.log(exports.isValidCode("F1"));
    console.log(exports.isValidCode("11"));
    console.log(exports.getCategory("A1"));
}

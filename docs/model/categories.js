// These are a match of the Billa categories, which are organized in a 2-level hierarchy.
// Each category in the top level gets a code from 1-Z, each sub category also gets a code.
// Together the two codes from a unique id for the category, which we store in the item.category
// field. E.g. "Obst & Gemüse > Salate" has the code "13", "Kühlwaren > Tofu" has the code "4C"
exports.categories = [
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

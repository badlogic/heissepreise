const fs = require("fs");
const analysis = require("./analysis");
const knn = require("./site/js/knn");

if (!fs.existsSync("patterns")) fs.mkdirSync("patterns");

if (!fs.existsSync("patterns/sorted-billa-spar.json")) {
    const items = analysis.readJSON("data/latest-canonical.json.br");
    const billaSparItem = items
        .filter((item) => item.store == "billa" || item.store == "spar")
        .filter((item) => {
            return !(
                item.name.includes("Clever") ||
                item.name.includes("S-BUDGET") ||
                item.name.includes("Ja! Natürlich") ||
                item.name.includes("SPAR") ||
                item.name.includes("BILLA")
            );
        });
    knn.vectorizeItems(billaSparItem);
    const billaItems = billaSparItem.filter((item) => item.store == "billa");
    const sparItems = billaSparItem.filter((item) => item.store == "spar");

    console.log(billaItems.length + " " + sparItems.length);
    const sortedItems = [];

    sparItems.forEach((item) => (item.sorted = false));
    const total = billaItems.length;
    while (billaItems.length > 0) {
        const refItem = billaItems.shift();
        const similar = knn.findMostSimilarItem(refItem, sparItems);
        if (similar.item != null) {
            sortedItems.push(refItem);
            sortedItems.push(similar.item);
        } else {
            console.log("No similar item found for " + refItem.name);
        }
        if (sortedItems.length % 100 == 0) console.log(sortedItems.length / 2 + "/" + total);
    }
    analysis.writeJSON("patterns/sorted-billa-spar.json", sortedItems);
}

const sortedItems = analysis.readJSON("patterns/sorted-billa-spar.json");
const filteredItems = [];
let result = "";
for (let i = 0; i < sortedItems.length; i += 2) {
    const a = sortedItems[i];
    const b = sortedItems[i + 1];
    const similarity = knn.dotProduct(a.vector, b.vector);
    result += "billa " + a.name + "\n";
    result += "spar  " + b.name + " " + similarity.toFixed(5) + "\n\n";

    if (b.priceHistory.some((price) => price.price == a.price) && a.quantity == b.quantity) {
        filteredItems.push(a);
        filteredItems.push(b);
    }
}
console.log("Sorted: " + sortedItems.length);
analysis.writeJSON("patterns/sorted-billa-spar-cart.json", { name: "Billa Spar Sortiert", items: sortedItems });
console.log("Filtered: " + filteredItems.length);
analysis.writeJSON("patterns/sorted-billa-spar-filtered-cart.json", { name: "Billa Spar Sortiert Gefiltert", items: filteredItems });
analysis.writeJSON("site/data/billa-spar-cart.json", {
    name: "Markenprodukte Billa/Spar",
    items: filteredItems.map((item) => {
        return { store: item.store, id: item.id };
    }),
});
fs.writeFileSync("patterns/sorted-billa-spar.txt", result, "utf-8");

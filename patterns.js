const fs = require("fs");
const analysis = require("./analysis");
const knn = require("./site/js/knn");

function similaritySort(items, filter, filterA, filterB) {
    const filteredItems = items.filter(filter);
    knn.vectorizeItems(filteredItems);
    const itemsA = filteredItems.filter(filterA);
    const itemsB = filteredItems.filter(filterB);
    const sortedItems = [];

    itemsB.forEach((item) => (item.sorted = false));
    const total = itemsA.length;
    while (itemsA.length > 0) {
        const refItem = itemsA.shift();
        const similar = knn.findMostSimilarItem(refItem, itemsB);
        if (similar.item != null) {
            sortedItems.push(refItem);
            sortedItems.push(similar.item);
        } else {
            console.log("No similar item found for " + refItem.name);
        }
        if (sortedItems.length % 100 == 0) console.log(sortedItems.length / 2 + "/" + total);
    }
    return sortedItems;
}

function filterSimilarItems(items) {
    const filteredItems = [];
    for (let i = 0; i < items.length; i += 2) {
        const a = items[i];
        const b = items[i + 1];
        if (b.priceHistory.some((price) => price.price == a.price) && a.quantity == b.quantity) {
            filteredItems.push(a);
            filteredItems.push(b);
        }
    }
    return filteredItems;
}

if (!fs.existsSync("patterns")) fs.mkdirSync("patterns");

if (!fs.existsSync("patterns/sorted-billa-spar.json")) {
    const items = analysis.readJSON("data/latest-canonical.json.br");
    const sortedItems = similaritySort(
        items,
        (item) => {
            if (!(item.store == "billa" || item.store == "spar")) return false;
            return !["Clever", "S-BUDGET", "Ja! Natürlich", "SPAR", "BILLA"].some((str) => item.name.includes(str));
        },
        (item) => item.store === "billa",
        (item) => item.store === "spar"
    );
    analysis.writeJSON("patterns/sorted-billa-spar.json", sortedItems);
}

{
    const sortedItems = analysis.readJSON("patterns/sorted-billa-spar.json");
    const filteredItems = filterSimilarItems(sortedItems);
    analysis.writeJSON("site/data/billa-spar-cart.json", {
        name: "Markenprodukte Billa/Spar",
        items: filteredItems.map((item) => {
            return { store: item.store, id: item.id };
        }),
    });
}

if (!fs.existsSync("patterns/sorted-budget.json")) {
    const items = analysis.readJSON("data/latest-canonical.json.br");
    const sortedItems = similaritySort(
        items,
        (item) => {
            if (!(item.store == "billa" || item.store == "spar")) return false;
            return ["Clever", "S-BUDGET"].some((str) => item.name.includes(str));
        },
        (item) => item.store === "billa",
        (item) => item.store === "spar"
    );
    analysis.writeJSON("patterns/sorted-budget.json", sortedItems);
}

{
    const sortedItems = analysis.readJSON("patterns/sorted-budget.json");
    const filteredItems = filterSimilarItems(sortedItems);
    analysis.writeJSON("site/data/budget-cart.json", {
        name: "Diskont-Marken Produkte Billa/Spar",
        items: filteredItems.map((item) => {
            return { store: item.store, id: item.id };
        }),
    });
}

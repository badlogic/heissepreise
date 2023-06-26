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
    console.log("Sorting 3rd party brands Billa/Spar");
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

if (!fs.existsSync("site/data/billa-spar-cart.json")) {
    console.log("Creating cart 3rd party brands Billa/Spar");
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
    console.log("Sorting budget brands Billa/Spar");
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

if (!fs.existsSync("site/data/budget-cart.json")) {
    console.log("Creating cart budget brands Billa/Spar");
    const sortedItems = analysis.readJSON("patterns/sorted-budget.json");
    const filteredItems = filterSimilarItems(sortedItems);
    analysis.writeJSON("site/data/budget-cart.json", {
        name: "Diskont-Marken Produkte Billa/Spar",
        items: filteredItems.map((item) => {
            return { store: item.store, id: item.id };
        }),
    });
}

if (!fs.existsSync("patterns/sorted-bio.json")) {
    console.log("Sorting bio brands Billa/Spar");
    const items = analysis.readJSON("data/latest-canonical.json.br");
    const sortedItems = similaritySort(
        items,
        (item) => {
            if (!(item.store == "billa" || item.store == "spar")) return false;
            return ["Ja! Natürlich", "SPAR Natur*pur"].some((str) => item.name.includes(str));
        },
        (item) => item.store === "billa",
        (item) => item.store === "spar"
    );
    analysis.writeJSON("patterns/sorted-bio.json", sortedItems);
}

if (!fs.existsSync("site/data/bio-cart.json")) {
    console.log("Sorting bio brands Billa/Spar");
    const sortedItems = analysis.readJSON("patterns/sorted-bio.json");
    const filteredItems = filterSimilarItems(sortedItems);
    analysis.writeJSON("site/data/bio-cart.json", {
        name: "Bio Eigenmarken Produkte Billa/Spar",
        items: filteredItems.map((item) => {
            return { store: item.store, id: item.id };
        }),
    });
}

if (!fs.existsSync("patterns/sorted-midrange.json")) {
    console.log("Sorting mid-range brands Billa/Spar");
    const items = analysis.readJSON("data/latest-canonical.json.br");
    const sortedItems = similaritySort(
        items,
        (item) => {
            if (!(item.store == "billa" || item.store == "spar")) return false;
            return (
                ["BILLA", "SPAR"].some((str) => item.name.includes(str)) &&
                !["Ja! Natürlich", "SPAR Natur*pur"].some((str) => item.name.includes(str))
            );
        },
        (item) => item.store === "billa",
        (item) => item.store === "spar"
    );
    analysis.writeJSON("patterns/sorted-midrange.json", sortedItems);
}

if (!fs.existsSync("site/data/midrange-cart.json")) {
    console.log("Creating cart mid-range brands Billa/Spar");
    const sortedItems = analysis.readJSON("patterns/sorted-midrange.json");
    const filteredItems = filterSimilarItems(sortedItems);
    analysis.writeJSON("site/data/midrange-cart.json", {
        name: "Mittelpreisige Eigenmarken Produkte Billa/Spar",
        items: filteredItems.map((item) => {
            return { store: item.store, id: item.id };
        }),
    });
}

const canonicalItems = analysis.readJSON("data/latest-canonical.json.br");
const lookup = {};
canonicalItems.forEach((item) => (lookup[item.store + item.id] = item));
const files = fs.readdirSync("site/data/");
for (const file of files) {
    if (file.endsWith("-cart.json")) {
        const cart = analysis.readJSON("site/data/" + file);
        const items = cart.items;
        if (items.length % 2 != 0) {
            console.log("Uneven number of items in cart " + file);
            // throw Error();
        }

        for (let i = 1; i < items.length; i++) {
            if (items[i].store == items[i - 1].store) {
                console.log("--- " + items[i - 1].store + " " + items[i - 1].id + " " + items[i].store + " " + items[i].id);
            }
        }

        let samePrice = 0;
        let samePriceItems = [];
        let otherItems = [];
        for (let i = 0; i < items.length; i += 2) {
            let a = items[i].priceHistory ? items[i] : lookup[items[i].store + items[i].id];
            let b = items[i + 1].priceHistory ? items[i + 1] : lookup[items[i + 1].store + items[i + 1].id];
            if (!a || !b) {
                console.log("Couldn't find item for product pair");
                throw Error();
            }
            if (a.store == b.store) {
                console.log("Subsequent items from same store. " + a.store + " " + a.id + " " + b.store + " " + b.id);
                // throw Error();
            }
            if (a.price == b.price) {
                samePrice++;
                samePriceItems.push(a);
                samePriceItems.push(b);
            } else {
                otherItems.push(a);
                otherItems.push(b);
            }
        }
        cart.items = [];
        cart.items.push(...samePriceItems);
        cart.items.push(...otherItems);
        // analysis.writeJSON("site/data/" + file, cart);
        console.log(`${file}: ${samePrice}/${items.length / 2} product pairs have the same price.`);
    }
}

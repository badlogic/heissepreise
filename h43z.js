const fs = require("fs");
const analysis = require("./analysis");
const Database = require("better-sqlite3");

exports.importH43zData = (sqliteFile, outputFile) => {
    const db = new Database(sqliteFile, { verbose: console.log });
    let items = [];
    const lookup = {};

    let stmt = db.prepare("select * from product");
    for (const row of stmt.iterate()) {
        const item = {
            store: row.shop == "billa" ? "billa" : "spar",
            id: row.product_id,
            name: row.name,
            price: 0,
            priceHistory: [],
            isWeighted: false,
            unit: "g",
            quantity: 0,
            bio: false,
            url: "",
        };
        items.push(item);
        lookup[row.product_id] = item;
    }
    console.log(items.length + " products");

    stmt = db.prepare("select * from pricehistory order by date asc");
    let i = 0;
    let unknown = 0;
    for (const row of stmt.iterate()) {
        i++;
        const item = lookup[row.product_id];
        if (!item) {
            unknown++;
        } else {
            if (item.priceHistory.length == 0 || item.priceHistory[item.priceHistory.length - 1].price != row.price)
                item.priceHistory.push({ date: row.date, price: row.price });
        }
        if (i % 1000 == 0) {
            console.log("Processed " + i + " prices, " + unknown + " unknown");
        }
    }

    items = items.filter((item) => item.priceHistory.length > 0);
    items.forEach((item) => {
        item.priceHistory.reverse();
        item.price = item.priceHistory[0];
    });
    analysis.writeJSON(outputFile, items);
};

exports.mergeWithLatestCanonical = (h43zFile, latestCanonicalFile) => {
    const items = analysis.readJSON(h43zFile);
    const lookup = {};
    items.forEach((item) => {
        // item.priceHistory = item.priceHistory.filter(price => price.date > "2020-01-01")
        lookup[item.id] = item;
    });
    const currItems = analysis.readJSON(latestCanonicalFile + "." + analysis.FILE_COMPRESSOR);
    const currLookup = {};
    currItems.forEach((item) => (currLookup[item.store + item.id] = item));
    let missingItems = {
        spar: 0,
        billa: 0,
    };
    let foundItems = {
        spar: 0,
        billa: 0,
    };
    for (item of items) {
        const i = lookup[item.id];
        const currItem = currLookup[item.store + item.id];
        if (!currItem) {
            missingItems[item.store]++;
        } else {
            foundItems[item.store]++;
            const oldHistory = [...currItem.priceHistory];
            currItem.priceHistory.push(...item.priceHistory);
            currItem.priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

            const mergedHistory = [];
            currItem.priceHistory.forEach((price) => {
                if (mergedHistory.length == 0) {
                    mergedHistory.push(price);
                    return;
                }
                if (mergedHistory[mergedHistory.length - 1].price != price.price) {
                    mergedHistory.push(price);
                }
            });
            mergedHistory.reverse();
            currItem.priceHistory = mergedHistory;
        }
    }
    console.log(JSON.stringify(missingItems, null, 2));
    console.log(JSON.stringify(foundItems, null, 2));
    analysis.writeJSON(latestCanonicalFile, currItems, analysis.FILE_COMPRESSOR);
};

if (require.main === module) {
    exports.importH43zData("/Users/badlogic/Downloads/shops.db", "h43z.json");
    exports.mergeWithLatestCanonical("h43z.json", "data/latest-canonical.json");
}

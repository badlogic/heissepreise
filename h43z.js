const fs = require("fs");
const analysis = require("./analysis");
const Database = require("better-sqlite3");
const db = new Database("/Users/badlogic/Downloads/shops.db", { verbose: console.log });
let items = [];
const lookup = {};

if (!fs.existsSync("h43z.json")) {
    let stmt = db.prepare("select * from product");
    for (const row of stmt.iterate()) {
        const item = {
            store: row.store == "billa" ? "billa" : "spar",
            id: row.product_id,
            sparId: row.sparId,
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

    stmt = db.prepare("select * from pricehistory order by date desc");
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
        item.price = item.priceHistory[0];
    });
    analysis.writeJSON("h43z.json", items);
}

items = analysis.readJSON("h43z.json");
analysis.writeJSON("h43z.compressed.json", items, false, 0, true);

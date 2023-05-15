const fs = require("fs")
const axios = require("axios")

const HITS = 30000;
const SPAR_SEARCH = `https://search-spar.spar-ics.com/fact-finder/rest/v4/search/products_lmos_at?query=*&q=*&page=1&hitsPerPage=${HITS}`;
const BILLA_SEARCH = `https://shop.billa.at/api/search/full?searchTerm=*&storeId=00-10&pageSize=${HITS}`;

function currentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function updateData() {
    const today = currentDate();

    console.log("Fetching data for " + today);

    const sparItems = (await axios.get(SPAR_SEARCH)).data.hits;
    fs.writeFileSync(`data/spar-${today}.json`, JSON.stringify(sparItems, null, 2));
    const sparItemsCanonical = [];
    for (let i = 0; i < sparItems.length; i++) {
        const item = sparItems[i];
        sparItemsCanonical.push({
            store: "spar",
            name: item.masterValues.title + " " + item.masterValues["short-description"],
            price: item.masterValues.price,
            priceHistory: [{date: today, price: item.masterValues.price}],
            unit: item.masterValues["short-description-3"]            
        });
    }
    fs.writeFileSync(`data/spar-${today}-canonical.json`, JSON.stringify(sparItemsCanonical, null, 2));

    const billaItems = (await axios.get(BILLA_SEARCH)).data.tiles;
    fs.writeFileSync(`data/billa-${today}.json`, JSON.stringify(billaItems, null, 2));
    const billaItemsCanonical = [];
    for (let i = 0; i < billaItems.length; i++) {
        const item = billaItems[i];
        billaItemsCanonical.push({
            store: "billa",
            name: item.data.name,
            price: item.data.price.final,
            priceHistory: [{date: today, price: item.data.price.final}],
            unit: item.data.grammage        
        });
    }
    fs.writeFileSync(`data/billa-${today}-canonical.json`, JSON.stringify(billaItemsCanonical, null, 2));

    const allItems = [...billaItemsCanonical, ...sparItemsCanonical];
    if (fs.existsSync("data/latest-canonical.json")) {
        const oldItems = JSON.parse(fs.readFileSync("data/latest-canonical.json"));    
        const lookup = {}
        for (oldItem of oldItems) {
            lookup[oldItem.name] = oldItem;
        }

        for (item of allItems) {
            let oldItem = lookup[item.name];
            let currPrice = item.priceHistory[0];
            if (oldItem) {
                for (oldPrice of oldItem.priceHistory) {
                    if (oldPrice.date != currPrice.date)
                        item.priceHistory.push(oldPrice);
                }
            }
        }
    }

    fs.writeFileSync(`data/latest-canonical.json`,  JSON.stringify(allItems, null, 2));

    console.log("Updated data");
    items = allItems;
}

let items = null;

(async () => {
    await updateData();    
    setInterval(updateData, 1000 * 60 * 60 * 24);
    
    const express = require('express')
    const compression = require('compression');
    const app = express()
    const port = 3000
    
    app.use(compression());
    
    app.get('/api/index', (req, res) => {
      res.send(items)
    })
    
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    })
})();
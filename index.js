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
    console.log("Fetching data");

    const sparItems = (await axios.get(SPAR_SEARCH)).data.hits;
    fs.writeFileSync(`data/spar-${currentDate()}.json`, JSON.stringify(sparItems, null, 2));
    const sparItemsCanonical = [];
    for (let i = 0; i < sparItems.length; i++) {
        const item = sparItems[i];
        sparItemsCanonical.push({
            store: "spar",
            name: item.masterValues.title + " " + item.masterValues["short-description"],
            price: item.masterValues.price,
            unit: item.masterValues["short-description-3"]            
        });
    }
    fs.writeFileSync(`data/spar-${currentDate()}-canonical.json`, JSON.stringify(sparItemsCanonical, null, 2));

    const billaItems = (await axios.get(BILLA_SEARCH)).data.tiles;
    fs.writeFileSync(`data/billa-${currentDate()}.json`, JSON.stringify(billaItems, null, 2));
    const billaItemsCanonical = [];
    for (let i = 0; i < billaItems.length; i++) {
        const item = billaItems[i];
        billaItemsCanonical.push({
            store: "billa",
            name: item.data.name,
            price: item.data.price.final,
            unit: item.data.grammage        
        });
    }
    fs.writeFileSync(`data/billa-${currentDate()}-canonical.json`, JSON.stringify(billaItemsCanonical, null, 2));

    fs.writeFileSync(`data/latest-canonical.json`, JSON.stringify([...billaItemsCanonical, ...sparItemsCanonical], null, 2));

    console.log("Updated data");
}

let items = JSON.parse(fs.readFileSync("data/latest-canonical.json"));
// updateData()

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
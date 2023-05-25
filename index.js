const fs = require("fs");
const analysis = require("./analysis");

let items = [];
let itemsJson = "";
(async () => {
  const dataDir = 'data';

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir)
  }

  if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
    items = JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`));
    itemsJson = JSON.stringify(items)
    analysis.updateData(dataDir, (newItems) => {
      items = newItems;
      itemsJson = JSON.stringify(items)
    });
  } else {
    items = await analysis.updateData(dataDir)
    itemsJson = JSON.stringify(items)
  }
  setInterval(async () => {
    items = await analysis.updateData(dataDir)
  }, 1000 * 60 * 60 * 24);

  const express = require('express')
  const compression = require('compression');
  const app = express()
  const port = process?.argv?.[2] ?? 3000

  app.use(express.static('site'));
  app.use(compression());

  app.get('/api/index', (req, res) => {
    res.send(itemsJson)
  })

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})();
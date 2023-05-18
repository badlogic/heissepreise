const fs = require("fs");
const analysis = require("./analysis");

let items = [];
(async () => {
  if (fs.existsSync("data/latest-canonical.json")) {
    items = JSON.parse(fs.readFileSync("data/latest-canonical.json"));
    analysis.updateData("data", (newItems => items = newItems));
  } else {
    items = await analysis.updateData("data");
  }
  setInterval(async () => { items = await analysis.updateData("data") }, 1000 * 60 * 60 * 24);

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
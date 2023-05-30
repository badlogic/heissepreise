const fs = require("fs");
const analysis = require("./analysis");

function copyItemsToSite(dataDir) {
  fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
  const items = JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`));
  const compressedItems = analysis.compress(items);
  fs.writeFileSync(`site/latest-canonical-compressed.json`, JSON.stringify(compressedItems));
}

(async () => {
  const dataDir = 'data';

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir)
  }

  if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
    copyItemsToSite(dataDir);
    analysis.updateData(dataDir, (_newItems) => {
      copyItemsToSite(dataDir);
    });
  } else {
    await analysis.updateData(dataDir)
    copyItemsToSite(dataDir);
  }
  setInterval(async () => {
    items = await analysis.updateData(dataDir)
    copyItemsToSite(dataDir);
  }, 1000 * 60 * 60 * 24);

  const express = require('express')
  const compression = require('compression');
  const app = express()
  const port = process?.argv?.[2] ?? 3000

  app.use(compression());
  app.use(express.static('site'));

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})();
const fs = require("fs");
const analysis = require("./analysis");

(async () => {
  const dataDir = 'data';

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir)
  }
  if (!fs.existsSync("site/api")) {
    fs.mkdirSync("site/api");
  }

  if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
    analysis.updateData(dataDir, (newItems) => {
      fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
    });
  } else {
    await analysis.updateData(dataDir)
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
  }
  setInterval(async () => {
    items = await analysis.updateData(dataDir)
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
  }, 1000 * 60 * 60 * 24);

  const express = require('express')
  const compression = require('compression');
  const app = express()
  const port = process?.argv?.[2] ?? 3000

  app.use(express.static('site'));
  app.use(compression());

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})();
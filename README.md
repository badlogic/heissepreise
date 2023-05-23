# Heisse Preise
A terrible grocery price search "app". Fetches data from big Austrian grocery chains daily and lets you search them. See https://heisse-preise.io.

You can also get the [raw data](https://heisse-preise.io/api/index). The raw data is returned as a JSON array of items. An item has the following fields:

* `store`: either `billa` or `spar`.
* `name`: the product name.
* `price`: the current price in €.
* `priceHistory`: an array of `{ date: "yyyy-mm-dd", price: number }` objects, sorted in descending order of date.
* `unit`: unit the product is sold at. May be undefined.

To run this terrible project locally, you'll need to install [Docker](https://www.docker.com/).

The project consists of a trivial NodeJS Express server responsible for fetching the product data, massaging it, and serving it to the front end (see `index.js`). The front end is a least-effort vanilla HTML/JS search form (see sources in `site/`).

For development, run `docker/control.sh startdev`. You can connect to both the NodeJS server and the client for debugging in Visual Studio code via the `client-server` launch configuration (found in `.vscode/launch.json`).

For production, run `docker/control.sh start`.

## Self-contained executable
If you just want to run an instance of this app without Docker, run `package.sh` in a Bash shell, with NodeJS installed. It will generate a folder `dist/` with executable for Windows, Linux, and MacOS. Run the executable for your OS. On first start, it will fetch the initial data. Once loaded, you can open http://localhost:3000 to use the app. Subsequent starts will fetch the data in the background, so the web app is available instantaniously.
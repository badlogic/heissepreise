# Heisse Preise
A terrible grocery price search "app". Fetches data from big Austrian grocery chains daily and lets you search them. See https://heisse-preise.io.

You can also get the [raw data](https://heisse-preise.io/api/index). The raw data is returned as a JSON array of items. An item has the following fields:

* `store`: either `billa` or `spar`.
* `name`: the product name.
* `price`: the current price in €.
* `priceHistory`: an array of `{ date: "yyyy-mm-dd", price: number }` objects, sorted in descending order of date.
* `unit`: unit the product is sold at. May be undefined.

To run this terrible project locally, you'll need to install [Docker](https://www.docker.com/).

For development, run `docker/control.sh startdev`. You can connect to both the NodeJS server and the client for debugging in Visual Studio code via the `client-server` launch configuration (found in `.vscode/launch.json`).

For production, run `docker/control.sh start`.
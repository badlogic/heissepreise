# Heisse Preise
A terrible grocery price search "app". Fetches data from big Austrian grocery chains daily and lets you search them. See https://heisse-preise.io.

You can also get the [raw data](https://heisse-preise.io/api/index). The raw data is returned as a JSON array of items. An item has the following fields:

* `store`: (`billa`, `spar`, `hofer`, `dm`, `lidl`, `mpreis`)
* `name`: the product name.
* `price`: the current price in €.
* `priceHistory`: an array of `{ date: "yyyy-mm-dd", price: number }` objects, sorted in descending order of date.
* `unit`: unit the product is sold at. May be undefined.
* `bio`: whether this product is classified as organic/"Bio"

The project consists of a trivial NodeJS Express server responsible for fetching the product data, massaging it, and serving it to the front end (see `index.js`). The front end is a least-effort vanilla HTML/JS search form (see sources in `site/`).

## Run via NodeJS
Install NodeJS, then run this in a shell of your choice.

```
git clone https://github.com/badlogic/heissepreise
cd heissepreise
npm install
node index.js
```

The first time you run this, the data needs to be fetched from the stores. You should see log out put like this.

```
Fetching data for date: 2023-05-23
Fetched SPAR data, took 17.865891209602356 seconds
Fetched BILLA data, took 52.95784649944306 seconds
Fetched HOFER data, took 64.83968291568756 seconds
Fetched DM data, took 438.77065160000324 seconds
Fetched LIDL data, took 0.77065160000324 seconds
Fetched MPREIS data, took 13.822936070203781 seconds
Merged price history
Example app listening on port 3000
```

Once the app is listening per default on port 3000, open http://localhost:3000 in your browser.\
**Note**: If you want to start on a different port add it as the third parameter, e.g. `node index.js 3001` will map to port `3001`.

Subsequent starts will fetch the data asynchronously, so you can start working immediately.

## Docker
The project has a somewhat peculiar Docker Compose setup tailored to my infrastructure. All compose config files are in `docker/` including a simple Bash script to start and interact with the containers. This is the setup I use for both development and deployment.

For development, run `docker/control.sh startdev`. You can connect to both the NodeJS server and the client for debugging in Visual Studio code via the `client-server` launch configuration (found in `.vscode/launch.json`).

For production, run `docker/control.sh start`.

## Generating a self-contained executable
 Run the `package.sh`script in a Bash shell. It will generate a folder `dist/` with executable for Windows, Linux, and MacOS. Run the executable for your OS.
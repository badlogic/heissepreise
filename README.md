# Heisse Preise

A terrible grocery price search "app". Fetches data from big Austrian grocery chains daily and lets you search them. See <https://heisse-preise.io>.

You can also get the [raw data](https://heisse-preise.io/api/index). The raw data is returned as a JSON array of items. An item has the following fields:

-   `store`: (`billa`, `spar`, `hofer`, `dm`, `lidl`, `mpreis`)
-   `name`: the product name.
-   `price`: the current price in €.
-   `priceHistory`: an array of `{ date: "yyyy-mm-dd", price: number }` objects, sorted in descending order of date.
-   `unit`: unit the product is sold at. May be undefined.
-   `quantity`: quantity the product is sold at for the given price
-   `bio`: whether this product is classified as organic/"Bio"

The project consists of a trivial NodeJS Express server responsible for fetching the product data, massaging it, and serving it to the front end (see `index.js`). The front end is a least-effort vanilla HTML/JS search form (see sources in `site/`).

## Run via NodeJS

Install NodeJS, then run this in a shell of your choice.

```bash
git clone https://github.com/badlogic/heissepreise
cd heissepreise
npm install
node index.js
```

The first time you run this, the data needs to be fetched from the stores. You should see log out put like this.

```bash
Fetching data for date: 2023-05-23
Fetched LIDL data, took 0.77065160000324 seconds
Fetched MPREIS data, took 13.822936070203781 seconds
Fetched SPAR data, took 17.865891209602356 seconds
Fetched BILLA data, took 52.95784649944306 seconds
Fetched HOFER data, took 64.83968291568756 seconds
Fetched DM data, took 438.77065160000324 seconds
Merged price history
Example app listening on port 3000
```

Once the app is listening per default on port 3000, open <http://localhost:3000> in your browser.\
**Note**: If you want to start on a different port add it as the third parameter, e.g. `node index.js 3001` will map to port `3001`.

Subsequent starts will fetch the data asynchronously, so you can start working immediately.

## Run via GitHub pages & GitHub workflows

Create a GitHub account and pick a username. Below, we assume your user name is `hotprices123`. **Replace `hotprices123` with your real username everywhere you see it below**

1. Log in to your GitHub account.
2. [Fork](https://github.com/badlogic/heissepreise/fork) this repository and name the repository `hotprices123.github.io`.
3. **In your forked repository**:
    1. go to `Settings > Pages`, then under `Branch` select the `main` branch, and the `docs/` directory as shown in this screenshot.
       ![site/img/github-pages.png](site/img/github-pages.png)
    2. go to `Settings > Actions > General`, then under `Workflow permissions`, select `Read and write permissions` as shown in this screenshot.
       ![site/img/github-permissions.png](site/img/github-permissions.png)
    3. go to the `Actions` tab, then select the `Pages Update` workflow in the list to the left, then click `Enable workflow`. Confirm that you know what you are doing.
       ![site/img/github-workflow.png](site/img/github-workflow.png)
4. Trigger the workflow once manually to build the initial site and data.
   ![site/img/github-workflow2.png](site/img/github-workflow2.png)
5. Once the workflow has finished, go to `https:/hotprices123.github.io` and enjoy your price comparisons.

The data will be automatically fetched once a day at 8am (no idea what timezone), and the site will be updated.

To get the latest code changes from this repository into your fork:

1. Go to `https://github.com/hotprices123/hotprices123.github.io/compare/main...badlogic:heissepreise:main`
2. Click on `Create pull request`
   ![site/img/github-pullrequest.png](site/img/github-pullrequest.png)
3. Enter a Title like "Updated from upstream", then click `Create pull request``
   ![site/img/github-pullrequest2.png](site/img/github-pullrequest2.png)
4. Click `Merge pull request`
   ![site/img/github-pullrequest3.png](site/img/github-pullrequest3.png)

Your site will now use the latest source code changes from this repository. It will be automatically updated and is usually live under `https://hotprices123.github.io` within 10-15 minutes.

## Docker

The project has a somewhat peculiar Docker Compose setup in `docker/` tailored to my infrastructure. You can entirely ignore it.

let items = null;

async function load() {
    let response = await fetch("api/index")
    items = await response.json();

    newSearchComponent(document.querySelector("#search"), items);
}

load();

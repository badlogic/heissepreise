async function load() {
    const items = await loadItems();
    newSearchComponent(document.querySelector("#search"), items);
}

load();

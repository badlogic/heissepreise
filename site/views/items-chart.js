const { STORE_KEYS } = require("../model/stores");
const { settings } = require("../model");
const { today, log, deltaTime } = require("../js/misc");
const { View } = require("./view");
require("./custom-checkbox");
const moment = require("moment");
const { Chart, registerables } = require("chart.js");
require("chartjs-adapter-moment");
Chart.register(...registerables);

class ItemsChart extends View {
    constructor() {
        super();

        this.innerHTML = /*html*/ `
            <div class="bg-stone-200 p-4 mx-auto">
                <div class="w-full  h-[calc(100vw*0.66)] md:h-[calc(100vw*0.5)] lg:h-[calc(100vw*0.30)]" style="position: relative;">
                    <canvas x-id="canvas" class="bg-white rounded-lg py-4"></canvas>
                    <div x-id="noData" class="hidden flex items-center justify-center h-full">Keine Daten ausgewählt</div>
                </div>
                <div class="filters flex items-center flex-wrap justify-center gap-2 pt-2">
                    <custom-checkbox x-id="sumTotal" x-change x-state label="Preissumme Gesamt"></custom-checkbox>
                    <custom-checkbox x-id="sumStores" x-change x-state label="Preissumme Ketten"></custom-checkbox>
                    <custom-checkbox x-id="onlyToday" x-change x-state label="Nur heutige Preise"></custom-checkbox>
                    <div
                        class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                        <input x-id="startDate" x-change x-state type="date" value="2017-01-01" />
                        -
                        <input x-id="endDate" x-change x-state type="date" value="${today()}"/>
                    </div>
                </div>
            </div>
        `;
        this.elements.startDate.value = settings.startDate;
        this.setupEventHandlers();
        this.addEventListener("x-change", () => {
            this.render();
        });
    }

    calculateOverallPriceChanges(items, onlyToday, startDate, endDate) {
        if (items.length == 0) return { dates: [], changes: [] };

        if (onlyToday) {
            let sum = 0;
            for (const item of items) sum += item.price;
            return [{ date: today(), price: sum }];
        }

        const allDates = items.flatMap((product) =>
            product.priceHistory.filter((price) => price.date >= startDate && price.date <= endDate).map((item) => item.date)
        );
        let uniqueDates = [...new Set(allDates)];
        uniqueDates.sort();

        let priceChanges = new Array(uniqueDates.length);
        for (let i = 0; i < uniqueDates.length; i++) {
            priceChanges[i] = { date: uniqueDates[i], price: 0 };
        }
        const priceScratch = new Array(uniqueDates.length);
        items.forEach((product) => {
            let price = null;
            priceScratch.fill(null);
            if (!product.priceHistoryLookup) {
                product.priceHistoryLookup = {};
                product.priceHistory.forEach((price) => (product.priceHistoryLookup[price.date] = price));
            }
            for (let i = 0; i < uniqueDates.length; i++) {
                const priceObj = product.priceHistoryLookup[uniqueDates[i]];
                if (!price && priceObj) price = priceObj.price;
                priceScratch[i] = priceObj ? priceObj.price : null;
            }

            for (let i = 0; i < priceScratch.length; i++) {
                if (!priceScratch[i]) {
                    priceScratch[i] = price;
                } else {
                    price = priceScratch[i];
                }
            }

            for (let i = 0; i < priceScratch.length; i++) {
                const price = priceScratch[i];
                priceChanges[i].price += price;
            }
        });

        priceChanges = priceChanges.filter((price) => price.date >= startDate && price.date <= endDate);
        return priceChanges;
    }

    renderChart(items, chartType) {
        const canvasDom = this.elements.canvas;
        const noData = this.elements.noData;
        if (items.length === 0) {
            canvasDom.classList.add("hidden");
            noData.classList.remove("hidden");
            return;
        } else {
            canvasDom.classList.remove("hidden");
            noData.classList.add("hidden");
        }

        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;

        const now = performance.now();
        const datasets = items.map((item) => {
            const prices = item.priceHistory.filter((price) => price.date >= startDate && price.date <= endDate);

            const dataset = {
                label: (item.store ? item.store + " " : "") + item.name,
                data: prices.map((price) => {
                    return {
                        x: moment(price.date),
                        y: price.price,
                    };
                }),
            };
            if (settings.chartType == "stepped") {
                dataset.stepped = "after";
            }

            return dataset;
        });
        log("ItemsChart - Calculating datasets took " + ((performance.now() - now) / 1000).toFixed(2) + " secs");

        const ctx = canvasDom.getContext("2d");
        let scrollTop = -1;
        if (canvasDom.lastChart) {
            scrollTop = document.documentElement.scrollTop;
            canvasDom.lastChart.destroy();
        }
        canvasDom.lastChart = new Chart(ctx, {
            type: chartType ? chartType : "line",
            data: {
                datasets: datasets,
            },
            options: {
                layout: {
                    padding: 20,
                },
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: "time",
                        adapters: {
                            date: moment,
                        },
                        time: {
                            unit: "day",
                            displayFormats: {
                                day: "YYYY-MM-D",
                            },
                        },
                        title: {
                            display: true,
                            text: "Date",
                        },
                    },
                    y: {
                        ticks: {
                            callback: function (value, index, ticks) {
                                return value.toLocaleString("de-DE", {
                                    minimumFractionDigits: 2,
                                    style: "currency",
                                    currency: "EUR",
                                });
                            },
                        },
                    },
                },
            },
        });
        if (scrollTop != -1) document.documentElement.scrollTop = scrollTop;
    }

    render() {
        if (!this.model) return;
        const start = performance.now();
        const items = this.model.filteredItems;
        const elements = this.elements;
        const onlyToday = this.elements.onlyToday.checked;
        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        const itemsToShow = [];

        if (elements.sumTotal.checked && items.length > 0) {
            const now = performance.now();
            itemsToShow.push({
                name: "Preissumme Gesamt",
                priceHistory: this.calculateOverallPriceChanges(items, onlyToday, startDate, endDate),
            });
            log("ItemsChart - Calculating overall sum total " + ((performance.now() - now) / 1000).toFixed(2) + " secs");
        }

        if (elements.sumStores.checked && items.length > 0) {
            const now = performance.now();
            STORE_KEYS.forEach((store) => {
                const storeItems = items.filter((item) => item.store === store);
                if (storeItems.length > 0) {
                    itemsToShow.push({
                        name: "Preissumme " + store,
                        priceHistory: this.calculateOverallPriceChanges(storeItems, onlyToday, startDate, endDate),
                    });
                }
            });
            log("ItemsChart - Calculating overall sum per store took " + ((performance.now() - now) / 1000).toFixed(2) + " secs");
        }

        items.forEach((item) => {
            if (item.chart) {
                const chartItem = {
                    name: item.store + " " + item.name,
                    priceHistory: onlyToday ? [{ date: today(), price: item.price }] : item.priceHistory,
                };
                itemsToShow.push(chartItem);
            }
        });

        this.renderChart(itemsToShow, onlyToday ? "bar" : "line");
        log(`ItemsChart - charted ${itemsToShow.length} items in ${deltaTime(start).toFixed(2)} secs`);
    }
}
customElements.define("items-chart", ItemsChart);

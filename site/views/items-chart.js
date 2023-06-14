const { STORE_KEYS } = require("../model/stores");
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
                <canvas x-id="canvas" class="bg-white rounded-lg py-4"></canvas>
                <div class="filters flex items-center flex-wrap justify-center gap-2 pt-2">
                    <custom-checkbox x-id="sumTotal" x-change x-state label="Preissumme Gesamt"></custom-checkbox>
                    <custom-checkbox x-id="sumStores" x-change x-state label="Preissumme Ketten"></custom-checkbox>
                    <custom-checkbox x-id="onlyToday" x-change x-state label="Nur heutige Preise"></custom-checkbox>
                    <div
                        class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                        <input x-id="startDate" x-change x-state type="date" value="2020-01-01" />
                        -
                        <input x-id="endDate" x-change x-state type="date" value="${today()}"/>
                    </div>
                </div>
            </div>
        `;
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

        const allDates = items.flatMap((product) => product.priceHistory.map((item) => item.date));
        let uniqueDates = [...new Set(allDates)];
        uniqueDates.sort();

        const allPrices = items.map((product) => {
            let price = null;
            const prices = uniqueDates.map((date) => {
                const priceObj = product.priceHistory.find((item) => item.date === date);
                if (!price && priceObj) price = priceObj.price;
                return priceObj ? priceObj.price : null;
            });

            for (let i = 0; i < prices.length; i++) {
                if (!prices[i]) {
                    prices[i] = price;
                } else {
                    price = prices[i];
                }
            }
            return prices;
        });

        const priceChanges = [];
        for (let i = 0; i < uniqueDates.length; i++) {
            if (uniqueDates[i] < startDate || uniqueDates[i] > endDate) continue;
            let price = 0;
            for (let j = 0; j < allPrices.length; j++) {
                price += allPrices[j][i];
            }
            priceChanges.push({ date: uniqueDates[i], price });
        }

        return priceChanges;
    }

    renderChart(items, chartType) {
        const canvasDom = this.elements.canvas;
        if (items.length === 0) {
            canvasDom.classList.add("hidden");
            return;
        } else {
            canvasDom.classList.remove("hidden");
        }

        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        const allDates = items.flatMap((item) =>
            item.priceHistory.filter((price) => price.date >= startDate && price.date <= endDate).map((price) => price.date)
        );
        const uniqueDates = [...new Set(allDates)];
        uniqueDates.sort();

        const datasets = items.map((item) => {
            let price = null;
            const prices = uniqueDates.map((date) => {
                const priceObj = item.priceHistory.find((item) => item.date === date);
                if (!price && priceObj) price = priceObj;
                return priceObj;
            });

            const firstIndex = item.priceHistory.indexOf(price);

            for (let i = 0; i < prices.length; i++) {
                if (prices[i] == null) {
                    if (i == 0) {
                        if (firstIndex < item.priceHistory.length - 1) {
                            price = item.priceHistory[firstIndex + 1];
                            prices[i] = price;
                        }
                    } else {
                        prices[i] = price;
                    }
                } else {
                    price = prices[i];
                }
            }

            const dedupPrices = [];
            prices.forEach((price, index) => {
                if (price == null) return;
                if (dedupPrices.length == 0) {
                    dedupPrices.push({ price: price.price, date: uniqueDates[index] });
                } else {
                    const lastPrice = dedupPrices[dedupPrices.length - 1];
                    if (lastPrice.date == price.date && lastPrice.price == price.price) return;
                    dedupPrices.push({ price: price.price, date: uniqueDates[index] });
                }
            });

            const dataset = {
                label: (item.store ? item.store + " " : "") + item.name,
                data: dedupPrices.map((price, index) => {
                    return {
                        x: moment(price.date),
                        y: price.price,
                    };
                }),
                // stepped: "before"
            };

            const data = dataset.data;
            for (let i = 0; i < data.length; i++) {}

            return dataset;
        });

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
                responsive: true,
                aspectRation: 16 / 9,
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
                        title: {
                            display: true,
                            text: "EURO",
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
            itemsToShow.push({
                name: "Preissumme Gesamt",
                priceHistory: this.calculateOverallPriceChanges(items, onlyToday, startDate, endDate),
            });
        }

        if (elements.sumStores.checked && items.length > 0) {
            STORE_KEYS.forEach((store) => {
                const storeItems = items.filter((item) => item.store === store);
                if (storeItems.length > 0) {
                    itemsToShow.push({
                        name: "Preissumme " + store,
                        priceHistory: this.calculateOverallPriceChanges(storeItems, onlyToday, startDate, endDate),
                    });
                }
            });
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

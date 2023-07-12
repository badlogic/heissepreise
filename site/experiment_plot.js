const model = require("./model");

(async () => {
    await model.load();

    const filtered = model.items._items
        .filter((e) => e.priceHistory.length > 1)
        .filter((e) => e.price < 5)
        .sort((a, b) => b.priceHistory.length - a.priceHistory.length)
        .slice(0, 80);

    console.log(filtered);

    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 30, bottom: 50, left: 240 },
        width = 1060 - margin.left - margin.right,
        height = 3000 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3
        .select("#charts")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3
        .nest() // nest function allows to group the calculation per level of a factor
        .key(function (d) {
            return d.name;
        })
        .rollup(function (d) {
            q1 = d3.quantile(
                d[0].priceHistory
                    .map(function (g) {
                        return g.price;
                    })
                    .sort(d3.ascending),
                0.25
            );
            median = d3.quantile(
                d[0].priceHistory
                    .map(function (g) {
                        return g.price;
                    })
                    .sort(d3.ascending),
                0.5
            );
            q3 = d3.quantile(
                d[0].priceHistory
                    .map(function (g) {
                        return g.price;
                    })
                    .sort(d3.ascending),
                0.75
            );
            interQuantileRange = q3 - q1;
            min = q1 - 1.5 * interQuantileRange;
            max = q3 + 1.5 * interQuantileRange;
            return { q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max };
        })
        .entries(filtered);
    console.log(sumstat);

    var y = d3
        .scaleBand()
        .range([height, 0])
        .domain(filtered.map((e) => e.name))
        .padding(0.4);
    svg.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

    // Show the X scale
    var x = d3
        .scaleLinear()
        .domain(
            d3.extent(filtered, function (d) {
                return d.price;
            })
        )
        .range([100, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(5))
        .select(".domain")
        .remove();

    // Add X axis label:
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + margin.top + 30)
        .text("Price");

    // Show the main vertical line
    svg.selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function (d) {
            return x(d.value.min);
        })
        .attr("x2", function (d) {
            return x(d.value.max);
        })
        .attr("y1", function (d) {
            return y(d.key) + y.bandwidth() / 2;
        })
        .attr("y2", function (d) {
            return y(d.key) + y.bandwidth() / 2;
        })
        .attr("stroke", "black")
        .style("width", 40);

    // rectangle for the main box
    svg.selectAll("boxes")
        .data(sumstat)
        .enter()
        .append("rect")
        .attr("x", function (d) {
            return x(d.value.q1);
        }) // console.log(x(d.value.q1)) ;
        .attr("width", function (d) {
            return x(d.value.q3) - x(d.value.q1);
        }) //console.log(x(d.value.q3)-x(d.value.q1))
        .attr("y", function (d) {
            return y(d.key);
        })
        .attr("height", y.bandwidth())
        .attr("stroke", "black")
        .style("fill", "#69b3a2")
        .style("opacity", 0.3);

    // Show the median
    svg.selectAll("medianLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("y1", function (d) {
            return y(d.key);
        })
        .attr("y2", function (d) {
            return y(d.key) + y.bandwidth() / 2;
        })
        .attr("x1", function (d) {
            return x(d.value.median);
        })
        .attr("x2", function (d) {
            return x(d.value.median);
        })
        .attr("stroke", "black")
        .style("width", 80);

    // create a tooltip
    var tooltip = d3.select("#charts").append("div").attr("class", "tooltip");
    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
            .html(`${d.name} <strong>€ ${d.price}</strong> (${d.date ? d.date : "derzeit"})`)
            .style("left", d3.mouse(this)[0] + 15 + "px")
            .style("top", d3.mouse(this)[1] + 15 + "px");
    };
    var mousemove = function (d) {
        tooltip.style("left", d3.mouse(this)[0] + 30 + "px").style("top", d3.mouse(this)[1] + 30 + "px");
    };
    var mouseleave = function (d) {
        tooltip.transition().duration(200).style("opacity", 0);
    };

    // Add individual points with jitter
    var individualPoints = filtered.reduce(
        (previous, current) => [
            ...previous,
            ...current.priceHistory.map((e) => ({
                name: current.name,
                price: e.price,
                date: e.date,
                color: "rgba(255,255,255,0.5)",
            })),
            {
                name: current.name,
                price: current.price,
                color: "black",
            },
        ],
        []
    );
    var jitterWidth = 20;
    svg.selectAll("indPoints")
        .data(individualPoints)
        .enter()
        .append("circle")
        .attr("cx", function (d) {
            return x(d.price);
        })
        .attr("cy", function (d) {
            return y(d.name) + y.bandwidth() / 2 - jitterWidth / 2 + Math.random() * jitterWidth;
        })
        .attr("r", 3)
        .style("fill", function (d) {
            return d.color;
        })
        .attr("stroke", "black")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);
})();

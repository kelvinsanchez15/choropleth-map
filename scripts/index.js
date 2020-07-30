// Fetch jsons
const countiesJson =
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json";

const educationJson =
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json";

const promises = [d3.json(countiesJson), d3.json(educationJson)];

// SVG layout setup
const width = 965;
const height = 610;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };

const svg = d3
  .select("#choropleth-map")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

Promise.all(promises).then(([topology, education]) => {
  // Taking the geojson logic from @joelopresti https://github.com/joelopresti/d3-choropleth-map
  const geojson = topojson.feature(topology, topology.objects.counties);
  // Loop over geojson and education data and append education data to id's that match the education FIPS id.
  geojson.features.forEach((geo) => {
    education.forEach((data) => {
      if (data.fips === geo.id) {
        geo.education = data.bachelorsOrHigher;
      }
    });
  });

  const eMin = d3.min(education, (d) => d.bachelorsOrHigher);
  const eMax = d3.max(education, (d) => d.bachelorsOrHigher);

  const xScale = d3.scaleLinear().domain([eMin, eMax]).rangeRound([0, 200]);

  const colorScale = d3
    .scaleThreshold()
    .domain(d3.range(eMin, eMax, (eMax - eMin) / 8))
    .range(d3.schemePurples[9]);

  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(13)
    .tickFormat((d, i) => (i === 0 ? `${Math.round(d)}%` : Math.round(d)))
    .tickValues(colorScale.domain());

  const customXAxis = (g) => {
    g.call(xAxis);
    g.select(".domain").remove();
  };

  const path = d3.geoPath();

  svg
    .append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("data-fips", (d) => d.id)
    .attr("data-education", (d) => d.education)
    .attr("fill", (d) => colorScale(d.education))
    .attr("d", path)
    .on("mouseover", (d) => tooltipMouseOver(d))
    .on("mouseout", (d) => tooltipMouseOut(d));

  svg
    .append("path")
    .datum(topojson.mesh(topology, topology.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "#23242c")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  // Interaction logic
  const tooltip = d3
    .select("#choropleth-map")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  const tooltipMouseOver = (d) => {
    tooltip.transition().duration(200).style("opacity", 0.9);

    tooltip
      .html(`${d.education}`)
      .attr("data-education", d.education)
      .style("left", d3.event.pageX + 20 + "px")
      .style("top", d3.event.pageY + 20 + "px");
  };

  const tooltipMouseOut = () =>
    tooltip.transition().duration(200).style("opacity", 0);

  // Legend logic
  const legend = svg
    .append("g")
    .attr("id", "legend")
    .attr("transform", `translate(520, 550)`);

  legend
    .selectAll("rect")
    .data(
      colorScale.range().map((d) => {
        d = colorScale.invertExtent(d);
        if (!d[0]) [d[0]] = xScale.domain();
        if (!d[1]) [, d[1]] = xScale.domain();
        return d;
      })
    )
    .enter()
    .append("rect")
    .attr("height", 10)
    .attr("width", (d) => xScale(d[1]) - xScale(d[0]))
    .attr("x", (d) => xScale(d[0]))
    .attr("fill", (d) => colorScale(d[0]));

  legend.append("g").attr("id", "x-axis").call(customXAxis);
});

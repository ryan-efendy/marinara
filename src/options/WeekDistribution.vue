<template>
  <div></div>
</template>

<script>
import * as d3 from 'd3';
import { shortDays, days } from '../LocaleFormat';
import M from '../Messages';
import { pomodoroCount } from '../Filters';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { differenceInCalendarDays, eachDayOfInterval, startOfDay } from 'date-fns';

function countDays(startDate, currentDate) {
  const dayCounts = Array(7).fill(0);
  const interval = { start: startDate, end: currentDate };
  const days = eachDayOfInterval(interval);

  days.forEach(day => {
    dayCounts[day.getDay()]++;
  });

  return dayCounts;
}

function calculateProportionalCounts(dayCounts, buckets) {
  return dayCounts.map((count, i) => buckets[i] / count);
}

function createWeekDistribution(el, data) {
  let buckets = {};
  for (const key in data) {
    let day = new Date(+key).getDay();
    if (!(day in buckets)) {
      buckets[day] = 0;
    }
    buckets[day] += data[+key];
  }

  const startDate = new Date(2023, 0, 1);
  const currentDate = startOfDay(new Date());
  const dayCounts = countDays(startDate, currentDate);

  const proportionalCounts = calculateProportionalCounts(dayCounts, buckets);
  const maxProportional = Math.max(...proportionalCounts);

  const width = 600;
  const height = 150;
  const pad = 30;

  // Clear chart.
  d3.select(el).html(null);

  let svg = d3.select(el)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'distribution');

  let x = d3.scaleBand().domain(d3.range(0, 7)).rangeRound([0, width - pad]).padding(0.5);
  let y = d3.scaleLinear().domain([0, maxProportional]).range([height - 30, 0]);

  let xAxis = d3.axisBottom(x)
    .tickSize(5)
    .tickFormat(t => shortDays[t]);

  let step = Math.max(maxProportional / 4, 1);
  let yAxis = d3.axisLeft(y)
    .tickSize(3)
    .tickValues(d3.range(0, maxProportional + step, step))
    .tickFormat(t => Math.floor(t));

  svg.append('g')
    .attr('transform', `translate(${pad},${height - 20})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${pad},10)`)
    .call(yAxis);

    svg.append('g')
    .attr('transform', `translate(${pad},10)`)
    .selectAll('rect')
    .data(Object.keys(buckets))
    .enter()
    .append('rect')
      .datum(d => +d)
      .attr('data-tippy-content', d => {
        return M.weekly_tooltip(`<strong>${pomodoroCount(proportionalCounts[d])}</strong>`, days[d]);
      })
      .attr('x', d => x(d))
      .attr('y', d => y(proportionalCounts[d])) // Use proportionalCounts instead of buckets
      .attr('width', x.bandwidth())
      .attr('height', d => (height - 30) - y(proportionalCounts[d])); // Use proportionalCounts instead of buckets


  let tooltips = tippy(el.querySelectorAll('rect'), {
    arrow: true,
    duration: 0,
    animation: null
  });

  return function cleanup() {
    tooltips.destroyAll();
  };
}

export default {
  props: ['pomodoros'],
  data() {
    return {
      cleanup: null
    };
  },
  mounted() {
    this.updateGraph();
  },
  methods: {
    updateGraph() {
      if (this.cleanup) {
        this.cleanup();
      }
      this.cleanup = createWeekDistribution(this.$el, this.pomodoros);
    }
  },
  watch: {
    bucketSize() {
      this.updateGraph();
    },
    pomodoros() {
      this.updateGraph();
    }
  }
};
</script>
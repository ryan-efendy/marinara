<template>
  <div></div>
</template>

<script>
import * as d3 from 'd3';
import { shortMonths, months } from '../LocaleFormat';
import M from '../Messages';
import { pomodoroCount } from '../Filters';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { eachMonthOfInterval, lastDayOfMonth, startOfDay } from 'date-fns';

function countDaysPerMonth(startDate, currentDate) {
  const monthCounts = Array(12).fill(0);
  const interval = { start: startDate, end: currentDate };
  const months = eachMonthOfInterval(interval);

  months.forEach(month => {
    if (month.getMonth() === currentDate.getMonth() && month.getFullYear() === currentDate.getFullYear()) {
      monthCounts[month.getMonth()] = currentDate.getDate();
    } else {
      const daysInMonth = lastDayOfMonth(month).getDate();
      monthCounts[month.getMonth()] = daysInMonth;
    }
  });

  return monthCounts;
}

function calculateProportionalCounts(monthCounts, buckets) {
  return monthCounts.map((count, i) => buckets[i] / count);
}

function createMonthDistribution(el, data) {
  let buckets = {};
  for (const key in data) {
    let month = new Date(+key).getMonth();
    if (!(month in buckets)) {
      buckets[month] = 0;
    }
    buckets[month] += data[+key];
  }

  debugger;

  const startDate = new Date(2023, 0, 1);
  const currentDate = startOfDay(new Date());
  const monthCounts = countDaysPerMonth(startDate, currentDate);
  const proportionalCounts = calculateProportionalCounts(monthCounts, buckets).filter(value => !isNaN(value));
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

  let x = d3.scaleBand().domain(d3.range(0, 12)).rangeRound([0, width - pad]).padding(0.5);
  let y = d3.scaleLinear().domain([0, maxProportional]).range([height - 30, 0]);

  let xAxis = d3.axisBottom(x)
    .tickSize(5)
    .tickFormat(t => shortMonths[t]);

  let step = Math.max(maxProportional / 4, 1);
  let yAxis = d3.axisLeft(y)
    .tickSize(3)
    .tickValues(d3.range(0, maxProportional + step, step))
    .tickFormat(t => Math.floor(t));

  svg.append('g')
    .attr('transform', `translate(${pad}, ${height - 20})`)
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
        return M.weekly_tooltip(`<strong>${pomodoroCount(proportionalCounts[d])}</strong>`, months[d]);
      })
      .attr('x', d => x(d))
      .attr('y', d => y(proportionalCounts[d]))
      .attr('width', x.bandwidth())
      .attr('height', d => (height - 30) - y(proportionalCounts[d]));

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
      this.cleanup = createMonthDistribution(this.$el, this.pomodoros);
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
<template>
  <div v-if="stats" class="history">
    <div id="sparkline"></div>
    <div class="stats">
      <div class="stat">
        <div>
          <div class="value" v-bind:style="{ color: (stats.day >= 12) ? 'green' : 'black' }" style="display: contents;">{{ stats.day | integer }}</div>
          <div class="value" style="display: contents;color: darkgrey;">/12</div>
        </div>
        <div class="bucket">{{ M.today }}</div>
        <div class="average">{{ stats.dayAverage | float(2) | average_stat }}</div>
      </div>
      <div class="stat">
        <div>
          <div class="value" v-bind:style="{ color: (stats.day >= 65) ? 'green' : 'black' }" style="display: contents;">{{ stats.week | integer }}</div>
          <div class="value" style="display: contents;color: darkgrey;">/65</div>
        </div>
        <div class="bucket">{{ M.this_week }}</div>
        <div class="average">{{ stats.weekAverage | float(2) | average_stat }}</div>
      </div>
      <div class="stat">
        <div class="value">{{ stats.month | integer }}</div>
        <div class="bucket">{{ new Date() | strftime('%B') | in_month }}</div>
        <div class="average">{{ stats.monthAverage | float(2) | average_stat }}</div>
      </div>
      <div class="stat">
        <div class="value">{{ stats.total | integer }}</div>
        <div class="bucket">{{ M.total }}</div>
      </div>
    </div>
    <!-- <section class="day-distribution chart">
      <div class="title">
        <h2>{{ M.daily_distribution }}</h2>
        <div v-if="stats.total > 0" class="options" key="actions">
          <input type="radio" id="day-15" name="day-distribution" v-model.number="dayDistributionBucketSize" value="15">
          <label for="day-15">{{ M.min_suffix(15) }}</label>
          <input type="radio" id="day-30" name="day-distribution" v-model.number="dayDistributionBucketSize" value="30">
          <label for="day-30">{{ M.min_suffix(30) }}</label>
          <input type="radio" id="day-60" name="day-distribution" v-model.number="dayDistributionBucketSize" value="60">
          <label for="day-60">{{ M.hr_suffix(1) }}</label>
          <input type="radio" id="day-120" name="day-distribution" v-model.number="dayDistributionBucketSize" value="120">
          <label for="day-120">{{ M.hr_suffix(2) }}</label>
        </div>
      </div>
      <DayDistribution v-if="stats.total > 0" :pomodoros="stats.pomodoros" :bucketSize="dayDistributionBucketSize" key="chart"></DayDistribution>
      <div v-else class="empty" key="empty">{{ M.daily_empty_placeholder }}</div>
    </section>-->
    <section class="chart">
      <div class="title">
        <h2>{{ M.weekly_distribution }}</h2>
      </div>
      <WeekDistribution v-if="stats.total > 0" :pomodoros="stats.pomodoros" key="chart"></WeekDistribution>
      <div v-else class="empty" key="empty">{{ M.weekly_empty_placeholder }}</div>
    </section>
    <section class="chart">
      <div class="title">
        <h2>Monthly Distribution</h2>
      </div>
      <MonthDistribution v-if="stats.total > 0" :pomodoros="stats.pomodoros" key="chart"></MonthDistribution>
      <div v-else class="empty" key="empty">{{ M.weekly_empty_placeholder }}</div>
    </section>
    <section class="chart">
      <div class="title">
        <h2
          v-if="stats && stats.pomodoros && Object.keys(stats.pomodoros).length"
        >{{ Object.values(stats.pomodoros).reduce((acc, val) => acc + val) }} Pomodoros in {{ this.currentYear }} </h2>
        <h2 v-else>0 Pomodoros in {{ this.currentYear }}</h2>
      </div>
      <Heatmap
        v-if="stats && stats.pomodoros"
        :pomodoros="stats.pomodoros"
        :start="historyStart"
        :end="historyEnd"
        key="chart"
      ></Heatmap>
      <div v-else class="empty" key="empty">{{ M.history_empty_placeholder }}</div>
    </section>
    <!-- <section class="chart">
      <div class="title">
        <h2
          v-if="stats && stats.pomodoros && stats.pomodoros['2020'] && Object.keys(stats.pomodoros['2020']).length"
        >{{ Object.values(stats.pomodoros['2020']).reduce((acc, val) => acc + val) }} Pomodoros in 2020</h2>
        <h2 v-else>0 Pomodoros in 2020</h2>
      </div>
      <Heatmap
        v-if="stats && stats.pomodoros"
        :pomodoros="stats.pomodoros['2020']"
        :start="twentytwenty"
        :end="twentytwentyone"
        key="chart"
      ></Heatmap>
      <div v-else class="empty" key="empty">{{ M.history_empty_placeholder }}</div>
    </section> -->
    <!-- <section class="chart">
      <div class="title">
        <h2
          v-if="stats && stats.pomodoros && stats.pomodoros['2019'] && Object.keys(stats.pomodoros['2019']).length"
        >{{ Object.values(stats.pomodoros['2019']).reduce((acc, val) => acc + val) }} Pomodoros in 2019</h2>
        <h2 v-else>0 Pomodoros in 2019</h2>
      </div>
      <Heatmap
        v-if="stats && stats.pomodoros"
        :pomodoros="stats.pomodoros['2019']"
        :start="twentynineteen"
        :end="twentytwenty"
        key="chart"
      ></Heatmap>
      <div v-else class="empty" key="empty">{{ M.history_empty_placeholder }}</div>
    </section> -->
    <!-- <section class="chart">
      <div class="title">
        <h2
          v-if="stats && stats.pomodoros && stats.pomodoros['2018'] && Object.keys(stats.pomodoros['2018']).length"
        >{{ Object.values(stats.pomodoros['2018']).reduce((acc, val) => acc + val) }} Pomodoros in 2018</h2>
        <h2 v-else>0 Pomodoros in 2018</h2>
      </div>
      <Heatmap
        v-if="stats && stats.pomodoros"
        :pomodoros="stats.pomodoros['2018']"
        :start="twentyeighteen"
        :end="twentynineteen"
        key="chart"
      ></Heatmap>
      <div v-else class="empty" key="empty">{{ M.history_empty_placeholder }}</div>
    </section> -->
  </div>
</template>

<style lang="scss">
.history {
  justify-content: space-between;
  .actions {
    .action {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      p {
        flex: 1 1 auto;
        margin: 0 0 0 15px;
      }
      button {
        flex: 0 0 185px;
        outline: 0 !important;
        font-size: 15px;
        cursor: pointer;
        background: transparent;
        color: #555;
        padding: 10px 10px;
        border: 1px solid #555;
        border-radius: 40px;
        text-decoration: none;
        display: inline-block;
        &:hover {
          color: #a00;
          border: 1px solid #a00;
          text-decoration: none;
        }
      }
    }
  }
}
.history section {
  margin-bottom: 60px;
}
.history .title {
  margin: 0 0 15px 0;
  border-bottom: 1px solid #aaa;
}
.history .title .options {
  float: right;
}
.history .title h2 {
  color: #444;
  font-size: 16px;
  display: inline;
  font-weight: normal;
}
.day-distribution .options input {
  display: none;
}
.day-distribution .options label {
  cursor: pointer;
  border: 0;
  background: transparent;
  text-transform: uppercase;
  outline: 0 !important;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 12px;
  position: relative;
  top: -1px;
}
.day-distribution .options input:checked + label {
  border-radius: 10px;
  background: #777;
  color: #fff;
}
.stats {
  margin: 20px 40px 80px 40px;
  display: flex;
  justify-content: space-between;
}
.stats .stat {
  display: flex;
  align-items: center;
  flex-flow: column;
}
.stats .stat .value {
  color: #a00;
  font-size: 30px;
  margin-bottom: 5px;
}
.stats .stat .bucket {
  color: #333;
  font-size: 17px;
}
.stats .stat .average {
  color: #555;
  margin-top: 3px;
}
.distribution rect {
  fill: #090;
  outline: 0 !important;
}
.distribution .domain {
  stroke: #777;
}
.chart .empty {
  display: flex;
  justify-content: center;
  padding: 50px 100px;
  font-size: 15px;
  background: #eee;
  color: #333;
  border-radius: 5px;
}
.tippy-tooltip {
  opacity: 0.9 !important;
  padding: 10px 17px;
  font-size: 16px;
}
</style>

<script>
import { HistoryClient, PomodoroClient } from "../background/Services";
import { integer, float, strftime, pomodoroCount } from "../Filters";
import * as File from "./File";
import Heatmap from "./Heatmap";
import DayDistribution from "./DayDistribution";
import WeekDistribution from "./WeekDistribution";
import MonthDistribution from "./MonthDistribution";
import M from "../Messages";

export default {
  data() {
    return {
      historyClient: new HistoryClient(),
      pomodoroClient: new PomodoroClient(),
      stats: null,
      // historyStart: null,
      // twentyeighteen:    new Date(2018, 0, 1, 0, 0),
      // twentynineteen:    new Date(2019, 0, 1, 0, 0),
      // twentytwenty:      new Date(2020, 0, 1, 0, 0),
      // twentytwentyone:   new Date(2021, 0, 1, 0, 0),
      // twentytwentytwo:   new Date(2022, 0, 1, 0, 0),
      // twentytwentythree: new Date(2023, 0, 1, 0, 0),
      // dayDistributionBucketSize: 30
    };
  },
  async mounted() {
    this.updateStats();
    this.pomodoroClient.on("expire", () => {
      this.updateStats();
    });
  },
  beforeDestroy() {
    this.historyClient.dispose();
    this.pomodoroClient.dispose();
  },
  methods: {
    // async exportHistoryCSV() {
    //   let csv = await this.historyClient.getCSV();
    //   File.save('history.csv', csv);
    // },
    async exportHistory() {
      let json = JSON.stringify(await this.historyClient.getAll());
      File.save("history.json", json);
    },
    async importHistory() {
      try {
        let content = await File.readText(".json");
        if (!content) {
          return;
        }

        let history = JSON.parse(content);
        if (!confirm(M.import_confirmation)) {
          return;
        }

        // let count = await this.historyClient.merge(history);
        let count = await this.historyClient.merge2(history);
        alert(M.pomodoros_imported(pomodoroCount(count)));
      } catch (e) {
        alert(M.import_failed(`${e}`));
        return;
      }

      await this.updateStats();
    },
    async clearHistory() {
      if (!confirm(M.clear_history_confirmation)) {
        return;
      }

      await this.historyClient.clearHistory();
      await this.updateStats();
    },
    async updateStats() {
      // this.stats = await this.historyClient.getStats(+start);
      // debugger;
      this.stats = await this.historyClient.getStats2();
      this.currentYear = new Date().getFullYear().toString();
      // Get the first day of current year
      this.historyStart = new Date(new Date().getFullYear(), 0, 1);
      // Get the first day of next year
      this.historyEnd = new Date(new Date().getFullYear() + 1, 0, 1);
    },
  },
  filters: {
    integer,
    float,
    pomodoroCount,
    strftime,
    in_month: M.in_month,
    average_stat: M.average_stat,
    // last_12_months: M.last_12_months
  },
  components: {
    Heatmap,
    DayDistribution,
    WeekDistribution,
    MonthDistribution,
  },
};
</script>
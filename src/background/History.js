import Chrome from '../Chrome';
import StorageManager from './StorageManager';
import RLE from './RLE';
import Mutex from '../Mutex';
import M from '../Messages';
import { ref, set, onValue } from "firebase/database";
import 'firebase/database';

class History
{
  constructor(db) {
    this.storage = new StorageManager(new HistorySchema(), Chrome.storage.local);
    this.mutex = new Mutex();
    this.db = db;
    this.ref = ref(db, `pomodoros/personal/${new Date().getFullYear().toString()}`);
    this.pomodoros = {};
  }

  async all() {
    return await this.storage.get();
  }

  async clear() {
    await this.storage.set(this.storage.schema.default);
  }

  // deprecated
  async merge(history) {
    return await this.mutex.exclusive(async () => {
      let existing = decompress(await this.storage.get());
      let importing = decompress(history);
      let { count, merged } = merge(existing, importing);
      await this.storage.set(compress(merged));
      return count;
    });
  }

  // deprecated
  // async toCSV() {
  //   let {
  //     pomodoros,
  //     durations,
  //     timezones
  //   } = decompress(await this.storage.get());

  //   const escape = value => {
  //     if (value.indexOf(',') < 0) {
  //       return value;
  //     }

  //     return '"' + value.replace(/"/g, '""') + '"';
  //   };

  //   const row = values => values.map(v => escape(v.toString())).join(',') + '\n';

  //   let csv = row([
  //     M.end_iso_8601,
  //     M.end_date,
  //     M.end_time,
  //     M.end_timestamp,
  //     M.end_timezone,
  //     M.duration_seconds
  //   ]);

  //   for (let i = 0; i < pomodoros.length; i++) {
  //     let [timestamp, timezone] = [pomodoros[i] * 60, -timezones[i]];
  //     let time = moment.unix(timestamp).utcOffset(timezone, true);
  //     csv += row([
  //       time.toISOString(true),
  //       time.format('YYYY-MM-DD'),
  //       time.format('HH:mm:ss'),
  //       timestamp,
  //       timezone,
  //       durations[i]
  //     ]);
  //   }

  //   return csv;
  // }

  // deprecated
  async addPomodoro(duration, when = null) {
    // debugger;
    await this.mutex.exclusive(async () => {
      let local = await this.storage.get();

      when = when || new Date();
      let timestamp = History.timestamp(when);

      let i = local.pomodoros.length - 1;
      while (i >= 0 && local.pomodoros[i] > timestamp) {
        --i;
      }

      let timezone = when.getTimezoneOffset();

      if (i >= local.pomodoros.length - 1) {
        // Timestamps *should* be monotonically increasing, so we should
        // always be able to quickly append new values.
        RLE.append(local.durations, duration);
        RLE.append(local.timezones, timezone);
        local.pomodoros.push(timestamp);
      } else {
        // If there is a timestamp inversion for some reason, insert values
        // at the correct sorted position.
        let durations = RLE.decompress(local.durations);
        durations.splice(i + 1, 0, duration);
        local.durations = RLE.compress(durations);

        let timezones = RLE.decompress(local.timezones);
        timezones.splice(i + 1, 0, timezone);
        local.timezones = RLE.compress(timezones);

        local.pomodoros.splice(i + 1, 0, timestamp);
      }

      await this.storage.set(local);

      return this.countSince(local.pomodoros, History.today);
    });
  }

  // deprecated
  // async stats(since) {
  //   return this.mutex.exclusive(async () => {
  //     let { pomodoros } = await this.storage.get('pomodoros');

  //     let total = pomodoros.length;
  //     let delta = total === 0 ? 0 : (new Date() - History.date(pomodoros[0]));
  //     let dayCount = Math.max(delta / 1000 / 60 / 60 / 24, 1);
  //     let weekCount = Math.max(dayCount / 7, 1);
  //     let monthCount = Math.max(dayCount / (365.25 / 12), 1);

  //     return {
  //       day: this.countSince(pomodoros, History.today),
  //       dayAverage: total / dayCount,
  //       week: this.countSince(pomodoros, History.thisWeek),
  //       weekAverage: total / weekCount,
  //       month: this.countSince(pomodoros, History.thisMonth),
  //       monthAverage: total / monthCount,
  //       period: this.countSince(pomodoros, new Date(since)),
  //       total: total,
  //       daily: this.dailyGroups(pomodoros, since),
  //       pomodoros: pomodoros.map(p => +History.date(p))
  //     };
  //   });
  // }

  // deprecated
  // async countToday(pomodoros = null) {
  //   return this.mutex.exclusive(async () => {
  //     if (!pomodoros) {
  //       pomodoros = (await this.storage.get('pomodoros')).pomodoros;
  //       if (pomodoros.length === 0) {
  //         return 0;
  //       }
  //     }

  //     return this.countSince(pomodoros, History.today);
  //   });
  // }

  // deprecated
  countSince(pomodoros, date) {
    let timestamp = History.timestamp(date);
    let index = search(pomodoros, timestamp);
    return pomodoros.length - index;
  }

  // deprecated
  dailyGroups(pomodoros, since) {
    let start = new Date(since);

    let daily = {};
    let base = 0;
    let date = History.today;
    while (date >= start) {
      let countSince = this.countSince(pomodoros, date);
      let count = countSince - base;
      if (count > 0) {
        daily[+date] = count;
        base = countSince;
      }
      date.setDate(date.getDate() - 1);
    }

    return daily;
  }

  // deprecated
  static timestamp(date) {
    return Math.floor(+date / 1000 / 60);
  }

  // deprecated
  static date(timestamp) {
    return new Date(timestamp * 60 * 1000);
  }

  // deprecated
  static get today() {
    let today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    return today;
  }

  // deprecated
  static get thisWeek() {
    let week = new Date();
    week.setDate(week.getDate() - week.getDay());
    week.setHours(0);
    week.setMinutes(0);
    week.setSeconds(0);
    week.setMilliseconds(0);
    return week;
  }

  // deprecated
  static get thisMonth() {
    let month = new Date();
    month.setDate(1);
    month.setHours(0);
    month.setMinutes(0);
    month.setSeconds(0);
    month.setMilliseconds(0);
    return month;
  }

  /** 
  * get pomodoros obj from firebase
  * @return {ReturnValueDataTypeHere} pomodoros obj {2018: {date: 1, date: 2...}, 2019: {...}, 2020: {...}}
  */
  async getPomodoros() {
    // debugger;
    return new Promise((resolve, reject) => {
      onValue(this.ref, (snapshot) => {
        resolve(snapshot.val());
      }, (error) => {
        console.log("Error: " + error);
        reject(error);
      });
    });
  }

  async merge2(history) {
    return await this.mutex.exclusive(async () => {
      await this.storage.set(history);
      let total = 0;
      for (let year in history.pomodoros) {
        if (history.pomodoros.hasOwnProperty(year)) {
          if (!Object.keys(history.pomodoros[year]).length) continue;
          total += Object.values(history.pomodoros[year]).reduce((acc, val) => acc + val)
        }
      }
      return total;
    });
  }
  /** 
  * invoke when a pomodoro completes
  * @return {ReturnValueDataTypeHere} Brief description of the returning value here.
  */
  async addPomodoro2() {
    // debugger;
    await this.mutex.exclusive(async () => {
      if (this.pomodoros === undefined || this.pomodoros === null || Object.entries(this.pomodoros).length === 0) {
        this.pomodoros = await this.getPomodoros();
      }
      
      let today = new Date().setHours(0, 0, 0, 0);

      if (today in this.pomodoros) {
        this.pomodoros[today] += 1;
      } else {
        this.pomodoros[today] = 1;
      }

      set(this.ref, this.pomodoros);
      return this.countSinceToday(this.pomodoros);
    });
  }

  async stats2() {
    // debugger;
    return this.mutex.exclusive(async () => {
      this.pomodoros = await this.getPomodoros();
      // debugger;

      // let total = 0;
      // for (let year in this.pomodoros) {
      //   if (this.pomodoros.hasOwnProperty(year)) {
      //     if (!Object.keys(this.pomodoros[year]).length) continue;
      //     total += Object.values(this.pomodoros[year]).reduce((acc, val) => acc + val)
      //   }
      // }
      let total = Object.values(this.pomodoros).reduce((acc, val) => acc + val)
      let delta = total === 0 ? 0 : (new Date() - Object.keys(this.pomodoros)[0]); // gets the first key's key
      let dayCount = Math.max(delta / 1000 / 60 / 60 / 24, 1);
      let weekCount = Math.max(dayCount / 7, 1);
      let monthCount = Math.max(dayCount / (365.25 / 12), 1);

      return {
        pomodoros: this.pomodoros,
        day: this.countSinceToday(this.pomodoros),
        dayAverage: total / dayCount,
        week: this.countSinceThisWeek(this.pomodoros),
        weekAverage: total / weekCount,
        month: this.countSinceThisMonth(this.pomodoros),
        monthAverage: total / monthCount,
        // period: this.countSince2(pomodoros, new Date(since)),
        total
      };
    });
  }

  /**
 * Returns the sum of all numbers passed to the function.
 * @param {...number} num - A positive or negative number.
 */
  async countToday() {
    return this.mutex.exclusive(async () => {
      if (!this.pomodoros) {
        // pomodoros = (await this.storage.get('pomodoros')).pomodoros;
        this.pomodoros = await this.getPomodoros();
        

        if (Object.keys(this.pomodoros).length === 0) {
          return 0;
        }
      }

      // return this.countSince(pomodoros, History.today);
      return this.countSinceToday(this.pomodoros);
    });
  }

  /**
   * Returns how many pomodoros completed from date (i.e. today)
   * @param {Object} pomodoros - "pomodoros": { "2018": { "1545379200000": 7, "2019": { "1545379200000": 7}}
   * @param {Date} date - beginning of today's date 
   */
  countSinceToday(pomodoros) {
    if (!pomodoros) return 0;

    let today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    return +today in pomodoros ? pomodoros[+today] : 0;
  }

  countSinceThisWeek(pomodoros) {
    if (!pomodoros) return 0;

    let getMondayOfCurrentWeek = () => {
      const today = new Date();
      const first = today.getDate() - today.getDay() + 1;
    
      const monday = new Date(today.setDate(first));
      return monday;
    }

    let daysInWeek = [];
    let d = getMondayOfCurrentWeek();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    for (let i = 0; i < 7; i++) {
      daysInWeek.push(+d);
      d.setDate(d.getDate() + 1);
    }

    let total = 0;
    daysInWeek.forEach(day => {
      total += !isNaN(pomodoros[day]) ? parseInt(pomodoros[day]) : 0;
    });

    return total;
  }

  countSinceThisMonth(pomodoros) {
    if (!pomodoros) return 0;

    let dateInMonth = [];
    let d = new Date();
    d.setDate(1);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    
    let lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    let daysInMonth = lastDay.getDate()

    for (let i = 0; i < daysInMonth; i++) {
      dateInMonth.push(+d);
      d.setDate(d.getDate() + 1);
    }

    let total = 0;
    dateInMonth.forEach(day => {
      total += !isNaN(pomodoros[day]) ? parseInt(pomodoros[day]) : 0;
    });

    return total;
  }

  static timestamp(date) {
    return Math.floor(+date / 1000 / 60);
  }

  static date(timestamp) {
    return new Date(timestamp * 60 * 1000);
  }
}

class HistorySchema
{
  get version() {
    return 1;
  }

  get default() {
    return {
      pomodoros: {},
      // durations: [],
      // timezones: [],
      version: this.version
    };
  }
}

function decompress(historyRLE) {
  if (!historyRLE) {
    throw new Error(M.missing_pomodoro_data);
  }

  let {
    pomodoros,
    durations: durationsRLE,
    timezones: timezonesRLE
  } = historyRLE;

  if (!pomodoros) {
    throw new Error(M.missing_pomodoro_data);
  }

  if (!durationsRLE) {
    throw new Error(M.missing_duration_data);
  }

  if (!Array.isArray(durationsRLE)) {
    throw new Error(M.invalid_duration_data);
  }

  if (!timezonesRLE) {
    throw new Error(M.missing_timezone_data);
  }

  if (!Array.isArray(timezonesRLE)) {
    throw new Error(M.missing_timezone_data);
  }

  const durations = RLE.decompress(durationsRLE);
  const timezones = RLE.decompress(timezonesRLE);

  if (pomodoros.length !== durations.length) {
    throw new Error(M.mismatched_pomodoro_duration_data);
  }

  if (pomodoros.length !== timezones.length) {
    throw new Error(M.mismatched_pomodoro_timezone_data);
  }

  for (let i = 0; i < pomodoros.length; i++) {
    if (!Number.isInteger(pomodoros[i])) {
      throw new Error(M.invalid_pomodoro_data);
    }

    if (!Number.isInteger(durations[i])) {
      throw new Error(M.invalid_duration_data);
    }

    if (!Number.isInteger(timezones[i])) {
      throw new Error(M.invalid_timezone_data);
    }
  }

  return {
    ...historyRLE,
    pomodoros,
    durations,
    timezones
  };
}

function compress(history) {
  if (!history) {
    throw new Error(M.missing_pomodoro_data);
  }

  if (!history.durations) {
    throw new Error(M.missing_duration_data);
  }

  if (!Array.isArray(history.durations)) {
    throw new Error(M.invalid_duration_data);
  }

  if (!history.timezones) {
    throw new Error(M.missing_timezone_data);
  }

  if (!Array.isArray(history.timezones)) {
    throw new Error(M.invalid_timezone_data);
  }

  return {
    ...history,
    durations: RLE.compress(history.durations),
    timezones: RLE.compress(history.timezones)
  };
}

function merge(existing, importing) {
  let {
    pomodoros: existingPomodoros,
    durations: existingDurations,
    timezones: existingTimezones
  } = existing;

  let {
    pomodoros: importingPomodoros,
    durations: importingDurations,
    timezones: importingTimezones
  } = importing;

  let pomodoros = [...existingPomodoros];
  let durations = [...existingDurations];
  let timezones = [...existingTimezones];

  let count = 0;
  for (let i = 0; i < importingPomodoros.length; i++) {
    let timestamp = importingPomodoros[i];
    let index = search(pomodoros, timestamp);

    if (pomodoros[index] === timestamp) {
      // Pomodoros with the same timestamp are considered
      // identical and are excluded when being imported.
      continue;
    }

    count++;
    pomodoros.splice(index, 0, timestamp);
    durations.splice(index, 0, importingDurations[i]);
    timezones.splice(index, 0, importingTimezones[i]);
  }

  return {
    count,
    merged: {
      ...existing,
      pomodoros,
      durations,
      timezones
    }
  };
}

// Returns the index in arr for which all elements at or after the index are
// at least min. If all elements are less than min, this returns arr.length.
function search(arr, min, lo = null, hi = null) {
  lo = lo || 0;
  hi = hi || (arr.length - 1);

  while (lo <= hi) {
    let mid = Math.floor((lo + hi) / 2);
    if (arr[mid] >= min) {
      hi = mid - 1;
    } else if (arr[mid] < min) {
      lo = mid + 1;
    }
  }

  return Math.min(lo, arr.length);
}

export {
  History,
  merge
};
const { format } = require("date-fns");

// should be shared between frontend and backend
class BetTimer {
  constructor(additionalJoinTimeWeeks = 0, additionalRunTimeWeeks = 0) {
    this.minimumJoinTimeWeeks = 2;
    this.minimumRunTimeWeeks = 1;
    this.secondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    this.now = Date.now();
    this.additionalJoinTimeWeeks = additionalJoinTimeWeeks;
    this.additionalRunTimeWeeks = additionalRunTimeWeeks;
    this.currentWeek = Math.floor(this.now / this.secondsPerWeek);
    this.startWeek =
      this.currentWeek +
      this.minimumJoinTimeWeeks +
      this.additionalJoinTimeWeeks;
    this.endWeek =
      this.startWeek + this.minimumRunTimeWeeks + this.additionalRunTimeWeeks;
  }
  formatter(ms, type) {
    ms = typeof ms === "string" ? parseInt(ms) : ms;
    switch (type) {
      case "format":
        if (!ms) return "Invalid";
        return format(new Date(ms), "dd.MM.yyyy HH:mm:ss");
      case "iso":
        return new Date(ms).toISOString();
      case "object":
        return new Date(ms);
      default:
        return ms;
    }
  }
  starts(type) {
    return this.formatter(this.startWeek * this.secondsPerWeek, type);
  }
  ends(type) {
    return this.formatter(this.endWeek * this.secondsPerWeek, type);
  }
  validate(endDate) {
    if (typeof endDate !== "string") {
      return false;
    }
    const startWeek = this.startWeek; // get from validates 2nd argument new Date(startDate).getTime() / this.secondsPerWeek;
    const endWeek = new Date(endDate).getTime() / this.secondsPerWeek;
    return (
      startWeek >= this.currentWeek + this.minimumJoinTimeWeeks &&
      endWeek >= startWeek + this.minimumRunTimeWeeks &&
      endWeek % 1 === 0 &&
      startWeek % 1 === 0
    );
  }
}

module.exports = BetTimer;

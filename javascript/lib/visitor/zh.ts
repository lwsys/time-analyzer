import { ZhDateDayAroundAliasContext, ZhDateDayAroundStepContext, ZhDateNormalContext, ZhDateTimeContext, ZhMonthContext, ZhMonthDayContext, ZhPeriodWeek_1Context, ZhPeriodWeek_2Context, ZhTimeHourStepContext, ZhTimeMinuteStepContext, ZhTimeNormalContext, ZhWeekDayContext, ZhYearContext, ZhPeriodDateToDateContext, ZhPeriodDateTimeToDateTimeContext, ZhPeriodDateTimeToTimeContext, ZhPeriodTimeToTimeContext, ZhPeriodMonthDayToMonthDayContext } from "../grammar/TimeParser";
import { AnalyzerDateTimeValue, AnalyzerDateValue, AnalyzerPeriodValue, AnalyzerPeriodValueType, AnalyzerTimeValue, AnalyzerUnexpectedError, AnalyzerValue, WeekValues } from "../model";
import { StdTimeAnalyzerVisitor } from "./std";
import { computedAroundTime, getCurrentYear, parsePeriodDateTimeToTime } from "./common.utils";
import { parseZhAroundAliasMark, parseZhDateValue, parseZhDay, parseZhNumberValue, parseZhStepAliasMark, parseZhWeekValue, parseZhWeekValueToDate, parseZhYearValue, zhTimeHasPerioldAliasMark, zhTimeIsAfternoon } from "./zh.utils";

export class ZhTimeAnalyzerVisitor extends StdTimeAnalyzerVisitor {
  //// zhPeriod
  visitZhPeriodWeek_1(ctx: ZhPeriodWeek_1Context): AnalyzerValue | null {

    const startWeekDay = parseZhWeekValue(ctx.zhWeekValue()[0]);
    const endWeekDay = parseZhWeekValue(ctx.zhWeekValue()[1]);

    if (startWeekDay === -1 || endWeekDay === -1) {
      return null;
    }

    const offsetWeeks = parseZhNumberValue(ctx.zhNumberValue())* parseZhStepAliasMark(ctx.zhStepAliasMark());

    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.Date,
      parseZhWeekValueToDate(startWeekDay as WeekValues, offsetWeeks),
      parseZhWeekValueToDate(endWeekDay as WeekValues, offsetWeeks),
      ctx,
    );
  };

	visitZhPeriodWeek_2(ctx: ZhPeriodWeek_2Context): AnalyzerValue | null {

    const startWeekDay = parseZhWeekValue(ctx.zhWeekValue()[0]);
    const endWeekDay = parseZhWeekValue(ctx.zhWeekValue()[1]);

    if (startWeekDay === -1 || endWeekDay === -1) {
      return null;
    }

    const startOffsetWeeks = parseZhAroundAliasMark(ctx.zhAroundAliasMark()[0]);
    const endOffsetWeeks = ctx.zhAroundAliasMark().length >= 2
      ? parseZhAroundAliasMark(ctx.zhAroundAliasMark()[1])
      : startOffsetWeeks;

    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.Date,
      parseZhWeekValueToDate(startWeekDay as WeekValues, startOffsetWeeks),
      parseZhWeekValueToDate(endWeekDay as WeekValues, endOffsetWeeks),
      ctx,
    );
  };
	visitZhPeriodMonthDayToMonthDay(ctx: ZhPeriodMonthDayToMonthDayContext): AnalyzerValue | null {
    const months = ctx.zhMonth().map((item) => this.visit(item) as AnalyzerDateValue);
    const days = ctx.zhDay().map((item) => parseZhDay(item));
    if (!months[0]
      || (months.length > 1 && !months[1])
      || !days[0] || days[0] < 1 || days[0] > 31
      || !days[1] || days[1] < 1 || days[1] > 31) {
      return null;
    }
    
    if (ctx.zhYear()) {
      const year = this.visit(ctx.zhYear()) as AnalyzerDateValue;
      months.map((item) => item.year = year.year);
    }

    const start = months[0];
    const end = months[1] || start;

    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.Date,
      new AnalyzerDateValue(
        start.year, start.month, days[0],
      ),
      new AnalyzerDateValue(
        end.year, end.month, days[1],
      ),
      ctx,
    );
  };
  visitZhPeriodDateToDate(ctx: ZhPeriodDateToDateContext): AnalyzerValue {
    const start = this.visit(ctx.zhDate()[0]);
    const end = this.visit(ctx.zhDate()[1]);
    if (!start || !end) {
      return null;
    }
    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.Date,
      start,
      end,
      ctx,
    );
  };

	visitZhPeriodDateTimeToDateTime(ctx: ZhPeriodDateTimeToDateTimeContext): AnalyzerValue {
    const start = this.visit(ctx.zhDateTime()[0]);
    const end = this.visit(ctx.zhDateTime()[1]);
    if (!start || !end) {
      return null;
    }
    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.DateTime,
      start,
      end,
      ctx,
    );
  };

	visitZhPeriodDateTimeToTime(ctx: ZhPeriodDateTimeToTimeContext): AnalyzerValue | null {
    const start = this.visit(ctx.zhDateTime()) as AnalyzerDateTimeValue;
    const end = this.visit(ctx.zhTime()) as AnalyzerTimeValue;
    if (!start || !end) {
      return null;
    }
    if (zhTimeIsAfternoon(ctx.zhDateTime().zhTime())
      && !zhTimeHasPerioldAliasMark(ctx.zhTime())
      && end.hour < 12) {
      end.hour += 12;
    }
    return parsePeriodDateTimeToTime(
      start,
      end,
      ctx,
    );
  };

	visitZhPeriodTimeToTime(ctx: ZhPeriodTimeToTimeContext): AnalyzerValue | null {
    const start = this.visit(ctx.zhTime()[0]) as AnalyzerTimeValue;
    const end = this.visit(ctx.zhTime()[1]) as AnalyzerTimeValue;
    if (!start || !end) {
      return null;
    }
    if (zhTimeIsAfternoon(ctx.zhTime()[0])
      && !zhTimeHasPerioldAliasMark(ctx.zhTime()[1])
      && end.hour < 12) {
      end.hour += 12;
    }
    return new AnalyzerPeriodValue(
      AnalyzerPeriodValueType.Time,
      start,
      end,
      ctx,
    );
  };


  //// zhDate
  visitZhDateNormal(ctx: ZhDateNormalContext): AnalyzerDateValue | null {
    if (ctx.zhMonthDay()) {
      const result = this.visit(ctx.zhMonthDay()) as AnalyzerDateValue;
      if (!result) {
        return null;
      }
      if (ctx.zhYear()) {
        const year = this.visit(ctx.zhYear()) as AnalyzerDateValue;
        result.year = year.year;
      }
      return result;
    }
    if (ctx.zhWeekDay()) {
      return this.visit(ctx.zhWeekDay()) as AnalyzerDateValue;
    }
    throw new AnalyzerUnexpectedError();
  };

  visitZhDateDayAroundAlias(ctx: ZhDateDayAroundAliasContext): AnalyzerDateValue {
    const date = new Date();
    date.setDate(date.getDate() + parseZhAroundAliasMark(ctx.zhAroundAliasMark()));
    ;
    return AnalyzerDateValue.fromDateTime(date, ctx);
  };

	visitZhDateDayAroundStep(ctx: ZhDateDayAroundStepContext): AnalyzerValue {
    const date = new Date();
    date.setDate(
      date.getDate()
      + parseZhNumberValue(ctx.zhNumberValue()) * parseZhStepAliasMark(ctx.zhStepAliasMark()));
    ;
    return AnalyzerDateValue.fromDateTime(date, ctx);
  };

	visitZhWeekDay(ctx: ZhWeekDayContext): AnalyzerDateValue | null {
    const targetWeekDay = parseZhWeekValue(ctx.zhWeekValue());
    if (targetWeekDay === -1) {
      return null;
    }
    return parseZhWeekValueToDate(
      targetWeekDay, 
      ctx.zhNumberValue()
        ? parseZhNumberValue(ctx.zhNumberValue()) * parseZhStepAliasMark(ctx.zhStepAliasMark())
        : (ctx.zhAroundAliasMark()
          ? parseZhAroundAliasMark(ctx.zhAroundAliasMark())
          : 0)
      );
  };

	visitZhMonthDay(ctx: ZhMonthDayContext): AnalyzerDateValue | null {
    const month = this.visit(ctx.zhMonth()) as AnalyzerDateValue;
    const day = parseZhDay(ctx.zhDay());
    if (!month || !day || day <= 0 || day > 31) {
      return null;
    }
    return new AnalyzerDateValue(
      month.year,
      month.month,
      day,
      ctx,
    );
  };

	visitZhYear(ctx: ZhYearContext): AnalyzerDateValue {
    if (ctx.zhAroundAliasMark()) {
      return new AnalyzerDateValue(
        getCurrentYear() + parseZhAroundAliasMark(ctx.zhAroundAliasMark()),
        -1,
        0,
      );
    }
    if (ctx.zhNumberValue()) {
      const offsetType = parseZhStepAliasMark(ctx.zhStepAliasMark());
      
      return new AnalyzerDateValue(
        getCurrentYear() + parseZhNumberValue(ctx.zhNumberValue()) * offsetType,
        -1,
        0,
      );
    }
    if (ctx.zhYearValue()) {
      const year = parseZhYearValue(ctx.zhYearValue());
      return new AnalyzerDateValue(
        year,
        -1,
        0,
      );
    }
    throw new AnalyzerUnexpectedError();
  };

	visitZhMonth(ctx: ZhMonthContext): AnalyzerDateValue | null {
    if (ctx.zhDateValue()) {
      const month = parseZhDateValue(ctx.zhDateValue());
      if (month < 1 || month > 12) {
        return null;
      }
      return new AnalyzerDateValue(
        getCurrentYear(),
        month - 1,
        0,
      );
    }
    if (ctx.zhAroundAliasMark()) {
      const date = new Date();
      date.setMonth(date.getMonth() + parseZhAroundAliasMark(ctx.zhAroundAliasMark()));
      return AnalyzerDateValue.fromDateTime(date);
    }
    if (ctx.zhNumberValue()) {
      const date = new Date();
      date.setMonth(date.getMonth() + parseZhNumberValue(ctx.zhNumberValue()) * parseZhStepAliasMark(ctx.zhStepAliasMark()));
      return AnalyzerDateValue.fromDateTime(date);
    }
    throw new AnalyzerUnexpectedError();
  };

  // zhDateTime
	visitZhDateTime(ctx: ZhDateTimeContext): AnalyzerDateTimeValue | null {
    const date = this.visit(ctx.zhDate()) as AnalyzerDateValue;
    const time = this.visit(ctx.zhTime()) as AnalyzerTimeValue;
    if (!date || !time) {
      return null;
    }
    if (ctx.zhTimePeriodAliasMark()
      && ctx.zhTimePeriodAliasMark().ZhAfternoonWord()
      && time.hour < 12) {
      time.hour += 12
    }
    return new AnalyzerDateTimeValue(
      date.year, date.month, date.day,
      time.hour, time.minute, time.second,
      ctx,
    );
  };

  //// zhTime
	visitZhTimeNormal(ctx: ZhTimeNormalContext): AnalyzerTimeValue | null {
    const values = ctx.zhNumberValue().map((item) => parseZhNumberValue(item));
    let hour = values[0];
    const minute = values[1] || 0;
    const second = values[2] || 0;
    if (hour >= 24 || hour < 0
      || minute >= 60 || minute < 0
      || second >= 60 || second < 0) {
      return null;
    }
    if (ctx.zhTimePeriodAliasMark()
      && ctx.zhTimePeriodAliasMark().ZhAfternoonWord()
      && hour < 12) {
      hour += 12;
    }
    return new AnalyzerTimeValue(hour, minute, second);
  };

  //// zhDirectTimeAround
  visitZhTimeHourStep(ctx: ZhTimeHourStepContext): AnalyzerValue {
    const values = ctx.zhNumberValue().map((item) => parseZhNumberValue(item));
    return AnalyzerDateTimeValue.fromDateTime(
      computedAroundTime(
        parseZhStepAliasMark(ctx.zhStepAliasMark()),
        { hour: values[0], minute: values[1] || 0 },
      ),
      ctx,
    );
  };

	visitZhTimeMinuteStep(ctx: ZhTimeMinuteStepContext): AnalyzerValue {
    return AnalyzerDateTimeValue.fromDateTime(
      computedAroundTime(
        parseZhStepAliasMark(ctx.zhStepAliasMark()),
        { minute: parseZhNumberValue(ctx.zhNumberValue()) },
      ),
      ctx,
    );
  };
}
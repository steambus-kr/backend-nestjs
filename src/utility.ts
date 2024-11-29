import { TIME } from './constant';

export function calculateRatio(positive: number, negative: number): number {
  if (positive + negative === 0) {
    return 0;
  }

  return positive / (positive + negative);
}

export function formatMs(ms: number): string {
  const str: string[] = [];
  const asDay = ms / TIME.DAY;
  const asHour = (ms % TIME.DAY) / TIME.HOUR;
  const asMinute = (ms % TIME.HOUR) / TIME.MINUTE;
  const asSecond = (ms % TIME.MINUTE) / TIME.SECOND;
  if (asDay >= 1) {
    str.push(`${Math.floor(asDay)}d`);
  }
  if (asHour >= 1) {
    str.push(`${Math.floor(asHour)}h`);
  }
  if (asMinute >= 1) {
    str.push(`${Math.floor(asMinute)}m`);
  }
  str.push(`${asSecond}s`);
  return str.join(' ');
}

export function round(num: number, digit: number): number {
  const pow = Math.pow(10, digit);
  return Math.round(num * pow) / pow;
}

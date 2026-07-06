export const toMoney = (value: string | number): string =>
  Number(value).toFixed(2);

export const moneyAdd = (a: string | number, b: string | number): string =>
  (Number(a) + Number(b)).toFixed(2);

export const moneySub = (a: string | number, b: string | number): string =>
  (Number(a) - Number(b)).toFixed(2);

export const moneyPercent = (
  base: string | number,
  percent: string | number,
): string => ((Number(base) * Number(percent)) / 100).toFixed(2);

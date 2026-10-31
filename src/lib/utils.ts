export const cn = (...classes: any[]): string => {
  return classes.filter(Boolean).join(" ");
};

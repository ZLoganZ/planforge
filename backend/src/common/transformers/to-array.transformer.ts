export const toArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.includes(',') ? value.split(',') : [value];
  }
  return [value];
};

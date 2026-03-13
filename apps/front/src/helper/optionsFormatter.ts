export const formatOptions = (options: { code: string; label: string | null }[]) => options.map(formatOption);

export const formatOption = (option: { code: string; label: string | null }) => ({
  value: option.code,
  label: option.label ? `${option.code} - ${option.label}` : option.code,
});

export const formatOptions = (
  options: { codeElementNomenclature: string; libelleElementNomenclature: string | null }[],
) => options.map(formatOption);

export const formatOption = (option: {
  codeElementNomenclature: string;
  libelleElementNomenclature: string | null;
}) => ({
  value: option.codeElementNomenclature,
  label: option.libelleElementNomenclature
    ? `${option.codeElementNomenclature} - ${option.libelleElementNomenclature}`
    : option.codeElementNomenclature,
});

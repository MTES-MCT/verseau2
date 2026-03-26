export const formatOptions = (
  options: { elementNomenclatureCode: string; elementNomenclatureLibelle: string | null }[],
) => options.map(formatOption);

export const formatOption = (option: {
  elementNomenclatureCode: string;
  elementNomenclatureLibelle: string | null;
}) => ({
  value: option.elementNomenclatureCode,
  label: option.elementNomenclatureLibelle
    ? `${option.elementNomenclatureCode} - ${option.elementNomenclatureLibelle}`
    : option.elementNomenclatureCode,
});

/** Résultat STEU retourné par un fetch batch MASA */
export interface SteuCdnBySandreCda {
  sandreCda: string;
  steuCdn: number;
}

/** Résultat ITV retourné par un fetch batch MASA */
export interface ItvCdnByRfa {
  rfa: string;
  itvCdn: number;
}

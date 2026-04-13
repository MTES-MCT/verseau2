import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RoseauReferentielPointMesureGateway } from './roseauReferentielPointMesure.gateway';
import { PointMesureReferentielRow } from '@masa/masa.dto';
import { PmoEntity } from './entities/pmo.entity';
import { SteuEntity } from './entities/steu.entity';
import { SclEntity } from './entities/scl.entity';
import { TlrefEntity } from './entities/tlref.entity';
import { OrmEntity } from './entities/orm.entity';
import { toISODateOrNull } from '@lib/shared';

@Injectable()
export class RoseauReferentielPointMesureRepository implements RoseauReferentielPointMesureGateway {
  constructor(
    @InjectRepository(PmoEntity)
    private readonly pmoRepository: Repository<PmoEntity>,
  ) {}

  async findPointsMesureReferentiel(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    if (ouvrageType === 'steu') {
      return this.findPointsMesureReferentielSteu(ouvrageCode, filters);
    }
    return this.findPointsMesureReferentielScl(ouvrageCode, filters);
  }

  private async findPointsMesureReferentielSteu(
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('steu.steu_sandre_cda', 'ouvrage_sandre_cda')
      .addSelect('steu.steu_nom_lb', 'ouvrage_nom')
      .addSelect('pmo.pmo_ae_cda', 'identifiant_agence')
      .addSelect('pmo.pmo_no', 'numero_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('t16.tlref_elt_cda', 'localisation_code')
      .addSelect('t16.tlref_mnemo_lb', 'localisation_globale')
      .addSelect('pmo.pmo_val_deb_dt', 'date_debut')
      .addSelect('pmo.pmo_val_fin_dt', 'date_fin')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .where('steu.tlref_10_cdn IN (:...tlref10Cdns)', { tlref10Cdns: [40, 41] })
      .andWhere('steu.steu_sandre_cda = :ouvrageCode', { ouvrageCode });

    this.applyPointsMesureFilters(qb, filters);

    qb.orderBy('steu.steu_sandre_cda', 'ASC').addOrderBy('steu.steu_nom_lb', 'ASC').addOrderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{
      ouvrage_sandre_cda: string;
      ouvrage_nom: string | null;
      identifiant_agence: string | null;
      numero_point: string | null;
      nom_point: string | null;
      localisation_code: string | null;
      localisation_globale: string | null;
      date_debut: Date | null;
      date_fin: Date | null;
    }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.ouvrage_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.ouvrage_nom?.trim() ?? null,
      pointAgenceEauNumero: r.identifiant_agence?.trim() ?? null,
      pointMesureNumero: r.numero_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_code?.trim() ?? null,
      pointMesureLocalisationLibelle: r.localisation_globale?.trim() ?? null,
      pointMesureCategorieSystemeCollecte: null,
      pointMesureValiditeDebutDate: toISODateOrNull(r.date_debut),
      pointMesureValiditeFinDate: toISODateOrNull(r.date_fin),
    }));
  }

  private async findPointsMesureReferentielScl(
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]> {
    const qb = this.pmoRepository
      .createQueryBuilder('pmo')
      .select('scl.scl_sandre_cda', 'ouvrage_sandre_cda')
      .addSelect('scl.scl_lb', 'ouvrage_nom')
      .addSelect('pmo.pmo_ae_cda', 'identifiant_agence')
      .addSelect('pmo.pmo_no', 'numero_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('t16.tlref_elt_cda', 'localisation_code')
      .addSelect('t16.tlref_mnemo_lb', 'localisation_globale')
      .addSelect('t24.tlref_mnemo_lb', 'categorie')
      .addSelect('pmo.pmo_val_deb_dt', 'date_debut')
      .addSelect('pmo.pmo_val_fin_dt', 'date_fin')
      .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
      .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = scl.steu_cdn')
      .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
      .leftJoin(OrmEntity, 'orm', 'orm.pmo_cdn = pmo.pmo_cdn')
      .leftJoin(TlrefEntity, 't24', 't24.tlref_cdn = orm.tlref_24_cdn')
      .where('steu.tlref_10_cdn IN (:...tlref10Cdns)', { tlref10Cdns: [40, 41] })
      .andWhere('scl.scl_sandre_cda = :ouvrageCode', { ouvrageCode });

    this.applyPointsMesureFilters(qb, filters);

    qb.orderBy('scl.scl_sandre_cda', 'ASC').addOrderBy('scl.scl_lb', 'ASC').addOrderBy('pmo.pmo_no', 'ASC');

    const rows = await qb.getRawMany<{
      ouvrage_sandre_cda: string;
      ouvrage_nom: string | null;
      identifiant_agence: string | null;
      numero_point: string | null;
      nom_point: string | null;
      localisation_code: string | null;
      localisation_globale: string | null;
      categorie: string | null;
      date_debut: Date | null;
      date_fin: Date | null;
    }>();

    return rows.map((r) => ({
      ouvrageDepollutionCode: r.ouvrage_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.ouvrage_nom?.trim() ?? null,
      pointAgenceEauNumero: r.identifiant_agence?.trim() ?? null,
      pointMesureNumero: r.numero_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_code?.trim() ?? null,
      pointMesureLocalisationLibelle: r.localisation_globale?.trim() ?? null,
      pointMesureCategorieSystemeCollecte: r.categorie?.trim() ?? null,
      pointMesureValiditeDebutDate: toISODateOrNull(r.date_debut),
      pointMesureValiditeFinDate: toISODateOrNull(r.date_fin),
    }));
  }

  private applyPointsMesureFilters(
    qb: SelectQueryBuilder<PmoEntity>,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): void {
    if (filters.dateDebut) {
      qb.andWhere('(pmo.pmo_val_fin_dt IS NULL OR pmo.pmo_val_fin_dt >= :dateDebut)', { dateDebut: filters.dateDebut });
    }
    if (filters.dateFin) {
      qb.andWhere('(pmo.pmo_val_deb_dt IS NULL OR pmo.pmo_val_deb_dt <= :dateFin)', { dateFin: filters.dateFin });
    }
    if (filters.localisationCodes && filters.localisationCodes.length > 0) {
      qb.andWhere('t16.tlref_elt_cda IN (:...localisationCodes)', {
        localisationCodes: filters.localisationCodes,
      });
    }
  }
}

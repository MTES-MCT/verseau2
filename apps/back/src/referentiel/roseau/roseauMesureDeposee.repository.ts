import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoseauMesureDeposeeGateway } from './roseauMesureDeposee.gateway';
import { MesureFilters, MesureRow } from '@masa/masa.dto';

import { AlrEntity } from './entities/alr.entity';
import { PleEntity } from './entities/ple.entity';
import { PmoEntity } from './entities/pmo.entity';
import { SclEntity } from './entities/scl.entity';
import { SteuEntity } from './entities/steu.entity';
import { TlrefEntity } from './entities/tlref.entity';
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';
import { UrfEntity } from '@referentiel/lanceleau/entities/urf.entity';

@Injectable()
export class RoseauMesureDeposeeRepository implements RoseauMesureDeposeeGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }> {
    const alrRepository = this.dataSource.getRepository(AlrEntity);

    const {
      ouvrageType,
      ouvrageDepollutionCodes,
      systemeCollecteCodes,
      pointMesureId,
      dateDebut,
      dateFin,
      parametreAnalyseCode,
      resultatAnalyseQualification,
      resultatAnalyseStatut,
      analyseFinalite,
      page,
      pageSize,
    } = filters;
    const sortBy = filters.sortBy ?? 'default';
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const buildBaseQuery = () => {
      if (ouvrageType === 'scl') {
        // Mode SCL : pmo -> scl -> steu (chemin via le système de collecte)
        return alrRepository
          .createQueryBuilder('alr')
          .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
          .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
          .innerJoin(SclEntity, 'scl', 'scl.scl_cdn = pmo.scl_cdn')
          .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = scl.steu_cdn')
          .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
          .leftJoin(TlrefEntity, 't20', 't20.tlref_cdn = alr.tlref_20_cdn')
          .leftJoin(TlrefEntity, 't18', 't18.tlref_cdn = alr.tlref_18_cdn')
          .leftJoin(TlrefEntity, 't17', 't17.tlref_cdn = alr.tlref_17_cdn')
          .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
          .leftJoin(UrfEntity, 'urf', 'urf.urf_rfa = alr.urf_rfa');
      } else {
        // Mode STEU : pmo -> steu (jointure directe)
        return alrRepository
          .createQueryBuilder('alr')
          .innerJoin(PleEntity, 'ple', 'ple.ple_cdn = alr.ple_cdn')
          .innerJoin(PmoEntity, 'pmo', 'pmo.pmo_cdn = ple.pmo_cdn')
          .innerJoin(SteuEntity, 'steu', 'steu.steu_cdn = pmo.steu_cdn')
          .innerJoin(TlrefEntity, 't16', 't16.tlref_cdn = pmo.tlref_16_cdn')
          .leftJoin(TlrefEntity, 't20', 't20.tlref_cdn = alr.tlref_20_cdn')
          .leftJoin(TlrefEntity, 't18', 't18.tlref_cdn = alr.tlref_18_cdn')
          .leftJoin(TlrefEntity, 't17', 't17.tlref_cdn = alr.tlref_17_cdn')
          .innerJoin(ParEntity, 'par', 'par.par_rfa = alr.par_rfa')
          .leftJoin(UrfEntity, 'urf', 'urf.urf_rfa = alr.urf_rfa');
      }
    };

    const applyFilters = (qb: ReturnType<typeof buildBaseQuery>) => {
      if (ouvrageType === 'scl') {
        if (systemeCollecteCodes.length > 0) {
          qb.andWhere('scl.scl_sandre_cda IN (:...systemeCollecteCodes)', { systemeCollecteCodes });
        }
      } else {
        if (ouvrageDepollutionCodes.length > 0) {
          qb.andWhere('steu.steu_sandre_cda IN (:...ouvrageDepollutionCodes)', { ouvrageDepollutionCodes });
        }
      }
      if (pointMesureId !== undefined) {
        qb.andWhere('pmo.pmo_cdn = :pointMesureId', { pointMesureId });
      }
      if (dateDebut) {
        qb.andWhere('ple.ple_prelev_dt >= :dateDebut', { dateDebut });
      }
      if (dateFin) {
        qb.andWhere('ple.ple_prelev_dt <= :dateFin', { dateFin });
      }
      if (parametreAnalyseCode) {
        qb.andWhere('par.par_rfa = :parametreAnalyseCode', { parametreAnalyseCode });
      }
      if (resultatAnalyseQualification) {
        qb.andWhere('t18.tlref_elt_cda = :resultatAnalyseQualification', { resultatAnalyseQualification });
      }
      if (resultatAnalyseStatut) {
        qb.andWhere('t20.tlref_elt_cda = :resultatAnalyseStatut', { resultatAnalyseStatut });
      }
      if (analyseFinalite) {
        qb.andWhere('t17.tlref_elt_cda = :analyseFinalite', { analyseFinalite });
      }
      return qb;
    };

    const countQb = applyFilters(buildBaseQuery());
    const total = await countQb.getCount();

    const dataQb = applyFilters(buildBaseQuery())
      .select('steu.steu_sandre_cda', 'steu_sandre_cda')
      .addSelect('steu.steu_nom_lb', 'steu_nom')
      .addSelect(ouvrageType === 'scl' ? 'scl.scl_sandre_cda' : 'NULL::text', 'scl_sandre_cda')
      .addSelect(ouvrageType === 'scl' ? 'scl.scl_lb' : 'NULL::text', 'scl_nom')
      .addSelect('t16.tlref_elt_cda', 'localisation_point')
      .addSelect('pmo.pmo_ae_cda', 'num_point_agence')
      .addSelect('pmo.pmo_no', 'num_point')
      .addSelect('pmo.pmo_lb', 'nom_point')
      .addSelect('ple.ple_prelev_dt', 'date')
      .addSelect('par.par_rfa', 'parametre_code')
      .addSelect('par.par_court_nom_lb', 'parametre_nom')
      .addSelect('alr.alr_res_val', 'valeur')
      .addSelect('urf.urf_symb_lb', 'unite')
      .addSelect('t17.tlref_mnemo_lb', 'finalite')
      .addSelect(
        "CASE WHEN t20.tlref_elt_cda IS NOT NULL THEN t20.tlref_elt_cda || '-' || COALESCE(t20.tlref_mnemo_lb, '') ELSE NULL END",
        'statut',
      )
      .addSelect('t18.tlref_mnemo_lb', 'qualification');

    const sortMap: Record<string, string> = {
      date: 'ple.ple_prelev_dt',
      parametreCode: 'par.par_rfa',
      valeur: 'alr.alr_res_val',
      statut: 'statut',
    };

    if (sortBy === 'default') {
      if (ouvrageType === 'scl') {
        dataQb
          .orderBy('scl.scl_lb', sortOrder)
          .addOrderBy('t16.tlref_elt_cda', sortOrder)
          .addOrderBy('pmo.pmo_no', sortOrder)
          .addOrderBy('ple.ple_prelev_dt', sortOrder)
          .addOrderBy('par.par_rfa', sortOrder);
      } else {
        dataQb
          .orderBy('steu.steu_nom_lb', sortOrder)
          .addOrderBy('t16.tlref_elt_cda', sortOrder)
          .addOrderBy('pmo.pmo_no', sortOrder)
          .addOrderBy('ple.ple_prelev_dt', sortOrder)
          .addOrderBy('par.par_rfa', sortOrder);
      }
    } else {
      const sortColumn = sortMap[sortBy];
      if (!sortColumn) {
        throw new Error(`Invalid sortBy value: "${sortBy}"`);
      }
      dataQb.orderBy(sortColumn, sortOrder);
    }

    dataQb.offset((page - 1) * pageSize).limit(pageSize);

    const rows = await dataQb.getRawMany<{
      steu_sandre_cda: string;
      steu_nom: string | null;
      scl_sandre_cda: string | null;
      scl_nom: string | null;
      localisation_point: string | null;
      num_point_agence: string | null;
      num_point: string | null;
      nom_point: string | null;
      date: Date | null;
      parametre_code: string;
      parametre_nom: string | null;
      valeur: string | null;
      unite: string | null;
      finalite: string | null;
      statut: string | null;
      qualification: string | null;
    }>();

    const data: MesureRow[] = rows.map((r) => ({
      ouvrageDepollutionCode: r.steu_sandre_cda?.trim() ?? '',
      ouvrageDepollutionNom: r.steu_nom?.trim() ?? null,
      systemeCollecteCode: r.scl_sandre_cda?.trim() ?? null,
      systemeCollecteNom: r.scl_nom?.trim() ?? null,
      pointMesureLocalisationCode: r.localisation_point?.trim() ?? null,
      pointAgenceEauNumero: r.num_point_agence?.trim() ?? null,
      pointMesureNumero: r.num_point?.trim() ?? null,
      pointMesureLibelle: r.nom_point?.trim() ?? null,
      prelevementDate: r.date ? new Date(r.date) : null,
      parametreAnalyseCode: r.parametre_code?.trim() ?? '',
      parametreNomCourt: r.parametre_nom?.trim() ?? null,
      resultatAnalyseValeur: r.valeur !== null && r.valeur !== undefined ? parseFloat(r.valeur) : null,
      uniteMesureSymbole: r.unite?.trim() ?? null,
      analyseFinalite: r.finalite?.trim() ?? null,
      resultatAnalyseStatut: r.statut?.trim() ?? null,
      resultatAnalyseQualification: r.qualification?.trim() ?? null,
    }));

    return { data, total };
  }
}

import { Repository, SelectQueryBuilder } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';
import { RoseauRepository } from './roseau.repository';
import { SteuEntity } from './entities/steu.entity';
import { SclEntity } from './entities/scl.entity';
import { CxnadmEntity } from './entities/cxnadm.entity';
import { PmoEntity } from './entities/pmo.entity';
import { TlrefEntity } from './entities/tlref.entity';
import { CpyEntity } from './entities/cpy.entity';
import { ResaEntity } from './entities/resa.entity';
import { StchanEntity } from './entities/stchan.entity';
import { AlrEntity } from './entities/alr.entity';
import { PabEntity } from './entities/pab.entity';
import { CdbEntity } from '@referentiel/lanceleau/entities/cdb.entity';

function createRoseauRepository(
  steuRepository: Repository<SteuEntity>,
  pmoRepository: Repository<PmoEntity> = createMock<Repository<PmoEntity>>(),
): RoseauRepository {
  return new RoseauRepository(
    {} as Repository<SclEntity>,
    steuRepository,
    {} as Repository<CxnadmEntity>,
    pmoRepository,
    {} as Repository<TlrefEntity>,
    {} as Repository<CpyEntity>,
    {} as Repository<ResaEntity>,
    {} as Repository<StchanEntity>,
    {} as Repository<AlrEntity>,
    {} as Repository<PabEntity>,
    {} as Repository<CdbEntity>,
  );
}

describe('RoseauRepository', () => {
  describe('findPointsMesureBySystemesCollecte', () => {
    it('groups measurement points by collection system while preserving their order', async () => {
      const queryBuilder = createMock<SelectQueryBuilder<PmoEntity>>();
      queryBuilder.select.mockReturnThis();
      queryBuilder.addSelect.mockReturnThis();
      queryBuilder.leftJoin.mockReturnThis();
      queryBuilder.innerJoin.mockReturnThis();
      queryBuilder.where.mockReturnThis();
      queryBuilder.orderBy.mockReturnThis();
      queryBuilder.getRawMany.mockResolvedValue([
        { scl_cdn: 501, pmo_cdn: 9001, pmo_no: ' 1 ', pmo_lb: ' Amont ', localisation_globale: ' A2 ' },
        { scl_cdn: 502, pmo_cdn: 9002, pmo_no: ' 2 ', pmo_lb: null, localisation_globale: null },
        { scl_cdn: 501, pmo_cdn: 9003, pmo_no: ' 3 ', pmo_lb: ' Aval ', localisation_globale: ' A3 ' },
      ]);
      const pmoRepository = createMock<Repository<PmoEntity>>();
      pmoRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      const repository = createRoseauRepository(createMock<Repository<SteuEntity>>(), pmoRepository);

      await expect(repository.findPointsMesureBySystemesCollecte([501, 502])).resolves.toEqual({
        '501': [
          {
            pointMesureId: 9001,
            pointMesureNumero: '1',
            pointMesureLibelle: 'Amont',
            pointMesureLocalisationGlobale: 'A2',
          },
          {
            pointMesureId: 9003,
            pointMesureNumero: '3',
            pointMesureLibelle: 'Aval',
            pointMesureLocalisationGlobale: 'A3',
          },
        ],
        '502': [
          {
            pointMesureId: 9002,
            pointMesureNumero: '2',
            pointMesureLibelle: null,
            pointMesureLocalisationGlobale: null,
          },
        ],
      });
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('scl.scl_cdn', 'scl_cdn');
      expect(queryBuilder.where).toHaveBeenCalledWith('scl.scl_cdn IN (:...systemeCollecteIds)', {
        systemeCollecteIds: [501, 502],
      });
    });

    it('does not query when no collection systems are provided', async () => {
      const pmoRepository = createMock<Repository<PmoEntity>>();
      const repository = createRoseauRepository(createMock<Repository<SteuEntity>>(), pmoRepository);

      await expect(repository.findPointsMesureBySystemesCollecte([])).resolves.toEqual({});
      expect(pmoRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns an empty object when no measurement points are found', async () => {
      const queryBuilder = createMock<SelectQueryBuilder<PmoEntity>>();
      queryBuilder.select.mockReturnThis();
      queryBuilder.addSelect.mockReturnThis();
      queryBuilder.leftJoin.mockReturnThis();
      queryBuilder.innerJoin.mockReturnThis();
      queryBuilder.where.mockReturnThis();
      queryBuilder.orderBy.mockReturnThis();
      queryBuilder.getRawMany.mockResolvedValue([]);
      const pmoRepository = createMock<Repository<PmoEntity>>();
      pmoRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      const repository = createRoseauRepository(createMock<Repository<SteuEntity>>(), pmoRepository);

      await expect(repository.findPointsMesureBySystemesCollecte([501])).resolves.toEqual({});
    });
  });

  describe('findAgenceEauNomBySteuCode', () => {
    it("should return the agence de l'eau nom", async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ cdbNomLb: 'agence_1' }),
      };
      const createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      const steuRepository = {
        createQueryBuilder,
      } as unknown as Repository<SteuEntity>;
      const repository = createRoseauRepository(steuRepository);

      await expect(repository.findAgenceEauNomBySteuCode('STEU001')).resolves.toBe('agence_1');

      expect(createQueryBuilder).toHaveBeenCalledWith('steu');
      expect(queryBuilder.select).toHaveBeenCalledWith('cdb.cdbNomLb', 'cdbNomLb');
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(expect.any(Function), 'cdb', 'cdb.cdbRfa = steu.steuCdbRfa');
      expect(queryBuilder.where).toHaveBeenCalledWith('steu.steuSandreCda = :ouvrageDepollutionCode', {
        ouvrageDepollutionCode: 'STEU001',
      });
    });

    it('should return null when the code is empty', async () => {
      const createQueryBuilder = jest.fn();
      const steuRepository = {
        createQueryBuilder,
      } as unknown as Repository<SteuEntity>;
      const repository = createRoseauRepository(steuRepository);

      await expect(repository.findAgenceEauNomBySteuCode('   ')).resolves.toBeNull();
      expect(createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return null when no agence is found', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ cdbNomLb: null }),
      };
      const steuRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as unknown as Repository<SteuEntity>;
      const repository = createRoseauRepository(steuRepository);

      await expect(repository.findAgenceEauNomBySteuCode('STEU001')).resolves.toBeNull();
    });

    it('should return null when cdbNomLb is empty', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ cdbNomLb: '   ' }),
      };
      const steuRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as unknown as Repository<SteuEntity>;
      const repository = createRoseauRepository(steuRepository);

      await expect(repository.findAgenceEauNomBySteuCode('STEU001')).resolves.toBeNull();
    });
  });
});

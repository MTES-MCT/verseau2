import { Repository } from 'typeorm';
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

function createRoseauRepository(steuRepository: Repository<SteuEntity>): RoseauRepository {
  return new RoseauRepository(
    {} as Repository<SclEntity>,
    steuRepository,
    {} as Repository<CxnadmEntity>,
    {} as Repository<PmoEntity>,
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

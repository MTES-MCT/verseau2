/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LanceleauRepository } from './lanceleau.repository';
import { ItvEntity } from './entities/itv.entity';
import { SupEntity } from './entities/sup.entity';
import { FanEntity } from './entities/fan.entity';
import { ParEntity } from './entities/par.entity';
import { UrfEntity } from './entities/urf.entity';
import { OrionCredentialsEntity } from './entities/orionCredentials.entity';
import { OrionRoleForPrincipalEntity } from './entities/orionRoleForPrincipal.entity';
import { AgEntity } from './entities/ag.entity';
import { VSteuSclItvEntity } from './entities/vSteuSclItv.entity';

describe('LanceleauRepository', () => {
  let repository: LanceleauRepository;
  let orionCredentialsRepository: jest.Mocked<Repository<OrionCredentialsEntity>>;
  let queryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    getRawMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    orionCredentialsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<OrionCredentialsEntity>>;

    const emptyRepository = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanceleauRepository,
        {
          provide: getRepositoryToken(ItvEntity),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) },
        },
        { provide: getRepositoryToken(SupEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(FanEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(ParEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(UrfEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(OrionRoleForPrincipalEntity), useValue: emptyRepository },
        {
          provide: getRepositoryToken(AgEntity),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) },
        },
        { provide: getRepositoryToken(VSteuSclItvEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(OrionCredentialsEntity), useValue: orionCredentialsRepository },
      ],
    }).compile();

    repository = module.get(LanceleauRepository);
  });

  it('should find and normalize an Orion contact by login', async () => {
    queryBuilder.getRawMany.mockResolvedValue([{ nom: '  Doe  ', prenom: '  John  ' }]);

    await expect(repository.findOrionContactByLogin('  cerbere-user  ')).resolves.toEqual({
      nom: 'Doe',
      prenom: 'John',
    });

    expect(orionCredentialsRepository.createQueryBuilder).toHaveBeenCalledWith('oc');
    expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :login', { login: 'cerbere-user' });
  });

  it('resolves agent rights by login_lb, not mail', async () => {
    queryBuilder.getRawMany.mockResolvedValue([{ itvCdn: 42, prCdn: 123 }]);

    await expect(repository.findAgByLogin('  cerbere-user  ')).resolves.toEqual({
      intervenantId: 42,
      principalIdentifiant: 123,
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :login', { login: 'cerbere-user' });
  });

  it('resolves the indicator SIRET by login_lb, not mail', async () => {
    queryBuilder.getRawMany.mockResolvedValue([{ itvRfa: '12345678901234' }]);

    await expect(repository.findSiretByLogin('  cerbere-user  ')).resolves.toBe('12345678901234');

    expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :login', { login: 'cerbere-user' });
  });

  it.each(['findAgByLogin', 'findSiretByLogin', 'findOrionContactByLogin'] as const)(
    '%s parameterizes the login rather than interpolating it into SQL',
    async (method) => {
      const login = "login' OR 1=1 --";
      await repository[method](login);

      expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :login', { login });
    },
  );

  it.each(['findAgByLogin', 'findSiretByLogin', 'findOrionContactByLogin'] as const)(
    '%s returns null when no rows match the login',
    async (method) => {
      await expect(repository[method]('unknown-login')).resolves.toBeNull();
    },
  );

  describe.each(['findAgByLogin', 'findSiretByLogin', 'findOrionContactByLogin'] as const)('%s', (method) => {
    it.each([false, true])('throws DUPLICATE_LOGIN for multiple rows (identical values: %s)', async (identical) => {
      const row = { itvCdn: 42, prCdn: 123, itvRfa: '12345678901234', nom: 'Doe', prenom: 'John' };
      const otherRow = identical
        ? { ...row }
        : { itvCdn: 43, prCdn: 124, itvRfa: '12345678901235', nom: 'Smith', prenom: 'Jane' };
      queryBuilder.getRawMany.mockResolvedValue([row, otherRow]);

      await expect(repository[method]('cerbere-user')).rejects.toThrow('DUPLICATE_LOGIN');
    });
  });

  it('returns null when the matching intervenant has no SIRET', async () => {
    queryBuilder.getRawMany.mockResolvedValue([{ itvRfa: null }]);

    await expect(repository.findSiretByLogin('cerbere-user')).resolves.toBeNull();
  });
});

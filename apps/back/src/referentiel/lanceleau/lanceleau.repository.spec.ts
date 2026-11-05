/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import type { SelectQueryBuilder } from 'typeorm';
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
  let agRepository: DeepMocked<Repository<AgEntity>>;
  let itvRepository: DeepMocked<Repository<ItvEntity>>;
  let orionCredentialsRepository: DeepMocked<Repository<OrionCredentialsEntity>>;
  let agQueryBuilder: DeepMocked<SelectQueryBuilder<AgEntity>>;
  let itvQueryBuilder: DeepMocked<SelectQueryBuilder<ItvEntity>>;
  let queryBuilder: DeepMocked<SelectQueryBuilder<OrionCredentialsEntity>>;

  beforeEach(async () => {
    queryBuilder = createMock<SelectQueryBuilder<OrionCredentialsEntity>>();
    queryBuilder.select.mockReturnThis();
    queryBuilder.addSelect.mockReturnThis();
    queryBuilder.where.mockReturnThis();
    orionCredentialsRepository = createMock<Repository<OrionCredentialsEntity>>();
    orionCredentialsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    agQueryBuilder = createMock<SelectQueryBuilder<AgEntity>>();
    agQueryBuilder.innerJoin.mockReturnThis();
    agQueryBuilder.where.mockReturnThis();
    agRepository = createMock<Repository<AgEntity>>();
    agRepository.createQueryBuilder.mockReturnValue(agQueryBuilder);

    itvQueryBuilder = createMock<SelectQueryBuilder<ItvEntity>>();
    itvQueryBuilder.select.mockReturnThis();
    itvQueryBuilder.innerJoin.mockReturnThis();
    itvQueryBuilder.where.mockReturnThis();
    itvRepository = createMock<Repository<ItvEntity>>();
    itvRepository.createQueryBuilder.mockReturnValue(itvQueryBuilder);

    const emptyRepository = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanceleauRepository,
        { provide: getRepositoryToken(ItvEntity), useValue: itvRepository },
        { provide: getRepositoryToken(SupEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(FanEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(ParEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(UrfEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(OrionRoleForPrincipalEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(AgEntity), useValue: agRepository },
        { provide: getRepositoryToken(VSteuSclItvEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(OrionCredentialsEntity), useValue: orionCredentialsRepository },
      ],
    }).compile();

    repository = module.get(LanceleauRepository);
  });

  it('should find an agent by matching the Cerbère email against the Orion login', async () => {
    agQueryBuilder.getOne.mockResolvedValue(createMock<AgEntity>({ itvCdn: 100, prCdn: 1000 }));

    await expect(repository.findAgByEmail('  user@example.com  ')).resolves.toEqual({
      intervenantId: 100,
      principalIdentifiant: 1000,
    });

    expect(agQueryBuilder.innerJoin).toHaveBeenCalledWith(OrionCredentialsEntity, 'oc', 'ag.pr_cdn = oc.pr_cdn');
    expect(agQueryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :email', { email: 'user@example.com' });
  });

  it('should return null when no agent matches the Cerbère email', async () => {
    agQueryBuilder.getOne.mockResolvedValue(null);

    await expect(repository.findAgByEmail('unknown@example.com')).resolves.toBeNull();
  });

  it('should find a SIRET by matching the Cerbère email against the Orion login', async () => {
    itvQueryBuilder.getRawOne.mockResolvedValue({ itvRfa: '12345678901234' });

    await expect(repository.findSiretByEmail('  user@example.com  ')).resolves.toBe('12345678901234');

    expect(itvQueryBuilder.innerJoin).toHaveBeenCalledWith(OrionCredentialsEntity, 'oc', 'oc.pr_cdn = ag.pr_cdn');
    expect(itvQueryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :email', { email: 'user@example.com' });
  });

  it('should return null when no SIRET matches the Cerbère email', async () => {
    itvQueryBuilder.getRawOne.mockResolvedValue(null);

    await expect(repository.findSiretByEmail('unknown@example.com')).resolves.toBeNull();
  });

  it('should find and normalize an Orion contact by matching the Cerbère email against the Orion login', async () => {
    queryBuilder.getRawOne.mockResolvedValue({ nom: '  Doe  ', prenom: '  John  ' });

    await expect(repository.findOrionContactByEmail('  user@example.com  ')).resolves.toEqual({
      nom: 'Doe',
      prenom: 'John',
    });

    expect(orionCredentialsRepository.createQueryBuilder).toHaveBeenCalledWith('oc');
    expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :email', { email: 'user@example.com' });
  });

  it('should return null when no Orion contact matches the email', async () => {
    queryBuilder.getRawOne.mockResolvedValue(null);

    await expect(repository.findOrionContactByEmail('unknown@example.com')).resolves.toBeNull();
  });
});

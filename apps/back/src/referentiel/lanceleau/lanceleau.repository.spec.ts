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
  let agQueryBuilder: DeepMocked<SelectQueryBuilder<AgEntity>>;
  let itvQueryBuilder: DeepMocked<SelectQueryBuilder<ItvEntity>>;

  beforeEach(async () => {
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
      ],
    }).compile();

    repository = module.get(LanceleauRepository);
  });

  it('should find an agent by matching the Cerbère email against the Orion login', async () => {
    agQueryBuilder.getOne.mockResolvedValue(
      createMock<AgEntity>({
        itvCdn: 100,
        prCdn: 1000,
        agMailLb: '  contact-ag@example.com  ',
        agNomLb: '  Doe  ',
        agPrenomLb: '  John  ',
      }),
    );

    await expect(repository.findAgentByOrionLogin('  user@example.com  ')).resolves.toEqual({
      intervenantId: 100,
      principalIdentifiant: 1000,
      mail: 'contact-ag@example.com',
      nom: 'Doe',
      prenom: 'John',
    });

    expect(agQueryBuilder.innerJoin).toHaveBeenCalledWith(OrionCredentialsEntity, 'oc', 'ag.pr_cdn = oc.pr_cdn');
    expect(agQueryBuilder.where).toHaveBeenCalledWith('TRIM(oc.login_lb) = :orionLogin', {
      orionLogin: 'user@example.com',
    });
  });

  it('should return null when no agent matches the Orion login', async () => {
    agQueryBuilder.getOne.mockResolvedValue(null);

    await expect(repository.findAgentByOrionLogin('unknown@example.com')).resolves.toBeNull();
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

  it.each([null, '', '  '])('normalizes empty AG contact fields (%j) without hiding the agent', async (value) => {
    agQueryBuilder.getOne.mockResolvedValue(
      createMock<AgEntity>({
        itvCdn: 100,
        prCdn: 1000,
        agMailLb: value,
        agNomLb: value,
        agPrenomLb: value,
      }),
    );

    await expect(repository.findAgentByOrionLogin('user@example.com')).resolves.toEqual({
      intervenantId: 100,
      principalIdentifiant: 1000,
      mail: null,
      nom: null,
      prenom: null,
    });
  });
});

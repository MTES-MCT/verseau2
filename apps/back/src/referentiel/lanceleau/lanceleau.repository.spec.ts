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
  let agRepository: jest.Mocked<Repository<AgEntity>>;
  let queryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    getRawOne: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };
    agRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<AgEntity>>;

    const emptyRepository = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanceleauRepository,
        { provide: getRepositoryToken(ItvEntity), useValue: emptyRepository },
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

  it('should find and normalize an agent contact by Orion email', async () => {
    queryBuilder.getRawOne.mockResolvedValue({
      nom: '  Doe  ',
      prenom: '  John  ',
      email: '  agent@example.com  ',
    });

    await expect(repository.findOrionContactByEmail('  User@Example.COM  ')).resolves.toEqual({
      nom: 'Doe',
      prenom: 'John',
      email: 'agent@example.com',
    });

    expect(agRepository.createQueryBuilder).toHaveBeenCalledWith('ag');
    expect(queryBuilder.select).toHaveBeenCalledWith('ag.agNomLb', 'nom');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('ag.agPrenomLb', 'prenom');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('ag.agMailLb', 'email');
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(OrionCredentialsEntity, 'oc', 'oc.pr_cdn = ag.pr_cdn');
    expect(queryBuilder.where).toHaveBeenCalledWith('LOWER(TRIM(oc.mail)) = LOWER(:mail)', {
      mail: 'User@Example.COM',
    });
  });

  it('should return a contact without email when ag_mail_lb is empty', async () => {
    queryBuilder.getRawOne.mockResolvedValue({ nom: 'Doe', prenom: 'John', email: null });

    await expect(repository.findOrionContactByEmail('user@example.com')).resolves.toEqual({
      nom: 'Doe',
      prenom: 'John',
      email: null,
    });
  });

  it('should return null when no agent contact matches the Orion email', async () => {
    queryBuilder.getRawOne.mockResolvedValue(null);

    await expect(repository.findOrionContactByEmail('unknown@example.com')).resolves.toBeNull();
  });
});

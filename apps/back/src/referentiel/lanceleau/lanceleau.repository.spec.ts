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
    where: jest.Mock;
    getRawOne: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };
    orionCredentialsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<OrionCredentialsEntity>>;

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
        { provide: getRepositoryToken(AgEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(VSteuSclItvEntity), useValue: emptyRepository },
        { provide: getRepositoryToken(OrionCredentialsEntity), useValue: orionCredentialsRepository },
      ],
    }).compile();

    repository = module.get(LanceleauRepository);
  });

  it('should find and normalize an Orion contact by email', async () => {
    queryBuilder.getRawOne.mockResolvedValue({ nom: '  Doe  ', prenom: '  John  ' });

    await expect(repository.findOrionContactByEmail('  user@example.com  ')).resolves.toEqual({
      nom: 'Doe',
      prenom: 'John',
    });

    expect(orionCredentialsRepository.createQueryBuilder).toHaveBeenCalledWith('oc');
    expect(queryBuilder.where).toHaveBeenCalledWith('TRIM(oc.mail) = :mail', { mail: 'user@example.com' });
  });

  it('should return null when no Orion contact matches the email', async () => {
    queryBuilder.getRawOne.mockResolvedValue(null);

    await expect(repository.findOrionContactByEmail('unknown@example.com')).resolves.toBeNull();
  });
});

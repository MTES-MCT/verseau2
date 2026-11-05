import { createMock } from '@golevelup/ts-jest';
import { DataSource, EntityManager } from 'typeorm';
import { AntivirusStatus, DepotStep } from '@lib/dossier';
import { DepotEntity } from './depot.entity';
import { AntivirusAnalysisEntity } from './antivirusAnalysis.entity';
import { DepotRepository } from './depot.repository';

describe('DepotRepository antivirus relation isolation and hydration', () => {
  it('creates a pending model without cascading a caller-supplied analysis', async () => {
    const repository = new DepotRepository(createMock<DataSource>());
    const entity = new DepotEntity();
    const create = jest.spyOn(repository, 'create').mockReturnValue(entity);
    jest.spyOn(repository, 'save').mockResolvedValue(entity);
    const result = await repository.createDepot({
      nomOriginalFichier: 'test.xml',
      antivirusAnalysis: { status: AntivirusStatus.CLEAN } as AntivirusAnalysisEntity,
    });
    expect(create).toHaveBeenCalledWith({ nomOriginalFichier: 'test.xml' });
    expect(result.antivirusAnalysis?.status).toBe(AntivirusStatus.PENDING);
  });

  it('cannot overwrite infection via generic full-model update', async () => {
    const manager = createMock<EntityManager>();
    const entity = Object.assign(new DepotEntity(), { id: 'dep_test' });
    const analysis = Object.assign(new AntivirusAnalysisEntity(), {
      depotId: entity.id,
      status: AntivirusStatus.INFECTED,
      detection: 'Win.Test.EICAR',
    });
    manager.findOne.mockImplementation((target) => Promise.resolve(target === DepotEntity ? entity : analysis));
    const repository = new DepotRepository(createMock<DataSource>({ createEntityManager: () => manager }));
    manager.transaction.mockImplementation(async (...args) => {
      const operation = args.find((arg) => typeof arg === 'function');
      if (typeof operation !== 'function') {
        throw new Error('Expected transaction callback');
      }
      return operation(manager);
    });
    const legacyUpdate = { antivirusAnalysis: { status: AntivirusStatus.CLEAN }, step: DepotStep.CONTROLE_IN_PROGRESS };
    await expect(repository.updateDepot(entity.id, legacyUpdate)).resolves.toMatchObject({
      antivirusAnalysis: { status: 'infected', detection: 'Win.Test.EICAR' },
      step: DepotStep.CONTROLE_IN_PROGRESS,
    });
  });

  it('explicitly hydrates the relation on all query paths', async () => {
    const repository = new DepotRepository(createMock<DataSource>());
    const one = jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    const many = jest.spyOn(repository, 'find').mockResolvedValue([]);
    await repository.findDepotById('dep_test');
    await repository.findDepotByIdWithUser('dep_test');
    await repository.findAllDepotsByAdmin();
    await repository.findByUserId('user_test');
    await repository.findByItvCdn(42);
    for (const [options] of [...one.mock.calls, ...many.mock.calls]) {
      expect(options).toMatchObject({ relations: { antivirusAnalysis: true } });
    }
  });
});

import { DataSource, QueryFailedError } from 'typeorm';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { LoggerService } from '@shared/logger/logger.service';
import { ReponseSandreEntity } from './reponseSandre.entity';
import { ReponseSandreRepository } from './reponseSandre.repository';

describe('ReponseSandreRepository logging', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs a handled duplicate at log level and returns the existing response', async () => {
    const depotGateway = {
      findDepotById: jest.fn().mockResolvedValue({ id: 'dep_1' }),
    } as unknown as DepotGateway;
    // Construct a repository without opening a database connection; persistence is mocked below.
    const repository = new ReponseSandreRepository(new DataSource({ type: 'postgres' }), depotGateway);
    const response = new ReponseSandreEntity();
    response.id = 'response_1';
    jest.spyOn(repository, 'create').mockReturnValue(response);
    jest
      .spyOn(repository, 'save')
      .mockRejectedValue(
        new QueryFailedError(
          'INSERT INTO reponse_sandre',
          [],
          Object.assign(new Error('Duplicate'), { code: '23505' }),
        ),
      );
    jest.spyOn(repository, 'findByDepotId').mockResolvedValue([response]);
    const log = jest.spyOn(LoggerService.prototype, 'log').mockImplementation(() => undefined);
    const debug = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation(() => undefined);
    const error = jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => undefined);

    await expect(repository.createReponseSandre({ depotId: 'dep_1' })).resolves.toBe(response);

    expect(log).toHaveBeenCalledWith('ReponseSandre already exists for this depot, skipping duplicate insert', {
      depotId: 'dep_1',
    });
    expect(debug).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

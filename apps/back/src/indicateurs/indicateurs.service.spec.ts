/* eslint-disable @typescript-eslint/unbound-method */
import { IndicateursService } from './indicateurs.service';
import { IndicateursGateway } from './indicateurs.gateway';
import { MasaProvider } from '@masa/masa.provider';
import { UserGateway } from '@user/user.gateway';
import { UserModel } from '@user/user.model';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { LoggerService } from '@shared/logger/logger.service';

describe('IndicateursService UID resolution', () => {
  let service: IndicateursService;
  let userGateway: Pick<jest.Mocked<UserGateway>, 'findBySub'>;
  let masaProvider: Pick<jest.Mocked<MasaProvider>, 'findSiretByLogin' | 'findVSteuSclItvByItvRfa'>;
  let indicateursGateway: jest.Mocked<IndicateursGateway>;
  const user: UserModel = {
    id: 'user-id',
    sub: 'oidc-sub',
    uid: 'cerbere-login',
    email: 'report@example.com',
    nom: 'Doe',
    prenom: 'John',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    userGateway = { findBySub: jest.fn().mockResolvedValue(user) };
    masaProvider = {
      findSiretByLogin: jest.fn().mockResolvedValue('12345678901234'),
      findVSteuSclItvByItvRfa: jest.fn().mockResolvedValue([{ ouvrageDepollutionCode: 'STEU001' }]),
    };
    indicateursGateway = { findIndicateursSteu: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
    service = new IndicateursService(
      indicateursGateway,
      masaProvider as unknown as MasaProvider,
      userGateway as unknown as UserGateway,
      loggerValueMock as unknown as LoggerService,
    );
  });

  it.each(['report@example.com', 'changed@example.com', ''])('uses UID independently of email (%p)', async (email) => {
    userGateway.findBySub.mockResolvedValue({ ...user, email });

    await service.getIndicateursSteu('oidc-sub', 1, 50);

    expect(masaProvider.findSiretByLogin).toHaveBeenCalledWith('cerbere-login');
    expect(indicateursGateway.findIndicateursSteu).toHaveBeenCalledWith(['STEU001'], 1, 50);
  });

  it('does not use email as fallback when UID is missing', async () => {
    userGateway.findBySub.mockResolvedValue({ ...user, uid: '' });

    await expect(service.getIndicateursSteu('oidc-sub', 1, 50)).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    expect(masaProvider.findSiretByLogin).not.toHaveBeenCalled();
    expect(indicateursGateway.findIndicateursSteu).not.toHaveBeenCalled();
  });
});

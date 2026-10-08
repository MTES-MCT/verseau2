/* eslint-disable @typescript-eslint/unbound-method */
import { UserService } from './user.service';
import { UserGateway } from './user.gateway';
import { UserModel } from './user.model';

describe('UserService UID synchronization', () => {
  const profile = { uid: 'Cerbere-Login', email: 'report@example.com', nom: 'Doe', prenom: 'John' };
  const user: UserModel = {
    id: 'user-id',
    sub: 'oidc-sub',
    ...profile,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let gateway: jest.Mocked<UserGateway>;
  let service: UserService;

  beforeEach(() => {
    gateway = {
      findById: jest.fn(),
      findBySub: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
    };
    service = new UserService(gateway);
  });

  it('persists the Cerbere UID separately from sub and email on first login', async () => {
    gateway.findBySub.mockResolvedValue(null);
    gateway.createUser.mockResolvedValue(user);

    await expect(service.findOrCreateUser('oidc-sub', profile)).resolves.toEqual(user);

    expect(gateway.createUser).toHaveBeenCalledWith({ sub: 'oidc-sub', ...profile });
  });

  it('updates the existing profile without recreating the user when the email changes', async () => {
    gateway.findBySub.mockResolvedValue(user);
    const updatedProfile = { ...profile, email: 'NEW@example.com' };
    gateway.updateUser.mockResolvedValue({ ...user, email: 'new@example.com' });

    await service.findOrCreateUser('oidc-sub', updatedProfile);

    expect(gateway.updateUser).toHaveBeenCalledWith(user.id, { ...profile, email: 'new@example.com' });
    expect(gateway.createUser).not.toHaveBeenCalled();
  });

  it('synchronizes a changed UID even if all other profile fields are unchanged', async () => {
    gateway.findBySub.mockResolvedValue(user);
    const updatedProfile = { ...profile, uid: 'Cerbere-New-Login' };
    gateway.updateUser.mockResolvedValue({ ...user, ...updatedProfile });

    await service.findOrCreateUser('oidc-sub', updatedProfile);

    expect(gateway.updateUser).toHaveBeenCalledWith(user.id, updatedProfile);
  });

  it('does not write an unchanged profile', async () => {
    gateway.findBySub.mockResolvedValue(user);

    await expect(service.findOrCreateUser('oidc-sub', profile)).resolves.toEqual(user);

    expect(gateway.updateUser).not.toHaveBeenCalled();
    expect(gateway.createUser).not.toHaveBeenCalled();
  });
});

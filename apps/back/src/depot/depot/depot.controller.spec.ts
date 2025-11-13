import { Test, TestingModule } from '@nestjs/testing';
import { DepotController } from './depot.controller';

describe('DepotController', () => {
  let controller: DepotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepotController],
    }).compile();

    controller = module.get<DepotController>(DepotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

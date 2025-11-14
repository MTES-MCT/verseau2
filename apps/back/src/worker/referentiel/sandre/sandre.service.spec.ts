import { Test, TestingModule } from '@nestjs/testing';
import { SandreService } from './sandre.service';

describe('SandreService', () => {
  let service: SandreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SandreService],
    }).compile();

    service = module.get<SandreService>(SandreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SandreService } from './sandre.service';
import { SharedModule } from '@shared/shared.module';

describe('SandreService', () => {
  let service: SandreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [SandreService],
    }).compile();

    service = module.get<SandreService>(SandreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

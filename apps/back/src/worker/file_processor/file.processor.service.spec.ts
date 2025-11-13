import { Test, TestingModule } from '@nestjs/testing';
import { FileProcessorService } from './file.processor.service';

describe('FileProcessorService', () => {
  let service: FileProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileProcessorService],
    }).compile();

    service = module.get<FileProcessorService>(FileProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

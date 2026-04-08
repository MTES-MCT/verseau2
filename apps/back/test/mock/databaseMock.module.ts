import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

const mockEntityManager: any = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDataSource: any = {
  createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
  getRepository: jest.fn().mockReturnValue(mockEntityManager),
};

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useValue: mockDataSource as DataSource,
    },
  ],
  exports: [DataSource],
})
export class DatabaseMockModule {}

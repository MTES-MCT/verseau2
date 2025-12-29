import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

const mockEntityManager = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as any;

const mockDataSource = {
  createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
  getRepository: jest.fn().mockReturnValue(mockEntityManager),
} as any;

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useValue: mockDataSource,
    },
  ],
  exports: [DataSource],
})
export class DatabaseMockModule {}

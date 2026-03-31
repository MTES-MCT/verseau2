import { Test, TestingModule } from '@nestjs/testing';
import { ConformiteService } from './conformite.service';
import { RoseauGateway as RoseauGatewayToken } from '@referentiel/roseau/roseau.gateway';
import type { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import type { ConformiteSteuDetailRow, ConformiteSclDetailRow, SteuCdnBySandreCda } from '@masa/masa.dto';

type MockedConformiteGateway = jest.Mocked<
  Pick<
    RoseauGateway,
    | 'findSteuBatchBySandreCdas'
    | 'findConformiteSteu'
    | 'findConformiteScl'
    | 'findConformiteSteuDetail'
    | 'findConformiteSclDetail'
  >
>;

describe('ConformiteService', () => {
  let service: ConformiteService;
  let roseauGateway: MockedConformiteGateway;

  beforeEach(async () => {
    roseauGateway = {
      findSteuBatchBySandreCdas: jest.fn(),
      findConformiteSteu: jest.fn(),
      findConformiteScl: jest.fn(),
      findConformiteSteuDetail: jest.fn(),
      findConformiteSclDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConformiteService,
        {
          provide: RoseauGatewayToken,
          useValue: roseauGateway,
        },
      ],
    }).compile();

    service = module.get<ConformiteService>(ConformiteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listConformiteSteu', () => {
    it('calls findSteuBatchBySandreCdas with authorized codes and then findConformiteSteu', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 1 },
        { ouvrageDepollutionCode: 'STEU002', ouvrageDepollutionIdentifiant: 2 },
      ]);
      roseauGateway.findConformiteSteu.mockResolvedValue({ data: [], total: 0 });

      await service.listConformiteSteu(['STEU001'], { page: 1, pageSize: 20 });

      expect(roseauGateway.findSteuBatchBySandreCdas).toHaveBeenCalledWith(['STEU001']);
      expect(roseauGateway.findConformiteSteu).toHaveBeenCalledWith(expect.objectContaining({ steuCdns: [1, 2] }));
    });

    it('returns empty when authorizedSteuCdas is empty', async () => {
      const result = await service.listConformiteSteu([], { page: 1, pageSize: 20 });
      expect(result.data).toEqual([]);
      expect(roseauGateway.findSteuBatchBySandreCdas).not.toHaveBeenCalled();
    });

    it('returns empty when no CDN resolved', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([]);
      const result = await service.listConformiteSteu(['STEU999'], { page: 1, pageSize: 20 });
      expect(result.data).toEqual([]);
    });

    it('passes filters to masaProvider', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 1 },
      ] satisfies SteuCdnBySandreCda[]);
      roseauGateway.findConformiteSteu.mockResolvedValue({ data: [], total: 0 });
      await service.listConformiteSteu(['STEU001'], {
        page: 2,
        pageSize: 10,
        trancheObligationLibelle: 'T1',
        impact: 'avec',
      });
      expect(roseauGateway.findConformiteSteu).toHaveBeenCalledWith(
        expect.objectContaining({ trancheObligationLibelle: 'T1', impact: 'avec', page: 2, pageSize: 10 }),
      );
    });
  });

  describe('listConformiteScl', () => {
    it('uses STEU CDNs to filter SCL list', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 1 },
      ] satisfies SteuCdnBySandreCda[]);
      roseauGateway.findConformiteScl.mockResolvedValue({ data: [], total: 0 });
      await service.listConformiteScl(['STEU001'], { page: 1, pageSize: 20 });
      expect(roseauGateway.findConformiteScl).toHaveBeenCalledWith(expect.objectContaining({ steuCdns: [1] }));
    });
  });

  describe('getConformiteSteuDetail', () => {
    it('delegates to roseauGateway.findConformiteSteuDetail when authorized', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 123 },
      ]);
      roseauGateway.findConformiteSteuDetail.mockResolvedValue({} as ConformiteSteuDetailRow);
      const result = await service.getConformiteSteuDetail(123, ['STEU001']);
      expect(result).not.toBeNull();
      expect(roseauGateway.findConformiteSteuDetail).toHaveBeenCalledWith(123, expect.any(Number));
    });

    it('returns null when not authorized', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 1 },
      ]);
      const result = await service.getConformiteSteuDetail(123, ['STEU001']);
      expect(result).toBeNull();
    });
  });

  describe('getConformiteSclDetail', () => {
    it('returns null when no STEU authorized', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([]);
      const result = await service.getConformiteSclDetail(123, ['STEU001']);
      expect(result).toBeNull();
    });

    it('delegates when authorized', async () => {
      roseauGateway.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionCode: 'STEU001', ouvrageDepollutionIdentifiant: 1 },
      ]);
      roseauGateway.findConformiteSclDetail.mockResolvedValue({} as ConformiteSclDetailRow);
      const result = await service.getConformiteSclDetail(123, ['STEU001']);
      expect(result).not.toBeNull();
      expect(roseauGateway.findConformiteSclDetail).toHaveBeenCalledWith(123, expect.any(Number));
    });
  });
});

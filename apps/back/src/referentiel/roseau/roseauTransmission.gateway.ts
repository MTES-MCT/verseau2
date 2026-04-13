import {
  TransmissionASRetardSclFilters,
  TransmissionASRetardSteuFilters,
  TransmissionASRetardSclRow,
  TransmissionASRetardSteuRow,
} from '@masa/masa.dto';

export interface RoseauTransmissionGateway {
  findTransmissionASRetardSteu(
    filters: TransmissionASRetardSteuFilters,
  ): Promise<{ data: TransmissionASRetardSteuRow[]; total: number }>;
  findTransmissionASRetardScl(
    filters: TransmissionASRetardSclFilters,
  ): Promise<{ data: TransmissionASRetardSclRow[]; total: number }>;
}

export const RoseauTransmissionGateway = Symbol('RoseauTransmissionGateway');

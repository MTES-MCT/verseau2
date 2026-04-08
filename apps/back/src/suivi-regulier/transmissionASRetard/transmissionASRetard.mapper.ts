import type { TransmissionASRetardSteuDto, TransmissionASRetardSclDto } from '@lib/dossier';
import type { TransmissionASRetardSteuRow, TransmissionASRetardSclRow } from '@masa/masa.dto';

export function mapTransmissionASRetardSteuRowToDto(row: TransmissionASRetardSteuRow): TransmissionASRetardSteuDto {
  const { deposant, mail, dateMailExploitant, ...dto } = row;
  return dto;
}

export function mapTransmissionASRetardSclRowToDto(row: TransmissionASRetardSclRow): TransmissionASRetardSclDto {
  const { deposant, mail, dateMailExploitant, ...dto } = row;
  return dto;
}

import { buildAgenceEauSftpRemotePaths } from './agenceEauSftpNomenclature';

describe('buildAgenceEauSftpRemotePaths', () => {
  it('matches agency names regardless of case', () => {
    expect(buildAgenceEauSftpRemotePaths('seine-normandie', 'depot.xml')).toEqual({
      zipPath: 'depot.xml.zip',
      ackPath: 'depot.xml.zip.ack',
    });
  });

  it('matches agency names regardless of accents', () => {
    expect(buildAgenceEauSftpRemotePaths('Rhône-Méditerranée', 'depot.xml')).toEqual({
      zipPath: 'depot.xml.zip',
      ackPath: 'depot.xml.zip.ack',
    });
  });

  it('matches agency names with extra spaces', () => {
    expect(buildAgenceEauSftpRemotePaths('  Rhin  -   Meuse  ', 'depot.xml', '1234')).toEqual({
      zipPath: 'DEPOT1234_depot.xml.zip',
      ackPath: 'ACK_DEPOT1234_depot.xml.zip',
    });
  });

  it('returns null when a DEPOT agency has no numeroDepotVerseau1', () => {
    expect(buildAgenceEauSftpRemotePaths('RHIN-MEUSE', 'depot.xml', null)).toBeNull();
  });

  it('returns null when the agency is not supported', () => {
    expect(buildAgenceEauSftpRemotePaths('ARTOIS-PICARDIE', 'depot.xml')).toBeNull();
  });
});

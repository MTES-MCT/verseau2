import { buildAgenceEauSftpRemotePaths } from './agenceEauSftpNomenclature';

describe('buildAgenceEauSftpRemotePaths', () => {
  it('matches agency names regardless of case', () => {
    expect(buildAgenceEauSftpRemotePaths('seine-normandie', 'depot.xml', '1234')).toEqual({
      zipPath: 'TEST_DEPOT1234_depot.xml.TEST',
      ackPath: 'TEST_DEPOT1234_depot.xml.ack.TEST',
    });
  });

  it('matches agency names regardless of accents', () => {
    expect(buildAgenceEauSftpRemotePaths('Rhône-Méditerranée', 'depot.xml', '1234')).toEqual({
      zipPath: 'TEST_DEPOT1234_depot.xml.TEST',
      ackPath: 'TEST_DEPOT1234_depot.xml.ack.TEST',
    });
  });

  it('matches agency names with extra spaces', () => {
    expect(buildAgenceEauSftpRemotePaths('  Rhin  -   Meuse  ', 'depot.xml', '1234')).toEqual({
      zipPath: 'TEST_DEPOT1234_depot.xml.TEST',
      ackPath: 'TEST_ACK_DEPOT1234_depot.xml.TEST',
    });
  });

  it('returns null when a supported agency has no numeroDepotVerseau1', () => {
    expect(buildAgenceEauSftpRemotePaths('SEINE-NORMANDIE', 'depot.xml', null)).toBeNull();
    expect(buildAgenceEauSftpRemotePaths('RHIN-MEUSE', 'depot.xml', null)).toBeNull();
  });

  it('returns null when the agency is not supported', () => {
    expect(buildAgenceEauSftpRemotePaths('ARTOIS-PICARDIE', 'depot.xml')).toBeNull();
  });
});

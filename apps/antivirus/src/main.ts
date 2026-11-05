import { lookup } from 'node:dns/promises';
import { loadConfig } from './config.ts';
import { createScannerServer } from './server.ts';

async function main() {
  const config = loadConfig(process.env);
  let host = config.host;
  if (config.production) {
    const addresses = await lookup(host, { all: true, family: 4 });
    if (addresses.length !== 1 || !/^10\.240\.[0-3]\.\d+$/.test(addresses[0]!.address)) {
      throw new Error('Private hostname must resolve to the single Scalingo private-network interface');
    }
    host = addresses[0]!.address;
  }
  const { server, abortActive } = createScannerServer(config, metric => console.log(JSON.stringify(metric)));
  server.on('error', () => {
    console.error('{"event":"server_error"}');
    process.exitCode = 1;
  });
  server.listen(config.port, host, () => console.log('{"event":"listening"}'));
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      abortActive();
      server.close();
      server.closeAllConnections();
    });
  }
}

void main().catch(() => {
  console.error('{"event":"startup_configuration_error"}');
  process.exitCode = 1;
});

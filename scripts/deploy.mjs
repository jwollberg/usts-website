/**
 * Build and publish the site in one command.
 *
 *   pnpm deploy
 *
 * Normally you should not need this: pushing to main publishes the site. Use it
 * when GitHub Actions is unavailable, or to ship without waiting for CI.
 *
 * The deployment token is read from Azure at run time and never stored here.
 * Requires `az login` with access to the USTS subscription.
 */
import { execFileSync, execSync } from 'node:child_process';

const SUB = '2f7fad7e-5796-4a12-a1b6-52db53dbacba';
const RG = 'rg-usts-web-cus';
const APP = 'usts-web';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

console.log('> building');
run('pnpm build');

console.log('\n> fetching the deployment token from Azure');
let token;
try {
  token = execFileSync(
    'az',
    ['staticwebapp', 'secrets', 'list', '--subscription', SUB, '-n', APP, '-g', RG,
     '--query', 'properties.apiKey', '-o', 'tsv'],
    { encoding: 'utf8', shell: true }
  ).trim();
} catch {
  console.error('\nCould not read the deployment token. Run `az login` and try again.');
  process.exit(1);
}
if (!token) {
  console.error('\nAzure returned an empty deployment token.');
  process.exit(1);
}

console.log('> deploying');
run('npx --yes @azure/static-web-apps-cli deploy ./dist --api-location ./api --env production', {
  env: { ...process.env, SWA_CLI_DEPLOYMENT_TOKEN: token },
});

console.log('\nDeployed. Worth running the checks against the live site:');
console.log('  node scripts/csp-check.mjs  https://ambitious-tree-058d7ee10.7.azurestaticapps.net');
console.log('  node scripts/text-check.mjs https://ambitious-tree-058d7ee10.7.azurestaticapps.net');

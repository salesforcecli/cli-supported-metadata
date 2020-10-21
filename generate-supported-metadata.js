const fs = require('fs');
const got = require('got');
const shell = require('shelljs');
const cliSupportedTypes = require('salesforce-alm/metadata/metadataTypeInfos.json').typeDefs;

const version = JSON.parse(shell.exec('npm view salesforce-alm dist-tags --json').stdout)['latest-rc'];
const majorVersion = version.split('.')[0];

shell.exec('yarn add salesforce-alm@latest-rc');

(async () => {
  const coverageReportResponse = await got(`https://mdcoverage.secure.force.com/services/apexrest/report?version=${majorVersion}`);
  const coverageReportTypes = JSON.parse(coverageReportResponse.body).types

  const cliSupportedTypeKeys = Object.keys(cliSupportedTypes);
  const allMetadataTypeKeys = Object.keys(coverageReportTypes);

  const missingMetadataTypes = [];

  cliSupportedTypeKeys.forEach(type => {
    if (coverageReportTypes[type]) {
      coverageReportTypes[type].channels.cli = true;
    } else {
      missingMetadataTypes.push(type);
    }
  });

  let contents = `# Supported CLI Metadata Types

This list compares metadata types found in the [Metadata Coverage Report v${majorVersion}](https://developer.salesforce.com/docs/metadata-coverage/${majorVersion}) with the metadata info file shipped with [salesforce-alm@${version}](https://www.npmjs.com/package/salesforce-alm).

Currently, there are ${cliSupportedTypeKeys.length - missingMetadataTypes.length}/${allMetadataTypeKeys.length} supported metadata types in Salesforce CLI. We are constantly adding more support with the eventual goal of zero metadata gaps. For status on any existing gaps, please search or file an issue in the [Salesforce CLI issues only repo](https://github.com/forcedotcom/cli/issues).

|Metadata Type|Salesforce CLI Support|Source Tracking Support|Metadata API Support|
|-|:-:|:-:|:-:|
`;
  allMetadataTypeKeys.sort().forEach(type => {
    const channels = coverageReportTypes[type]?.channels;
    if (channels) {
      contents += `|${type}|${channels.cli ? '✅' : ''}|${channels.sourceTracking ? '✅' : ''}|${channels.metadataApi ? '✅' : ''}|\n`
    }
  });

  contents += `

## Missing Types

Found ${missingMetadataTypes.length} types supported in the Salesforce CLI but not found in the metadata Coverage Report.
`;

missingMetadataTypes.sort().forEach(type => contents += ` * ${type}\n`)

  fs.writeFileSync(__dirname + '/README.md', contents);
  console.log('Wrote README.md');

  shell.exec(`git add .`);
  if (shell.exec(`git commit -am "chore: adding types for salesforce-alm@${version}"`).code !== 0) {
    shell.echo('Error: Git commit failed - usually nothing to commit which means there are no new metadata type support added in this version of salesforce-alm');
  }
})().catch(console.error);

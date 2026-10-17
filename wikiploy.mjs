import { Wikiploy, DeployConfig, setupSummary } from 'wikiploy';
import * as botConfig from './bot.config.mjs';

const ployBot = new Wikiploy(botConfig);
ployBot.site = 'commons.wikimedia.org';

const files = [
	['src/VisualFileChange.css', 'Gadget-VisualFileChange.css'],
	['src/VisualFileChange.js', 'Gadget-VisualFileChange.js'],
	...['cfg', 'core', 'exec', 'install', 'ui'].map(name => [
		`src/${name}.js`,
		`Gadget-VisualFileChange.js/${name}.js`
	])
];

const configs = files.map(([src, dst]) => new DeployConfig({
	src,
	dst: `MediaWiki:${dst}`,
	nowiki: src.endsWith('.js')
}));

try {
	await setupSummary(ployBot);
	await ployBot.deploy(configs);
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}

// Fails fast with a readable message instead of a cryptic SyntaxError from the
// toolchain (Vite 8 / rolldown / SvelteKit 3 need Node >= 22.17).
// Kept as plain CommonJS so it runs even on very old Node versions.
var required = [22, 17];
var current = process.versions.node.split('.').map(Number);

if (current[0] < required[0] || (current[0] === required[0] && current[1] < required[1])) {
	console.error(
		'\n  Node ' + process.versions.node + ' is too old. This project needs Node ' + required.join('.') + '+.\n' +
		'  Run `fnm use` in the project folder (reads .nvmrc), or see README.md for automatic switching.\n'
	);
	process.exit(1);
}

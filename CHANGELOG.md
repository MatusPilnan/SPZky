# Changelog

All notable changes to this project. Versions follow [Semantic Versioning](https://semver.org/);
entries are generated from [Conventional Commits](https://www.conventionalcommits.org/) by `npm run release`.

## [0.3.2](https://github.com/MatusPilnan/SPZky/compare/v0.3.1...v0.3.2) - 2026-11-14

### Bug fixes

- **ui:** give all plate badges the same width without clipping ([26c078f](https://github.com/MatusPilnan/SPZky/commit/26c078f313b97b639fe275442064b4d05af0d3d7))

## [0.3.1](https://github.com/MatusPilnan/SPZky/compare/v0.3.0...v0.3.1) - 2026-11-14

### Bug fixes

- **data:** remove Slovak district codes that were never issued ([838fb70](https://github.com/MatusPilnan/SPZky/commit/838fb70f4947fb532a74810e831f3faa615571e7))

### Other changes

- add a region data checklist for new countries ([9c54ac1](https://github.com/MatusPilnan/SPZky/commit/9c54ac1ced282e236e5401251c3888c121054034))
- **plan:** mark phases 4 and 5 as released in v0.3.0 ([92d02a7](https://github.com/MatusPilnan/SPZky/commit/92d02a7bf1d7e0d7fee1826ff2f5c2e154d2dcd1))

## [0.3.0](https://github.com/MatusPilnan/SPZky/compare/v0.2.0...v0.3.0) - 2026-11-13

### Features

- **progress:** home overview and per-country progress screens ([88a789a](https://github.com/MatusPilnan/SPZky/commit/88a789ad9faad832d53748ddfc461cc413b80e17))
- **plates:** nationwide plates, plate types and country choice by GPS ([0417178](https://github.com/MatusPilnan/SPZky/commit/0417178e6bbbffd86df93e1db2beae93c866c920))
- **geo:** offline country lookup from SK/CZ outlines ([53e0ef6](https://github.com/MatusPilnan/SPZky/commit/53e0ef6d9b23ff3502f54bc773bc90aafd7e03f4))
- **settings:** option to return home after adding, switch controls ([ca458fe](https://github.com/MatusPilnan/SPZky/commit/ca458feeb49bf608c718cf115e0860bc57a0d862))
- **pwa:** auto-close the offline-ready message with a countdown bar ([f08bddd](https://github.com/MatusPilnan/SPZky/commit/f08bddddf4329df4dcaf49dcf96fa7f4d9d76504))

### Bug fixes

- **progress:** keep a details sheet open when reopened right after closing ([b2985f1](https://github.com/MatusPilnan/SPZky/commit/b2985f1f5a069006b1d09ad9187f21099a678a03))

### Other changes

- **smoke:** fix race conditions on slow CI runners ([c0bd59c](https://github.com/MatusPilnan/SPZky/commit/c0bd59ce4644e64159c220e795d3557143825cc5))
- describe the progress screens and mark phase 5 done ([e3dc5de](https://github.com/MatusPilnan/SPZky/commit/e3dc5def44fb9be69a2e11537c39a11dfde613e2))
- describe nationwide plates, country choice and new pitfalls ([c2ad789](https://github.com/MatusPilnan/SPZky/commit/c2ad789214b6094f971d652fe296910b58a67905))
- **plan:** mark phases 2 and 3 as released in v0.2.0 ([1b669ae](https://github.com/MatusPilnan/SPZky/commit/1b669aeea796ec815e0e61f92897325030854d45))

## [0.2.0](https://github.com/MatusPilnan/SPZky/compare/v0.1.0...v0.2.0) - 2026-11-13

### Features

- **pwa:** support serving the app from a sub-path ([38141bb](https://github.com/MatusPilnan/SPZky/commit/38141bbd4d8f3c3d506b522b153c73400fea5ae6))
- plate entry with auto-detection, quick mode, editing and location ([0a61ff8](https://github.com/MatusPilnan/SPZky/commit/0a61ff8796150fe42a8dc86be1386f78d0c6719c))
- **plates:** add SK/CZ region data and plate detection ([80f8983](https://github.com/MatusPilnan/SPZky/commit/80f89836a7662fdaf6b5c4194914ab1ba7267152))

### Bug fixes

- **build:** fail fast with a clear message on unsupported Node versions ([5b59ecd](https://github.com/MatusPilnan/SPZky/commit/5b59ecd98787db9b8e5a4b66ab5c1ae290761b43))

### Other changes

- **release:** keep release notes in CHANGELOG.md ([929b833](https://github.com/MatusPilnan/SPZky/commit/929b833e9e73c29950148a49e9f1b2b0e74fe7aa))
- document deployment, releasing and one-time GitHub setup ([6fa5cdb](https://github.com/MatusPilnan/SPZky/commit/6fa5cdbc0d1a781044549ec4c9996fd482c26a3b))
- add CI and GitHub Pages release workflows ([cf4416b](https://github.com/MatusPilnan/SPZky/commit/cf4416bb21aeea04d9b10224e0dd234ef3187ea6))
- **smoke:** cover base path, service worker scope and offline loading ([0a806b4](https://github.com/MatusPilnan/SPZky/commit/0a806b4642b7ff4da572969331ce1ddc0e251e7d))
- **plan:** plan nationwide plates and country choice by GPS ([0eb7b5e](https://github.com/MatusPilnan/SPZky/commit/0eb7b5e7de073948d5c9462d8440d3553c44f91a))
- **plan:** add deployment phase for GitHub Pages and CI ([5924d74](https://github.com/MatusPilnan/SPZky/commit/5924d7482c71d014401745c71f47282ad19c6a37))
- keep project plan and working notes in the repo ([3459d1e](https://github.com/MatusPilnan/SPZky/commit/3459d1e7d6340e9c9fde36aa354f31e8f07dae14))
- add browser smoke test ([ff83abd](https://github.com/MatusPilnan/SPZky/commit/ff83abdf7180328569cc19fa900981c0bf925808))
- fix fnm setup in Windows PowerShell for non-ASCII user paths ([a17eb79](https://github.com/MatusPilnan/SPZky/commit/a17eb79fe0286b6f89bbe9e991309ccb8dca3d71))
- document fnm setup, commit and versioning conventions ([0eaaefb](https://github.com/MatusPilnan/SPZky/commit/0eaaefb83ea1278ac4b3a94607a7824973cc860a))

## 0.1.0 - 2026-11-08

### Features

- Scaffold offline-first PWA for license plate hunting ([e8b1f75](https://github.com/MatusPilnan/SPZky/commit/e8b1f75e78739aec283d6c5e0d1fb445dc68e571))

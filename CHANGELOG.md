# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/). Each `vX.Y.Z` tag deploys the site and publishes its
section below as the GitHub release notes.

## [Unreleased]

## [4.0.2] - 2026-10-20

### Added

- Link preview image for the home page with Open Graph and Twitter card tags.

### Fixed

- Music starts on iPhone Safari: the audio is unlocked from the tap and plays with the silent switch on.

### Removed

- German and Italian languages.

## [4.0.1] - 2026-10-19

### Fixed

- Deploys upload the release with scp and keep the SSH session open until activation ends, so
  Infomaniak no longer cuts it off and the full output shows in the workflow log.

## [4.0.0] - 2026-10-18

Full rewrite of the portfolio.

### Added

- Content stored in MySQL through Prisma with an idempotent seed.
- Catppuccin Mocha theme in monospace with art drawn as real text: ASCII fields, fitted name, console
  logo and a glitching glyph trail cursor.
- Clickable interests with homelab, printer, shader, logos, FPV and modular synth panels.
- Music with a bass reactive eye and a wall reveal intro.
- Blog with tagged posts, generated text art, view counts and feeds.
- Admin space with a single account, recovery code, todo board and README cards.
- Deployment to Infomaniak on each version tag, with database migrations and GitHub releases.

### Changed

- Moved from Next.js to TanStack Start for a smaller bundle and faster server.

### Security

- Rate limits on auth and blog views per client, and cross site server calls blocked.

[Unreleased]: https://github.com/elwan-l1/portfolio/compare/v4.0.2...HEAD
[4.0.2]: https://github.com/elwan-l1/portfolio/compare/v4.0.1...v4.0.2
[4.0.1]: https://github.com/elwan-l1/portfolio/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/elwan-l1/portfolio/compare/v3.0.0...v4.0.0

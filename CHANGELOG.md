# Changelog

All notable changes to the Playbook UI VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Component autocomplete for Rails/ERB (`pb_rails("...")`)
- Component autocomplete for React (JSX/TSX)
- Prop autocomplete based on component metadata
- Hover documentation for components and props
- Prop validation and diagnostics

## [0.1.0] - 2026-01-14

### Added

- Initial extension scaffold
- Rails/ERB snippets for common Playbook components:
  - Button, Card, Flex, Body, Title, Avatar, Icon
- React snippets for common Playbook components:
  - Button, Card, Flex, Body, Title, Avatar, Icon, Import
- Component metadata structure in `data/playbook.json`
- Extension activation for Ruby, ERB, JavaScript, JSX, TypeScript, TSX
- Debug configuration for local development
- Comprehensive README with usage and development instructions

### Technical

- TypeScript-based extension using VS Code Extension API
- Static metadata approach (no runtime introspection)
- Snippet contributions registered in `package.json`
- TODO comments for future autocomplete and hover providers

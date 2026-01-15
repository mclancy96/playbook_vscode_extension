# Playbook UI VS Code Extension

Developer experience enhancements for the [Playbook UI](https://github.com/powerhome/playbook) design system.

## Overview

Playbook UI is an open-source design system built and maintained internally, used primarily in our Ruby on Rails monolith for both Rails views (ERB/Ruby) and React components (JSX/TSX). This VS Code extension improves the authoring experience by providing intelligent snippets, autocomplete, and documentation.

## Features

### ✅ Implemented

#### Snippets

Intelligent code snippets for common Playbook components:

**Rails/ERB:**

- `pb_button` → Button component
- `pb_card` → Card component
- `pb_flex` → Flex layout
- `pb_body` → Body text
- `pb_title` → Title/heading
- `pb_avatar` → Avatar
- `pb_icon` → Icon

**React (JSX/TSX):**

- `pbButton` → Button component
- `pbCard` → Card component
- `pbFlex` → Flex layout
- `pbBody` → Body text
- `pbTitle` → Title/heading
- `pbAvatar` → Avatar
- `pbIcon` → Icon
- `pbImport` → Import statement

All snippets include tab stops and IntelliSense-friendly prop suggestions.

### 🚧 Planned Features

- **Autocomplete**: Intelligent component and prop suggestions based on context
- **Hover Documentation**: Inline documentation for components and props
- **Prop Validation**: Warnings for invalid prop names or values
- **Go to Definition**: Jump to Playbook documentation

## Supported Languages

- Ruby (`.rb`)
- ERB (`.erb`)
- JavaScript React (`.jsx`)
- TypeScript React (`.tsx`)

## Installation & Development

### Prerequisites

- Node.js 18.x or higher
- VS Code 1.75.0 or higher

### Local Development

1. **Clone and install:**

   ```bash
   cd playbook_extension
   npm install
   ```

2. **Compile TypeScript:**

   ```bash
   npm run compile
   ```

   Or watch for changes:

   ```bash
   npm run watch
   ```

3. **Run the extension:**
   - Press `F5` in VS Code to open a new Extension Development Host window
   - Or use the "Run Extension" debug configuration

4. **Test snippets:**
   - Create a `.erb` or `.tsx` file
   - Type a snippet prefix (e.g., `pb_button` or `pbButton`)
   - Press Tab to expand

## Architecture

### Directory Structure

```
playbook_extension/
├── src/
│   └── extension.ts        # Extension entry point
├── snippets/
│   ├── rails.json          # Rails/ERB snippets
│   └── react.json          # React (JSX/TSX) snippets
├── data/
│   └── playbook.json       # Component metadata (for future autocomplete/hover)
├── .vscode/
│   └── launch.json         # Debug configuration
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript configuration
└── README.md
```

### Design Principles

1. **Static metadata over dynamic parsing**: No attempt to parse Playbook source code or introspect at runtime
2. **Incremental development**: Snippets first, then autocomplete and hover
3. **Simplicity**: Minimal dependencies, straightforward implementation
4. **Maintainability**: Clear code structure, extensive TODO comments for future work

## Extending the Extension

### Adding New Snippets

Edit `snippets/rails.json` or `snippets/react.json`:

```json
{
  "snippet_name": {
    "prefix": "trigger_text",
    "body": [
      "line 1 with ${1:placeholder}",
      "line 2 with ${2|option1,option2|}"
    ],
    "description": "What this snippet does"
  }
}
```

### Adding Component Metadata

Edit `data/playbook.json` to add or update component definitions:

```json
{
  "components": {
    "YourComponent": {
      "rails": "your_component",
      "react": "YourComponent",
      "description": "Component description",
      "category": "layout|typography|actions|content",
      "props": {
        "propName": {
          "type": "string|enum|boolean|number|function",
          "description": "Prop description",
          "required": true,
          "default": "defaultValue"
        }
      }
    }
  }
}
```

This metadata will be used for future autocomplete and hover features.

## Contributing

### Before You Start

- Familiarize yourself with the [VS Code Extension API](https://code.visualstudio.com/api)
- Review `src/extension.ts` for TODO comments marking planned features
- Check `data/playbook.json` for the component metadata schema

### Development Workflow

1. Make changes to source files
2. Run `npm run compile` (or keep `npm run watch` running)
3. Press F5 to test in Extension Development Host
4. Iterate and test thoroughly

## Roadmap

### Phase 1: Snippets ✅

- [x] Rails/ERB snippets
- [x] React snippets
- [x] Component metadata structure

### Phase 2: Autocomplete (Next)

- [ ] Component name completion for `pb_rails("...")`
- [ ] Component name completion for `<Component`
- [ ] Prop name completion
- [ ] Prop value completion for enums

### Phase 3: Documentation

- [ ] Hover provider for components
- [ ] Hover provider for props
- [ ] Link to Playbook docs

### Phase 4: Validation

- [ ] Diagnostic warnings for invalid props
- [ ] Required prop validation

## License

MIT

## Support

For issues or questions:

- Internal Slack: #playbook-ui
- GitHub Issues: (repository URL when published)

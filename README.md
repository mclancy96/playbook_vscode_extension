# Playbook UI VS Code Extension

Developer experience enhancements for the [Playbook UI](https://github.com/powerhome/playbook) design system.

## Features

### ✨ Smart Snippets for 150+ Components

**Rails/ERB Components** - Type `pb_<component_name>` and press Tab:

- `pb_button` → Button with variant, size, and prop suggestions
- `pb_card` → Card component with padding and spacing
- `pb_flex` → Flex layout with alignment options
- `pb_avatar` → Avatar component
- `pb_advanced_table` → Advanced Table
- `pb_date_picker` → Date Picker
- ...and 140+ more!

**React Components** - Type `pb<ComponentName>` and press Tab:

- `pbButton` → Button component
- `pbCard` → Card component
- `pbFlex` → Flex layout
- `pbAvatar` → Avatar component
- `pbAdvancedTable` → Advanced Table
- `pbDatePicker` → Date Picker
- `pbImport` → Import statement for any component
- ...and 140+ more!

### 📚 Hover Documentation

**Inline documentation as you code**

Hover over any Playbook component or prop to see:

- Component description and usage examples
- Available props with types and valid values
- Default values and required props
- Both Rails and React syntax examples

Works for:

- Component names: `pb_rails("button", ...)` or `<Button />`
- Prop names in both Rails and React syntax
- Global props like padding, margin, display, etc.

### 🎯 Intelligent Autocomplete

**Context-aware suggestions as you type**

Get intelligent autocomplete for:

**Component Names**

- Rails: Type `pb_rails("bu...)` → See button, button_toolbar with descriptions
- React: Type `<Bu...` → See Button, ButtonToolbar with snippets

**Prop Names**

- Rails: Type inside `props: {` → See all available props for that component
- React: Type inside component tags → See component-specific and global props
- Includes 60+ global props: padding, margin, dark, display, position, etc.

**Prop Values**

- Automatic suggestions for enum values
- Default values prioritized first
- Shows all valid options with documentation

**Global Props Available Everywhere:**

- Spacing: padding, margin (with all directional variants)
- Layout: display, position, vertical_align, text_align
- Flexbox: flex_direction, align_items, justify_content
- Styling: dark, shadow, border_radius, cursor
- And 50+ more!

### ⚠️ Real-Time Validation

**Catch errors before you run your code**

Get instant feedback on:

- Unknown component names
- Invalid prop names
- Invalid enum values (e.g., `variant: "invalid"` when only `primary`, `secondary`, `link` are valid)
- Works across single-line and multi-line props

Errors appear as:

- Yellow squiggly underlines in your code
- Problems panel entries with helpful messages
- Suggestions for valid values

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for **"Playbook UI Helper"**
4. Click **Install**

### From Cursor Marketplace

1. Open Cursor
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for **"Playbook UI Helper"**
4. Click **Install**

### Auto-Activation

The extension automatically activates when you open:

- Ruby files (`.rb`)
- ERB files (`.erb`, `.html.erb`)
- JavaScript React (`.jsx`)
- TypeScript React (`.tsx`)

## Quick Start

### Rails/ERB Example

```erb
<!-- Type 'pb_button' and press Tab -->
<%= pb_rails("button", props: {
  text: "Click Me",
  variant: "primary",    <!-- Autocomplete shows: primary, secondary, link -->
  size: "md"             <!-- Autocomplete shows: sm, md, lg -->
}) %>
```

### React/JSX Example

```jsx
// Type 'pbButton' and press Tab
<Button
  text="Click Me"
  variant="primary"      // Autocomplete shows valid variants
  size="md"             // Autocomplete shows valid sizes
/>
```

### Using Autocomplete

1. **Start typing** a component name or prop
2. **Press Ctrl+Space** to trigger suggestions (or they appear automatically)
3. **Use arrow keys** to navigate options
4. **Press Enter or Tab** to insert

### Viewing Documentation

1. **Hover** over any component or prop name
2. **Read the popup** showing types, values, and examples
3. **Cmd/Ctrl+Click** to open full docs in browser

## Supported Languages

- Ruby (`.rb`)
- ERB (`.erb`, `.html.erb`)
- JavaScript React (`.jsx`)
- TypeScript React (`.tsx`)

## Links

- [Playbook UI Documentation](https://playbook.powerhrg.com/)
- [GitHub Repository](https://github.com/ClancyTools/playbook_vscode_extension)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=clancytools.playbook-vscode)
- [Report an Issue](https://github.com/ClancyTools/playbook_vscode_extension/issues)

## Support

For questions or issues:

- [GitHub Issues](https://github.com/ClancyTools/playbook_vscode_extension/issues)

## License

MIT License - See [LICENSE](LICENSE) for details

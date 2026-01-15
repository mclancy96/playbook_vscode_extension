# Quick Start Guide

## Getting Started in 3 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

Or run in watch mode while developing:

```bash
npm run watch
```

### 3. Launch Extension Development Host

Press `F5` in VS Code, or:

- Open the Run view (Cmd+Shift+D / Ctrl+Shift+D)
- Select "Run Extension"
- Click the green play button

A new VS Code window will open with the extension loaded.

### 4. Test the Snippets

**In an ERB file:**

1. Create a new file: `test.html.erb`
2. Type `pb_button` and press Tab
3. You should see the Button snippet expand

**In a React file:**

1. Create a new file: `Test.tsx`
2. Type `pbButton` and press Tab
3. You should see the React Button snippet expand

## Available Snippets

### Rails/ERB Triggers

- `pb_button` - Button component
- `pb_card` - Card component
- `pb_flex` - Flex layout
- `pb_body` - Body text
- `pb_title` - Title
- `pb_avatar` - Avatar
- `pb_icon` - Icon

### React Triggers

- `pbButton` - Button component
- `pbCard` - Card component
- `pbFlex` - Flex layout
- `pbBody` - Body text
- `pbTitle` - Title
- `pbAvatar` - Avatar
- `pbIcon` - Icon
- `pbImport` - Import statement

## Making Changes

1. Edit files in `src/`, `snippets/`, or `data/`
2. Recompile: `npm run compile` (or automatic if watching)
3. Reload the Extension Development Host: Cmd+R / Ctrl+R in the development window
4. Test your changes

## Troubleshooting

**Snippets not showing?**

- Ensure you're in the correct file type (.erb, .tsx, etc.)
- Check that the extension activated (look for "Playbook UI extension is now active" in Debug Console)

**TypeScript errors?**

- Run `npm run compile` to see full error output
- Check that all dependencies are installed: `npm install`

**Extension not loading?**

- Check the Debug Console (Cmd+Shift+Y / Ctrl+Shift+Y) for errors
- Verify `out/extension.js` was created after compilation

## Next Steps

- Review `src/extension.ts` for TODO comments
- Explore `data/playbook.json` structure
- See README.md for the full roadmap

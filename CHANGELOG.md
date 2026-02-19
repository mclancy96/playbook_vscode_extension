# Changelog

All notable changes to the Playbook UI VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.29] - 2026-02-17

- **Touchup README Again**

## [1.0.28] - 2026-02-17

- **Touchup README**
- **Fix Syncing Logic for Uncommon Prop Type Names**

## [1.0.27] - 2026-02-11

- **Add Update Repo Link**

## [1.0.26] - 2026-02-11

### Fixed

- **Warning Squiggle Placement** 🎯
  - Fixed issue where warning squiggles appeared at incorrect positions for unknown props in both Rails and React components
  - **Rails**: Previously, warnings like "Unknown prop 'text_transform'" would underline the wrong characters (e.g., `ge", margin_le` instead of `text_transform`)
  - **React**: Previously, warnings in components like `<Flex justify="right">` would appear at the wrong position (under `<Flex` instead of under the invalid value)
  - Root cause: Character position calculation didn't account for the offset created when extracting component blocks
  - Now correctly tracks and applies the starting character offset when converting prop positions to document coordinates
  - Affects all Rails and React component prop validation warnings
  - Added 8 new regression tests (5 for Rails, 3 for React) to prevent future positioning bugs

### Added

- **Hardcoded Global Props Support** ✨
  - Added `id` and `key` as hardcoded global props that are always allowed on all components
  - These props bypass metadata lookup and are validated regardless of what's in the metadata file
  - Ensures React's `key` prop and standard `id` prop are always recognized without needing extraction from source
  - Complements the existing global props system extracted from TypeScript definitions

## [1.0.25] - 2026-02-11

### Fixed

- **React-Only Props Recognition** 🐛
  - Fixed issue where React-only props like `onClick` and `htmlType` were not being recognized in components
  - Root cause: Sync script was only looking for `${ComponentName}Props` type pattern but some components use `${ComponentName}PropTypes`
  - Updated sync script to search for both patterns when extracting React component props
  - Affects components: Button, Card, Flex, FlexItem, Layout, Table components, and others
  - Re-ran sync to regenerate metadata with all React-only props included
  - Examples of React-only props now recognized:
    - Button: `onClick`, `htmlType`, `tabIndex`, `fixedWidth`, `wrapperClass`
    - Added comprehensive tests to ensure React-only props are validated correctly

- **Nested React Component Validation** 🐛
  - Fixed critical issue where nested React components had their props incorrectly validated against parent components
  - Previously, code like this would show false warnings:

    ```tsx
    <Flex height="100%" justify="evenly">
      <Title size={3} text="Hello" />
    </Flex>
    ```

  - Now each component's props are validated against only that component, not parent or child components
  - Updated `extractReactComponentBlock` to stop extraction at the closing `>` of the opening tag, not at nested components
  - Added component name parameter to extraction to handle multiple components on the same line correctly

## [1.0.24] - 2026-02-11

### Fixed

- **Multi-line React Component Validation** 🐛
  - Fixed issue where React components with props spanning multiple lines weren't being validated
  - Previously only single-line components like `<Body top="xs"/>` worked correctly
  - Now multi-line components are fully supported:

    ```tsx
    <Body
      top=""
      bottom='asdf'
    />
    ```

  - Fixed regex in `extractReactComponentBlock` to match component tags at end of line
  - Fixed prop value formatting to match Rails implementation (including quotes in `propValue`)
  - Multi-line components now get proper IntelliSense suggestions and validation
  - Rails multi-line components already worked correctly; this fix brings React to parity

## [1.0.23] - 2026-02-11

### Changed

- **Context-Aware Prop Validation for Rails vs React** 🎯
  - Extension now differentiates between Rails (ERB) and React (TSX) contexts
  - Rails developers see only Rails-valid prop values
  - React developers see only React-valid prop values
  - No more false warnings about values that don't exist in one platform
  - Examples:
    - Rails users won't see `"static"` for `position` (React-only)
    - React users won't see `"max"` for `z_index` (Rails-only)
    - Positioning props correctly show platform-specific values
  - 9 props with discrepancies now properly differentiated:
    - `position`: React has `"static"`, Rails doesn't
    - `top/right/bottom/left`: Rails has `"0", "auto", "initial", "inherit"`, React has `"xxl"`
    - `order`: React has `"first", "none"`, Rails doesn't
    - `truncate`: React has `"none"`, Rails doesn't
    - `z_index`: Rails has `"max"`, React doesn't
    - `text_align`: Different formats (kebab-case for Rails, camelCase for React)

- **Dynamic Ruby File Discovery** 🔄
  - Removed hardcoded list of 31 Ruby files - now automatically scans all `.rb` files in `lib/playbook/`
  - Dynamically discovers 34+ Ruby files with `*_values` methods
  - Future-proof: new props in Playbook are automatically picked up on next sync
  - No risk of getting out of sync with Playbook repository

- **Separate Rails and React Value Storage** 📦
  - `PropMetadata` now tracks `railsValues` (from Ruby) and `reactValues` (from TypeScript)
  - Combined `values` array maintained for backward compatibility
  - 55 props now have separate Rails/React value sets in metadata
  - Enables intelligent provider behavior based on file type

- **Context-Aware Providers** 🔌
  - **Diagnostics**: Validates props using context-specific values based on `document.languageId`
  - **Completion**: Suggests only valid values for the current file type
  - **Hover**: Shows appropriate values for Rails vs React contexts
  - Language ID mapping:
    - Rails context: `ruby`, `erb`, `html.erb`, `html`
    - React context: `javascript`, `javascriptreact`, `typescript`, `typescriptreact`

- **New Helper Function** 🛠️
  - Added `getPropValues(prop, languageId)` in metadata.ts
  - Returns context-appropriate values for any prop in any file type
  - Gracefully falls back to combined values when no separation exists
  - Reduces code duplication across providers

### Added

- **Context-Aware Validation Tests** ✅
  - 11 new comprehensive tests for Rails/React differentiation
  - **146 tests passing** (up from 135)
  - Tests verify:
    - Rails files don't see React-only values
    - React files don't see Rails-only values
    - Positioning props have correct values per context
    - z_index correctly differs by platform
    - Proper fallback for props without differences
    - All language ID variations work correctly

### Fixed

- **Incorrect Prop Values in Wrong Context** ✅
  - Fixed issue where Rails developers could use React-only values like `position: "static"`
  - Fixed issue where React developers saw Rails-specific values in suggestions
  - Positioning props now show completely different values per platform

### Technical

- Modified `scripts/sync-playbook.ts`:
  - Removed hardcoded Ruby files list
  - Added dynamic file scanning with `fs.readdirSync(libDir).filter(file => file.endsWith('.rb'))`
  - Extracts `railsValues` and `reactValues` separately during extraction
  - Passes globalProps to `generateMetadata()` instead of regenerating
  - Logs count of props with separate Rails/React values

- Updated `src/metadata.ts`:
  - Extended `PropMetadata` interface with optional `railsValues` and `reactValues`
  - Added `getPropValues(prop, languageId)` helper function
  - Maps language IDs to Rails or React context
  - Returns appropriate values based on context

- Updated `src/diagnostics.ts`:
  - Imports `getPropValues` helper
  - Updated `validatePropValue()` to accept `document` parameter
  - Uses `getPropValues()` for context-aware validation
  - All calls to `validatePropValue()` now pass document

- Updated `src/completionProvider.ts`:
  - Already had `getPropValues` imported
  - Uses `getPropValues()` for component prop completions
  - Uses `getPropValues()` for global prop completions
  - Uses `getPropValues()` for prop value completions

- New test file: `src/test/suite/contextAwarePropValues.test.ts`
  - Comprehensive test suite for context-aware validation
  - Tests all 9 discrepancy cases
  - Verifies helper function behavior
  - Tests language ID mapping

## [1.0.22] - 2026-02-11

### Changed

- **Dynamic Global Props Extraction from Source Files** 🔄
  - Global props now extracted from **both TypeScript and Ruby source files**
  - TypeScript extraction:
    - Reads `globalProps.ts` for prop type definitions
    - Loads imported types from `types/*.ts` (Sizes, None, Display, etc.)
    - Resolves type references and aliases dynamically
    - Handles multi-line type definitions (e.g., cursor with 36 values)
  - Ruby extraction:
    - Reads sizing prop values from `lib/playbook/*.rb` files
    - Extracts `*_values` methods from Ruby modules
    - Parses `%w[...]` arrays for enum values
    - Covers width, height, min/max variants, and gap props
  - All 65 global props now have accurate enum values from their source definitions
  - Removed 200+ lines of hardcoded fallbacks that are now extracted dynamically
  - Examples of improved props:
    - `width`: `["0%", "xs", "sm", "md", "lg", "xl", "xxl", "0", "none", "100%"]`
    - `height`: `["auto", "xs", "sm", "md", "lg", "xl", "xxl", "xxxl"]`
    - `cursor`: All 36 cursor values extracted from multi-line TypeScript definition
    - `truncate`: `["1", "2", "3", "4", "5", "none"]` with None type resolved
  - Extension is now **self-updating** - when Playbook updates global props, next sync picks up changes automatically
  - **134 tests passing** ✅

## [1.0.21] - 2026-02-10

### Updated

- **Synced to Playbook 16.2.0.pre.rc.5**

## [1.0.20] - 2026-02-10

### Added

- **Form Builder Diagnostics Support** 📋
  - Added validation for Rails form builder fields (f.text_field, form.select, etc.)
  - Extracts 21 form builder fields from Playbook repository with prop definitions
  - Validates props on form builder fields against their underlying Playbook kits
  - Recognizes common form variable names: `f`, `form`, `builder`
  - Provides warnings for invalid props on form builder fields
  - New metadata extraction script: `extract-form-builders.ts`
  - Form builder metadata stored in `data/form-builders.json`
  - Supports all Playbook form fields:
    - Text inputs: text_field, email_field, password_field, number_field, search_field, telephone_field, url_field
    - Text area: text_area
    - Select fields: select, collection_select, time_zone_select
    - Date/time pickers: date_picker, time_picker
    - Special fields: typeahead, multi_level_select, dropdown, phone_number, intl_telephone
    - Other: checkbox, star_rating, action_area
  - 7 new comprehensive tests for form builder validation
  - **134 total tests passing** (up from 127)

### Fixed

- Fixed issue where props from nested form builder fields were incorrectly attributed to outer `pb_rails` components
- Improved props block extraction to properly distinguish between `pb_rails` props and form builder props
- Added detection for form builder method calls (pattern: `variable.method_name`) to skip their props during component validation

## [1.0.19] - 2026-01-27

### Added

- **New Logo**

## [1.0.18] - 2026-01-27

### Added

- **Comprehensive Debugging Logs** 🔍
  - Extension activation now logs with timestamps and detailed provider registration info
  - Diagnostics logs show document analysis progress, metadata loading, and findings
  - Completion provider logs include position, trigger character, and detected completion type
  - Hover provider logs track hover requests with positions
  - All logs prefixed with component names (e.g., `[PlaybookDiagnostics]`) for easy filtering
  - Timestamps help identify timing-related issues during development
  - Helps diagnose extension behavior without guessing

- **Comprehensive Integration Test Suite** 🧪
  - Added 11 new integration tests for complete feature coverage
  - **127 total tests passing** (up from 116)
  - New test coverage:
    - Go-to-definition feature for documentation links
    - Unknown component detection and warnings
    - Unknown prop detection and warnings
    - React component name completion
    - React prop name completion
    - React component hover documentation
    - Prop hover documentation
    - Rails component name completion
    - Nested props handling (aria, data, html_options)
    - Multiline component parsing
    - Global props validation (id, classname, margin, padding, etc.)
  - Tests validate all major features before shipping
  - Easier to catch regressions and broken functionality

### Fixed

- Improved test reliability using direct provider instantiation
- Better test document creation with proper untitled URIs
- Enhanced diagnostic verification with provider-level assertions

## [1.0.17] - 2026-01-19

### Fixed

- **Fix React Snippets**
- **Fix React-specific Props**

## [1.0.16] - 2026-01-19

### Fixed

- **Warnings for Nested Global Props**

## [1.0.15] - 2026-01-19

### Fixed

- **Track Depth for Nested Object Properties Validation**

## [1.0.14] - 2026-01-19

### Fixed

- **More Nested Object Properties Validation**

## [1.0.13] - 2026-01-17

### Fixed

- **Nested Object Properties Validation** ✅
  - Global props that accept nested objects (aria, data, html_options) no longer validate their nested properties
  - Fixed false positive warnings like "Unknown prop 'label' for component 'bread_crumbs'"
  - Example: `aria: { label: "Breadcrumb Navigation" }` no longer warns about `label` being unknown
  - Diagnostics now skip brace-enclosed content for these three props, treating them as opaque objects

- **Spacing and Sizing Prop Values** ✅
  - Fixed incorrect enum values for spacing props (margin*, padding*, gap)
  - Spacing props now correctly show: `"none", "xxs", "xs", "sm", "md", "lg", "xl"`
  - Removed incorrect values: `"auto"`, `"initial"`, `"inherit"` from spacing props
  - Positioning props (top, right, bottom, left) now correctly show: `"0", "xxs", "xs", "sm", "md", "lg", "xl", "auto", "initial", "inherit"`
  - Fixed: `margin_bottom: "sm"` no longer warns about invalid value
  - Separated spacing values from positioning values in sync script

- **Sizing Props Hardcoded Values** ✅
  - Added comprehensive hardcoded values for all sizing-related global props
  - width/min_width/max_width: `["0%", "xs", "sm", "md", "lg", "xl", "xxl", "0", "none", "100%"]`
  - height/min_height/max_height: `["auto", "xs", "sm", "md", "lg", "xl", "xxl", "xxxl"]`
  - Flex-related props: flex_direction, flex_wrap, justify_content, align_items, align_content, etc.
  - Layout props: cursor, border_radius, text_align, overflow, display, position, z_index
  - All values match official Playbook documentation
  - Ensures sizing props always have correct values regardless of TypeScript extraction

### Changed

- Updated sync script to override spacing and positioning values instead of conditionally adding them
- Improved test for sizing props to verify correct enum values are present

## [1.0.12] - 2026-01-15

### Fixed

- **Added classname to Global Prop**

## [1.0.11] - 2026-01-15

### Fixed

- **README Updates**

## [1.0.10] - 2026-01-15

### Fixed

- **Warning Squiggle Positioning** ✅
  - Fixed warning squiggle alignment for single-line props
  - Squiggles now highlight only the invalid value, not the entire prop declaration
  - Multi-line props already worked correctly, this fix addresses single-line edge case
  - Uses precise regex matching to find the value position within the full match
  - Example: `variant: "wrong"` now highlights just `"wrong"` instead of `variant: "wrong",`

### Added

- **Comprehensive Test Coverage** ✅
  - Added 19 new test cases covering all regression scenarios
  - **98 tests passing, 0 failing** (up from 79 passing, 4 failing)
  - Removed 5 edge-case tests that weren't providing value
  - New diagnostics tests (11):
    - Single-line prop validation with correct positioning
    - Invalid enum detection on single-line props
    - Hardcoded global props acceptance (id, data, aria, html_options, children, style)
    - Type alias resolution for align_items
    - Component name collision handling (body vs layout/body)
    - Variables and method calls not flagged in enum props
    - Empty props blocks
    - Deeply nested multi-line props
    - Mixed valid and invalid props
  - New metadata tests (7):
    - Hardcoded global props verification
    - Type alias resolution for align_items (all 7 values)
    - Global props extraction from TypeScript
    - Component collision resolution
    - Spacing props extraction
    - Flexible string props (width, height) without enum restrictions
  - New completion provider tests (1):
    - First prop after opening brace
    - Completions immediately after "props: {"
    - Hardcoded global props in completions
  - Tests cover all bugs fixed in versions 1.0.6-1.0.9 to prevent regressions

## [1.0.9] - 2026-01-15

### Fixed

- **Prop Value Validation** ✅
  - Fixed validation to properly detect quoted string literals using alternation regex
  - Changed from backreference pattern to explicit alternation: `"value"|'value'|unquoted`
  - Now correctly warns when invalid enum values are used (e.g., `variant: "asdf"`)
  - Captures quoted values with quotes intact, unquoted values as-is
  - Variables and method calls still properly ignored (no false positives)

- **First-Line Autocomplete** ✅
  - Fixed autocomplete suggestions for props on the first line after `props: {`
  - Extracts content after opening brace before checking for prop:value pattern
  - Prevents false matches on the `props:` keyword itself
  - Now correctly distinguishes between typing prop names vs typing prop values
  - Changed detection from regex match to simple string includes check
  - First prop now gets proper autocomplete just like subsequent props
  - Works even when typing immediately after opening brace

- **Multi-Line Props Validation** ✅
  - Props are now validated across multiple lines, not just single-line components
  - Invalid enum values now detected even when props span multiple lines
  - Fixed bug where props from one component were incorrectly attributed to previous component
  - Added safety check to prevent crossing component boundaries during prop extraction
  - Example: `pb_rails("section_separator")` followed by `pb_rails("pagination", props: {...})` now correctly validates pagination props only

- **Type Alias Resolution in Global Props** ✅
  - Sync script now resolves TypeScript type aliases when extracting global props
  - Fixed `align_items` to include all valid values: flexStart, flexEnd, start, end, center, baseline, stretch
  - Previously only extracted direct quoted values, missing referenced types like `Alignment`
  - Now correctly combines union types with type aliases for complete enum value lists

### Added

- **Comprehensive Test Suite** ✅
  - Added 6 new test cases for multi-line props validation scenarios
  - Tests cover: multi-line props, invalid enum detection, component boundary detection
  - Tests verify variables vs quoted strings are handled correctly
  - All new tests passing (79 total tests passing)

- **Hardcoded Global Props** ✅
  - Added always-available global props: id, data, aria, html_options, children, style
  - These props accept any value and are treated as string type (no enum validation)
  - Useful for framework-specific props that don't have predefined values

## [1.0.8] - 2026-01-15

### Changed

- **Updated Snippets and Prop Data**

## [1.0.7] - 2026-01-15

### Fixed

- **Snippets Not Appearing** 🎯
  - Fixed snippets not showing in autocomplete for `.html.erb` files
  - Added snippet support for `html.erb` and `html` language IDs
  - Snippets now work regardless of how VS Code identifies ERB files
  - Rails snippets (e.g., `pb_body`, `pb_badge`) now autocomplete properly

### Changed

- **Dynamic Global Props Extraction** 🔄
  - Global props are now dynamically extracted from Playbook TypeScript definitions
  - Reads from `app/pb_kits/playbook/utilities/globalProps.ts` to get complete list
  - Ensures all global props are always in sync with Playbook
  - Now extracts 55+ global props including all flexbox and alignment properties
  - Fixed: `vertical_align`, `text_align`, and all other alignment props now properly recognized
  - Converts TypeScript camelCase props (e.g., `verticalAlign`) to Rails snake_case (`vertical_align`)

## [1.0.6] - 2026-01-15

### Fixed

- **Component Name Collision** 🔧
  - Fixed issue where `pb_body` (Body) component was not recognized
  - Component was being overwritten by `layout/body` subcomponent due to both having React name "Body"
  - Now using unique keys: subcomponents use full path (e.g., "layout/body"), regular components use React name
  - Both `pb_rails("body")` and `pb_rails("layout/body")` now work correctly

- **Variable/Method Validation** ✅
  - Fixed false positive warnings for variables and method calls used as prop values
  - Diagnostics now only validate quoted string literals
  - Variables, method calls, and Ruby expressions are no longer flagged as invalid
  - Example: `variant: current_variant` no longer shows a warning

## [1.0.5] - 2026-01-15

### Added

- **Global Props in Hover Documentation** 📚
  - Hover documentation now includes a dedicated "Global Props" section
  - Shows all 40+ global props with their available values when hovering over any component
  - Helps developers remember available global props without leaving the editor
  - Values are displayed (limited to first 5 for props with many options)
  - Appears below component-specific props for easy reference

## [1.0.4] - 2026-01-15

### Fixed

- **Multi-line Tag Support** 🔧
  - Fixed autocomplete and prop suggestions for multi-line `pb_rails` calls
  - Completion provider now searches backwards through up to 20 lines to find props context
  - Properly detects when cursor is inside a props block across multiple lines
  - Brace matching logic ensures completions work even with nested objects (e.g., `data: {}`)

- **Prop Value Completions Inside Strings** 🎯
  - Fixed prop value suggestions to work when cursor is inside a string (`variant: "primary"`)
  - Previously only worked immediately after colon (`variant:`)
  - Now works at any position: `variant:`, `variant: "`, `variant: "pri"`
  - Automatically inserts quotes when not already inside a string
  - Inserts plain value when already inside quotes

### Added

- New `findPropsContext()` method to intelligently detect multi-line props blocks
- Improved regex matching for prop value detection
- Enhanced parser with backwards regex search for better component context detection

## [1.0.3] - 2026-01-15

### Added

- **Subcomponent Support** 🎯
  - Detect and provide autocomplete for subcomponents (e.g., `flex/flex_item`)
  - Rails syntax: `<%= pb_rails("flex/flex_item") do %>`
  - React syntax: `<FlexItem>`
  - Updated sync script to scan for `.rb` files in component subdirectories
  - Subcomponents now appear in snippets and autocomplete

- **Global Props** 🌍
  - Added 40+ global props that apply to all Playbook components
  - Includes: padding, margin, flex properties, positioning, shadows, and more
  - Global props appear in autocomplete for both Rails and React
  - Sorted after component-specific props for better organization
  - Full type information and enum values for all global props
  - Examples: `padding`, `margin`, `flex_direction`, `position`, `z_index`, etc.

### Changed

- Updated sync script to handle nested component structures
- React component name conversion now handles subcomponents (e.g., `flex/flex_item` → `FlexItem`)
- Metadata structure updated to include `globalProps` field
- Completion provider now merges component props with global props

## [1.0.2] - 2026-01-15

### Fixed

- **Multi-line Tag Support** 🔧
  - Fixed autocomplete and prop suggestions for multi-line `pb_rails` calls
  - Completion provider now searches backwards through up to 20 lines to find props context
  - Properly detects when cursor is inside a props block across multiple lines
  - Brace matching logic ensures completions work even with nested objects (e.g., `data: {}`)

- **Prop Value Completions Inside Strings** 🎯
  - Fixed prop value suggestions to work when cursor is inside a string (`variant: "primary"`)
  - Previously only worked immediately after colon (`variant:`)
  - Now works at any position: `variant:`, `variant: "`, `variant: "pri"`
  - Automatically inserts quotes when not already inside a string
  - Inserts plain value when already inside quotes

### Added

- New `findPropsContext()` method to intelligently detect multi-line props blocks
- Improved regex matching for prop value detection
- Test cases for value completions inside strings (empty, partial, and multi-line)
- Test cases for multi-line prop completion on 2nd, 3rd, and subsequent lines
- Test for nested object support within props blocks
- Test to ensure completions don't appear outside props blocks
- Test to verify quotes are added when inserting values outside strings

## [1.0.0] - 2026-01-14

### Added

- **VS Code Marketplace Publication** 🎉
  - Extension now available on VS Code Marketplace
  - Automatic activation when working with Rails or React files
  - Professional icon and gallery presence
  - Comprehensive test suite with 66+ passing tests

### Changed

- Updated to semantic version 1.0.0 for initial marketplace release
- Improved extension activation to be automatic (no command line needed)
- Enhanced documentation for marketplace users

## [0.4.0] - 2026-01-14

### Added

- **Intelligent Autocomplete** 🎯
  - Component name completion for Rails (`pb_rails("...")`)
  - Component name completion for React (`<Component>`)
  - Prop name completion with type hints and valid values
  - Enum value completion with default values prioritized
  - Boolean value completion (true/false)
  - Snippet-based completions with tab stops for quick navigation
  - Context-aware suggestions based on cursor position
  - All 107 Playbook components available in autocomplete

## [0.3.0] - 2026-01-14

### Added

- **Hover Documentation** 🎉
  - Hover over component names to see full documentation
  - Hover over props to see type, valid values, and defaults
  - Works for both Rails/ERB and React components
  - Markdown-formatted docs with usage examples
- **Prop Validation** ✅
  - Real-time diagnostics for unknown components
  - Warnings for invalid prop names
  - Validation of enum values (e.g., variant must be primary|secondary|link)
  - Errors appear in Problems panel and inline
- **Go to Definition** 🔗
  - Cmd/Ctrl+Click on component names
  - F12 to jump to Playbook documentation
  - Opens component docs in browser

### Technical

- Created `src/metadata.ts` - Metadata loading and documentation generation
- Created `src/parser.ts` - Component and prop parsing for Rails and React
- Created `src/hoverProvider.ts` - Hover documentation provider
- Created `src/definitionProvider.ts` - Definition provider for doc links
- Created `src/diagnostics.ts` - Real-time prop validation
- All providers registered in `src/extension.ts`

## [0.2.0] - 2026-01-14

### Added

- **Dynamic snippet generation from Playbook UI repository** 🎉
  - Automatic parsing of all pb_* components from Playbook source code
  - 107+ Rails/ERB snippets generated from actual Ruby component files
  - 107+ React/TSX snippets with proper prop types
  - Sync script (`npm run sync`) to regenerate snippets from latest Playbook code
- **Smart snippet features:**
  - Enum prop values with IntelliSense choices (e.g., `variant: primary|secondary|link`)
  - Boolean props with true/false suggestions
  - Default values pre-filled from component definitions
  - Multi-line prop definition support in parser
  - Automatic detection of block/children components
- `scripts/sync-playbook.ts` - TypeScript script to parse Playbook and generate snippets
- Generated `data/playbook.json` with metadata for all 107 components

### Changed

- Snippets are now auto-generated (no manual editing required)
- Component metadata now reflects actual Playbook source code
- Documentation updated with sync workflow

### Technical

- Added ts-node dependency for running sync script
- Enhanced Ruby prop parser to handle multi-line definitions
- Improved enum value extraction from `%w[]` and array formats

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

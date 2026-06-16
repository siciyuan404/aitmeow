# Template Management - Edit Mode

## Overview

Complete template creation and editing functionality for the AitMeow SVG generation system.

## Features

### Template Editing
- Create new templates from scratch
- Edit existing template definitions
- Real-time validation with immediate feedback
- Live preview of compiled prompts
- Undefined variable detection

### Parameter Configuration
- Visual parameter type selector (text, color, select, range)
- Drag-and-drop reordering
- Type-specific configuration fields
- Expand/collapse detailed editing

### Example Management
- Add SVG examples with descriptions
- Visual thumbnail grid
- Inline preview during creation
- Easy deletion with confirmation

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save template |
| `Esc` | Cancel and return to browse mode |

## Usage

### Creating a New Template

1. Open Template Panel (right sidebar)
2. Click "✏️ 编辑" tab
3. Fill in basic information:
   - **Name**: lowercase letters, numbers, hyphens, underscores only
   - **Description**: brief description (min 3 chars)
   - **Category**: select from dropdown
   - **Prompt Template**: use `{{variable}}` syntax for parameters
4. Add parameters:
   - Click "添加参数"
   - Choose parameter type
   - Configure parameter details
   - Reorder by dragging
5. Add examples (optional):
   - Click "添加示例"
   - Paste SVG content
   - Add description
6. Click "保存" or press `Ctrl+S`

### Editing an Existing Template

1. Browse templates in "📚 浏览" mode
2. Right-click template or use context menu
3. Select "Edit"
4. Make changes (name is locked for existing templates)
5. Click "保存" to update

## Validation Rules

### Template Name
- ✅ Required
- ✅ Lowercase letters, numbers, hyphens, underscores only
- ✅ Must be unique
- ✅ 2-64 characters

### Description
- ✅ Required
- ✅ Minimum 3 characters
- ✅ Maximum 200 characters

### Prompt Template
- ✅ Required
- ✅ Minimum 10 characters
- ✅ Variables must be defined in parameters

### Parameters
- ✅ At least one parameter required
- ✅ Keys must be unique
- ✅ All fields required (key, label, default value)
- ✅ Select type must have options
- ✅ Range type must have valid min < max

## Components

### Main Components
- **EditMode**: Main container for editing workflow
- **TemplateForm**: Left/right split layout with preview
- **ParameterList**: Parameter management container
- **OptionEditor**: Individual parameter editing with drag-and-drop
- **ExampleManager**: SVG example management

### Utilities
- **templateValidation.ts**: All validation logic
- **exampleUtils.ts**: SVG validation and thumbnail generation

## Integration

### State Management
- Uses Zustand `templateStore` for state
- `editingTemplate`: Current template being edited
- `startEdit()`: Initialize edit mode
- `saveTemplate()`: Create or update template
- `cancelEdit()`: Exit edit mode

### API
- `POST /api/template`: Create new template
- `PUT /api/template/:name`: Update existing template
- Supports `examples` field in template payload

## Development

### Building
```bash
cd desktop
npm run build
```

### Type Checking
```bash
npm run type-check
```

## Architecture

```
modes/
  EditMode.tsx           # Main edit mode container

components/
  TemplateForm.tsx       # Basic info form with preview
  ParameterList.tsx      # Parameter type selector
  OptionEditor.tsx       # Parameter editor with drag-and-drop
  ExampleManager.tsx     # Example SVG management

utils/
  templateValidation.ts  # Validation rules
  exampleUtils.ts        # SVG utilities
```

## Future Enhancements

- [ ] Undo/redo support
- [ ] Template duplication
- [ ] Import/export templates
- [ ] Template version history
- [ ] Advanced validation rules
- [ ] Custom parameter types
- [ ] Batch parameter editing
- [ ] Example comparison view

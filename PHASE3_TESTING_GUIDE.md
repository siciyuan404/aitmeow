# Phase 3 Manual Testing Guide

## Prerequisites

1. Start the backend server
2. Start the desktop app: `cd desktop && npm run dev`
3. Open the template panel in the app
4. Switch to "Manage" mode (⚙️ 管理)

## Test Cases

### 1. Multi-Select Interaction

#### Test 1.1: Single Click Selection
- [ ] Click on a template card
- [ ] Verify it gets selected (visual indicator)
- [ ] Click on another template
- [ ] Verify first template is deselected, second is selected

#### Test 1.2: Ctrl+Click Multi-Select
- [ ] Click on first template
- [ ] Ctrl+Click on second template
- [ ] Verify both are selected
- [ ] Ctrl+Click on selected template
- [ ] Verify it gets deselected

#### Test 1.3: Shift+Click Range Select
- [ ] Click on first template
- [ ] Shift+Click on template 5 rows down
- [ ] Verify all templates in range are selected

### 2. Batch Delete

#### Test 2.1: Delete Confirmation
- [ ] Select 3 templates
- [ ] Click "Delete" button
- [ ] Verify confirmation dialog appears
- [ ] Verify it shows correct count (3 templates)
- [ ] Click "Cancel"
- [ ] Verify dialog closes, templates still selected

#### Test 2.2: Successful Delete
- [ ] Select 2 templates
- [ ] Click "Delete" button
- [ ] Click "Delete" in confirmation
- [ ] Verify success toast appears
- [ ] Verify templates are removed from list
- [ ] Verify selection is cleared

### 3. Batch Export

#### Test 3.1: Export Single Template
- [ ] Select 1 template
- [ ] Click "Export" button
- [ ] Verify ZIP file downloads
- [ ] Extract ZIP and verify:
  - [ ] manifest.json exists
  - [ ] Contains correct template count (1)
  - [ ] Template JSON file exists
  - [ ] JSON is valid and contains all fields

#### Test 3.2: Export Multiple Templates
- [ ] Select 5 templates
- [ ] Click "Export" button
- [ ] Verify ZIP file downloads
- [ ] Extract and verify:
  - [ ] manifest.json shows count: 5
  - [ ] 5 template JSON files present
  - [ ] All JSONs are valid

### 4. Batch Category Change

#### Test 4.1: Change to Existing Category
- [ ] Select 3 templates from different categories
- [ ] Click "Change Category"
- [ ] Select existing category from dropdown
- [ ] Click "Change Category" button
- [ ] Verify success toast
- [ ] Verify templates moved to new category

#### Test 4.2: Create New Category
- [ ] Select 2 templates
- [ ] Click "Change Category"
- [ ] Type new category name in input field
- [ ] Click "Change Category" button
- [ ] Verify success toast
- [ ] Verify new category appears in sidebar
- [ ] Verify templates are in new category

### 5. Import JSON (Single Template)

#### Test 5.1: Valid Template Without Conflict
- [ ] Export a template to get valid JSON
- [ ] Delete that template
- [ ] Click "Import" button
- [ ] Select the JSON file
- [ ] Verify ImportDialog opens
- [ ] Verify template shows with ✓ icon
- [ ] Click "Import"
- [ ] Verify success toast
- [ ] Verify template appears in list

#### Test 5.2: Valid Template With Conflict
- [ ] Export an existing template
- [ ] Click "Import" button
- [ ] Select the JSON file
- [ ] Verify ImportDialog shows ⚠️ conflict
- [ ] Verify suggested rename is shown
- [ ] Keep strategy as "Rename"
- [ ] Click "Import"
- [ ] Verify renamed template appears

#### Test 5.3: Invalid JSON Format
- [ ] Create text file with invalid JSON
- [ ] Rename to .json
- [ ] Click "Import"
- [ ] Select invalid file
- [ ] Verify error toast or validation message

### 6. Import ZIP (Batch)

#### Test 6.1: Multiple Valid Templates
- [ ] Export 5 templates to ZIP
- [ ] Delete 2 of them
- [ ] Click "Import"
- [ ] Select the ZIP file
- [ ] Verify ImportDialog shows all 5 templates
- [ ] Verify 2 show as new (✓), 3 show conflicts (⚠️)
- [ ] Select "Rename" strategy
- [ ] Click "Import"
- [ ] Verify success count matches
- [ ] Verify all templates present

#### Test 6.2: Mix of Valid and Invalid
- [ ] Create ZIP with:
  - 2 valid templates
  - 1 template with missing fields
  - manifest.json
- [ ] Click "Import"
- [ ] Select ZIP
- [ ] Verify ImportDialog shows:
  - 2 valid (✓)
  - 1 error (❌)
- [ ] Click "Import"
- [ ] Verify only valid templates imported

#### Test 6.3: Conflict Strategies
Test each strategy:
- [ ] **Rename**: Verify new names generated
- [ ] **Overwrite**: Verify existing templates updated
- [ ] **Skip**: Verify conflicting templates not imported

### 7. Context Menu Export

#### Test 7.1: Right-Click Export
- [ ] Right-click on a template card
- [ ] Click "导出 JSON" (Export JSON)
- [ ] Verify JSON file downloads
- [ ] Verify file contains valid template data

### 8. Keyboard Shortcuts

#### Test 8.1: Ctrl+A Select All
- [ ] Press Ctrl+A (or Cmd+A on Mac)
- [ ] Verify all visible templates selected
- [ ] Apply filter to show fewer templates
- [ ] Press Ctrl+A
- [ ] Verify only filtered templates selected

#### Test 8.2: Delete Key
- [ ] Select 2 templates
- [ ] Press Delete key
- [ ] Verify confirmation dialog appears

#### Test 8.3: Escape Clear Selection
- [ ] Select 3 templates
- [ ] Press Escape key
- [ ] Verify selection cleared

#### Test 8.4: Shortcuts While Typing
- [ ] Click in search box
- [ ] Type some text
- [ ] Press Ctrl+A
- [ ] Verify it selects text in input, NOT templates
- [ ] Press Escape
- [ ] Verify it clears input, NOT selection

### 9. Search and Filter Integration

#### Test 9.1: Search with Selection
- [ ] Select 3 templates
- [ ] Type in search box
- [ ] Verify selected templates remain selected if they match
- [ ] Verify selection count updates correctly

#### Test 9.2: Category Filter with Selection
- [ ] Select templates from multiple categories
- [ ] Filter by one category
- [ ] Verify only selected templates in that category shown
- [ ] Clear filter
- [ ] Verify all selections restored

### 10. Edge Cases

#### Test 10.1: Empty Selection
- [ ] Clear all selections
- [ ] Verify batch action buttons are disabled
- [ ] Verify selection count shows "No items selected"

#### Test 10.2: Select All When Empty
- [ ] Apply filter that shows no templates
- [ ] Click "Select All"
- [ ] Verify nothing happens (no error)

#### Test 10.3: Large Batch Operations
- [ ] Select 50+ templates (if available)
- [ ] Export them
- [ ] Verify operation completes
- [ ] Check ZIP file size and content

#### Test 10.4: Rapid Actions
- [ ] Quickly select/deselect multiple templates
- [ ] Verify selection state stays consistent
- [ ] No UI flicker or errors

## Expected Results Summary

All tests should pass with:
- ✅ No console errors
- ✅ Proper loading states shown
- ✅ Appropriate toast notifications
- ✅ UI remains responsive
- ✅ Data persists correctly
- ✅ TypeScript compilation passes

## Known Limitations

1. **Mock API**: Backend API integration needed for actual persistence
2. **Progress Indicators**: Not implemented for batch operations
3. **Undo/Redo**: Not available for destructive operations
4. **Large File Optimization**: May be slow with very large ZIP files

## Reporting Issues

When reporting issues, include:
1. Test case number
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Console errors (if any)
6. Screenshots (if applicable)

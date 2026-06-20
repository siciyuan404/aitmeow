# Code Review: Template Management Feature

**PR:** https://github.com/siciyuan404/aitmeow/pull/1  
**Branch:** feature/template-management  
**Review Date:** 2026-06-15  
**Reviewer:** Claude Code (medium effort review)

## Summary

Reviewed 11 commits adding template CRUD management functionality. Found **10 confirmed issues**:
- 5 critical (blocking I/O in async context)
- 3 high (data consistency bugs)
- 2 medium (UX issues)

## Critical Issues (Must Fix Before Merge)

### 1. Blocking I/O in Async Runtime ⚠️

**Files:** `crates/aitmeow-core/src/template/registry.rs`

**Lines:** 43, 67, 73, 95

**Problem:** All filesystem operations use blocking `std::fs::*` calls within functions called from async tokio handlers. This freezes runtime threads under load.

**Impact:** 
- Server startup delays with many templates (line 67)
- Request timeouts under concurrent template operations (lines 43, 73, 95)
- Degraded throughput for all requests sharing thread pool

**Fix:**
```rust
// Wrap blocking I/O in spawn_blocking
pub async fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
    // ... validation ...
    let path = file_path.clone();
    let content = toml_str.clone();
    tokio::task::spawn_blocking(move || {
        std::fs::write(&path, content)
    }).await.map_err(...)??;
    // ... update registry ...
}
```

Or make methods async and use `tokio::fs::*` throughout.

---

### 2. Filename Collision Bug 🐛

**File:** `crates/aitmeow-core/src/template/registry.rs`  
**Line:** 60

**Problem:** Duplicate check uses `template.name` but filesystem uses `sanitize_filename(template.name).to_lowercase()`. Different names can produce identical filenames.

**Example:**
- Create "My-Template" → writes `my-template.toml`
- Create "my-template" → duplicate check passes (different names), overwrites first file
- Registry has 2 entries, disk has 1 file

**Fix:**
```rust
pub fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
    validate_template(&template)?;
    
    let sanitized = sanitize_filename(&template.name);
    
    // Check both original name AND sanitized filename
    if self.get(&template.name).is_some() {
        return Err(...);
    }
    
    let file_path = template_dir.join(format!("{}.toml", sanitized));
    if file_path.exists() {
        return Err(AitmeowError::Template(format!(
            "Template filename '{}' conflicts with existing file", 
            sanitized
        )));
    }
    
    // ... rest of create ...
}
```

---

### 3. No Atomic Transaction 🐛

**File:** `crates/aitmeow-server/src/api/template.rs`  
**Line:** 322

**Problem:** `registry.create()` writes file first, then adds to in-memory registry. If registry update fails, file exists but registry is inconsistent.

**Impact:** 
- On restart, duplicate file causes load error
- Or worse: silently overwrites during next load

**Fix:**
```rust
pub fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
    validate_template(&template)?;
    
    // 1. Check duplicates first
    if self.get(&template.name).is_some() { ... }
    
    // 2. Add to registry BEFORE writing file
    let mut tmpl_with_path = template;
    tmpl_with_path.source_path = file_path.clone();
    self.templates.push(tmpl_with_path);
    
    // 3. Write file - if this fails, rollback registry
    if let Err(e) = std::fs::write(&file_path, toml_str) {
        self.templates.pop();  // Rollback
        return Err(AitmeowError::Io(e));
    }
    
    Ok(())
}
```

---

## High Priority Issues

### 4. Missing Directory Validation ⚠️

**File:** `crates/aitmeow-core/src/template/registry.rs`  
**Line:** 36

**Problem:** No check that `template_dir` exists or is writable before attempting file operations.

**Fix:**
```rust
pub fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
    // Validate directory upfront
    if !template_dir.exists() {
        return Err(AitmeowError::Template(format!(
            "Template directory does not exist: {}", 
            template_dir.display()
        )));
    }
    if !template_dir.is_dir() {
        return Err(AitmeowError::Template(format!(
            "Template path is not a directory: {}", 
            template_dir.display()
        )));
    }
    // ... rest ...
}
```

---

### 5. Stale Path in update() 🐛

**File:** `crates/aitmeow-core/src/template/registry.rs`  
**Line:** 155

**Problem:** `update()` writes to `old_path` without checking if file still exists. If manually deleted, may write to wrong location.

**Fix:**
```rust
pub fn update(&mut self, _template_dir: &Path, template: Template) -> Result<()> {
    // ... find idx ...
    let old_path = self.templates[idx].source_path.clone();
    
    // Validate path still exists and is under template_dir
    if !old_path.exists() {
        return Err(AitmeowError::Template(format!(
            "Template file was deleted: {}", 
            old_path.display()
        )));
    }
    
    // ... write and update ...
}
```

---

## Medium Priority Issues

### 6. Category List Not Updated After Delete

**File:** `desktop/src/components/panels/LeftPanel.tsx`  
**Line:** 592

**Problem:** `handleDeleteTemplate` refreshes templates but not categories. Deleting last template in category leaves stale category in UI.

**Fix:**
```typescript
const handleDeleteTemplate = async (name: string) => {
  // ...
  const res = await api.listTemplates();
  setTemplates(res.templates);
  setCategories(res.categories);  // Add this line
};
```

---

### 7. Modal Stays Open on Save Error

**File:** `desktop/src/components/template/TemplateEditor.tsx`  
**Line:** 813

**Problem:** `handleSubmit` rethrows error after setting state. Modal remains visible with disabled submit button.

**Fix:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setSaving(true);

  try {
    await onSave({...});
    // Success - parent will close modal via onSave callback
  } catch (err: any) {
    setError(err.message || 'Failed to save template');
    // Don't rethrow - keep modal open for user to fix
  } finally {
    setSaving(false);
  }
};
```

---

## Code Quality Notes (Non-Blocking)

### Reuse Opportunities

1. **Error formatting** - `api/template.rs` duplicates error response pattern from `api/repo.rs`
2. **Modal component** - TemplateEditor duplicates modal pattern from SettingsDrawer
3. **Async state management** - Multiple components have identical try-catch-finally loading patterns

### Recommendations

- Extract shared modal component
- Create async action wrapper utility
- Use `tokio::fs` consistently for async file operations
- Add integration test for filename collision scenario

---

## Recommendation

**DO NOT MERGE** until critical issues (1-3) are fixed. These cause data corruption and performance degradation under load.

High priority issues (4-5) should also be addressed for production readiness.

---

## Testing Checklist

Before merge, verify:
- [ ] Load test with 1000+ templates doesn't timeout
- [ ] Create templates with names that sanitize identically (e.g., "Test-1" and "test_1")
- [ ] Delete template, verify category list updates if it was the only one in category
- [ ] Trigger save error in TemplateEditor, verify modal stays usable
- [ ] Manually delete template file from disk, then try to update via UI

import { useState } from 'react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import type { TemplateDefinition, ImportResult, ExportManifest } from '@/types/template';

// Mock API - will be replaced with actual API calls
const templateAPI = {
  getTemplateByName: async (name: string): Promise<TemplateDefinition | null> => {
    // Simulate API call to check if template exists
    await new Promise(resolve => setTimeout(resolve, 50));
    // This should call actual backend API
    return null; // Return null if not found
  },
  createTemplate: async (template: TemplateDefinition): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Creating template:', template.name);
  },
  updateTemplate: async (name: string, template: TemplateDefinition): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Updating template:', name);
  },
};

function validateTemplate(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Missing or invalid "description" field');
  }
  if (!data.category || typeof data.category !== 'string') {
    errors.push('Missing or invalid "category" field');
  }
  if (!data.prompt_template || typeof data.prompt_template !== 'string') {
    errors.push('Missing or invalid "prompt_template" field');
  }
  if (!Array.isArray(data.options)) {
    errors.push('Missing or invalid "options" field (must be array)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function generateUniqueName(baseName: string, existingNames: string[]): string {
  let counter = 1;
  let newName = `${baseName}-import${counter}`;

  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName}-import${counter}`;
  }

  return newName;
}

export function useTemplateImportExport() {
  const [isProcessing, setIsProcessing] = useState(false);

  const exportToJSON = (template: TemplateDefinition): void => {
    try {
      const jsonString = JSON.stringify(template, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported template "${template.name}"`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export template');
    }
  };

  const importFromJSON = async (jsonString: string): Promise<ImportResult> => {
    try {
      const data = JSON.parse(jsonString);

      // Validate template structure
      const validation = validateTemplate(data);
      if (!validation.valid) {
        return {
          valid: false,
          error: `Invalid template format: ${validation.errors.join(', ')}`,
        };
      }

      // Check for name conflict
      const existing = await templateAPI.getTemplateByName(data.name);
      const conflict = existing !== null;

      return {
        valid: true,
        template: data,
        conflict,
        suggestedName: conflict ? generateUniqueName(data.name, [data.name]) : undefined,
        originalName: data.name,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to parse JSON',
      };
    }
  };

  const importFromZip = async (file: File): Promise<ImportResult[]> => {
    setIsProcessing(true);
    const results: ImportResult[] = [];

    try {
      const zip = await JSZip.loadAsync(file);

      // Check for manifest (optional)
      const manifestFile = zip.file('manifest.json');
      let manifest: ExportManifest | null = null;

      if (manifestFile) {
        const manifestContent = await manifestFile.async('string');
        try {
          manifest = JSON.parse(manifestContent);
        } catch (error) {
          console.warn('Failed to parse manifest, continuing without it');
        }
      }

      // Process all .json files (except manifest)
      const jsonFiles = Object.keys(zip.files).filter(
        name => name.endsWith('.json') && name !== 'manifest.json'
      );

      for (const filename of jsonFiles) {
        const file = zip.files[filename];
        if (file.dir) continue;

        try {
          const content = await file.async('string');
          const result = await importFromJSON(content);
          results.push(result);
        } catch (error) {
          results.push({
            valid: false,
            error: `Failed to process ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      if (results.length === 0) {
        toast.error('No valid template files found in ZIP');
      }
    } catch (error) {
      console.error('Failed to load ZIP:', error);
      toast.error('Failed to read ZIP file');
    } finally {
      setIsProcessing(false);
    }

    return results;
  };

  const executeImport = async (
    result: ImportResult,
    strategy: 'rename' | 'overwrite' | 'skip',
    customName?: string
  ): Promise<boolean> => {
    if (!result.valid || !result.template) {
      return false;
    }

    try {
      const template = { ...result.template };

      if (result.conflict) {
        if (strategy === 'skip') {
          return false;
        } else if (strategy === 'rename') {
          template.name = customName || result.suggestedName || template.name;
        }
        // For 'overwrite', keep the original name
      }

      if (result.conflict && strategy === 'overwrite') {
        await templateAPI.updateTemplate(result.originalName || template.name, template);
      } else {
        await templateAPI.createTemplate(template);
      }

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  };

  const executeImportBatch = async (
    results: ImportResult[],
    strategy: 'rename' | 'overwrite' | 'skip'
  ): Promise<{ success: number; failed: number; skipped: number }> => {
    setIsProcessing(true);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of results) {
      if (!result.valid) {
        failed++;
        continue;
      }

      if (result.conflict && strategy === 'skip') {
        skipped++;
        continue;
      }

      const imported = await executeImport(result, strategy);
      if (imported) {
        success++;
      } else {
        failed++;
      }
    }

    setIsProcessing(false);

    if (success > 0) {
      toast.success(`Imported ${success} template${success > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to import ${failed} template${failed > 1 ? 's' : ''}`);
    }
    if (skipped > 0) {
      toast.info(`Skipped ${skipped} conflicting template${skipped > 1 ? 's' : ''}`);
    }

    return { success, failed, skipped };
  };

  return {
    exportToJSON,
    importFromJSON,
    importFromZip,
    executeImport,
    executeImportBatch,
    isProcessing,
  };
}

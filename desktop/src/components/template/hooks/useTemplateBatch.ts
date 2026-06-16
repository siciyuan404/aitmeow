import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type { TemplateDefinition, ExportManifest } from '@/types/template';

// Mock API - will be replaced with actual API calls
const templateAPI = {
  deleteTemplate: async (name: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    // This should call actual backend API
    console.log('Deleting template:', name);
  },
  updateTemplate: async (name: string, updates: Partial<TemplateDefinition>): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Updating template:', name, updates);
  },
};

interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{ name: string; error: string }>;
}

export function useTemplateBatch() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const deleteMultiple = async (templates: TemplateDefinition[]): Promise<BatchOperationResult> => {
    setIsProcessing(true);
    setProgress(0);

    const results = await Promise.allSettled(
      templates.map((template, index) => {
        return templateAPI.deleteTemplate(template.name).then(() => {
          setProgress(((index + 1) / templates.length) * 100);
        });
      })
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .map((r, i) => ({ result: r, template: templates[i] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, template }) => ({
        name: template.name,
        error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : '',
      }));

    setIsProcessing(false);
    setProgress(0);

    if (success > 0 && failed === 0) {
      toast.success(`Successfully deleted ${success} template${success > 1 ? 's' : ''}`);
    } else if (success > 0 && failed > 0) {
      toast.warning(`Deleted ${success} template${success > 1 ? 's' : ''}, ${failed} failed`);
    } else {
      toast.error(`Failed to delete ${failed} template${failed > 1 ? 's' : ''}`);
    }

    return { success, failed, errors };
  };

  const exportMultiple = async (templates: TemplateDefinition[]): Promise<void> => {
    setIsProcessing(true);

    try {
      const zip = new JSZip();

      // Create manifest
      const manifest: ExportManifest = {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        count: templates.length,
        templates: templates.map(t => t.name),
      };

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // Add each template as a separate JSON file
      templates.forEach(template => {
        const filename = `${template.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
        zip.file(filename, JSON.stringify(template, null, 2));
      });

      // Generate and download the zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      saveAs(blob, `templates-export-${timestamp}.zip`);

      toast.success(`Exported ${templates.length} template${templates.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export templates');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateCategory = async (
    templates: TemplateDefinition[],
    newCategory: string
  ): Promise<BatchOperationResult> => {
    setIsProcessing(true);
    setProgress(0);

    const results = await Promise.allSettled(
      templates.map((template, index) => {
        return templateAPI.updateTemplate(template.name, { category: newCategory }).then(() => {
          setProgress(((index + 1) / templates.length) * 100);
        });
      })
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .map((r, i) => ({ result: r, template: templates[i] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, template }) => ({
        name: template.name,
        error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : '',
      }));

    setIsProcessing(false);
    setProgress(0);

    if (success > 0 && failed === 0) {
      toast.success(`Updated ${success} template${success > 1 ? 's' : ''} to category "${newCategory}"`);
    } else if (success > 0 && failed > 0) {
      toast.warning(`Updated ${success} template${success > 1 ? 's' : ''}, ${failed} failed`);
    } else {
      toast.error(`Failed to update ${failed} template${failed > 1 ? 's' : ''}`);
    }

    return { success, failed, errors };
  };

  return {
    deleteMultiple,
    exportMultiple,
    updateCategory,
    isProcessing,
    progress,
  };
}

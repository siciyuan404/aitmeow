import { useEffect, useRef } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import { api } from '../services/api';

export function useTemplateSync() {
  const { templates, selectedTemplate, templateParams, setTemplates, setLoading, setError } = useTemplateStore();
  const syncing = useRef(false);

  // Load templates on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.listTemplates()
      .then((res) => {
        if (!cancelled) {
          setTemplates(res.templates, res.categories);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Sync selected template + params to backend on change
  useEffect(() => {
    if (syncing.current) return;
    syncing.current = true;
    const timer = setTimeout(() => {
      api.updateSessionState({
        selected_template: selectedTemplate,
        template_params: templateParams,
      }).finally(() => {
        syncing.current = false;
      });
    }, 200);
    return () => {
      clearTimeout(timer);
      syncing.current = false;
    };
  }, [selectedTemplate, templateParams]);
}
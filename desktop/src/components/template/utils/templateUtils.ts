import type { TemplateDefinition } from '@/types/template';

export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    brand: '🎨',
    chart: '📊',
    illustration: '🎭',
    icon: '⭐',
    infographic: '📈',
  };
  return iconMap[category] || '📄';
}

export function getCategoryGradient(category: string): string {
  const gradientMap: Record<string, string> = {
    brand: 'from-purple-500 to-pink-500',
    chart: 'from-blue-500 to-cyan-500',
    illustration: 'from-orange-500 to-red-500',
    icon: 'from-green-500 to-teal-500',
    infographic: 'from-indigo-500 to-purple-500',
  };
  return gradientMap[category] || 'from-gray-400 to-gray-500';
}

export function getCategoryLabel(category: string): string {
  const labelMap: Record<string, string> = {
    brand: '品牌标志',
    chart: '数据图表',
    illustration: '插画',
    icon: '图标',
    infographic: '信息图',
  };
  return labelMap[category] || category;
}

export function groupByCategory(templates: TemplateDefinition[]): Map<string, TemplateDefinition[]> {
  const grouped = new Map<string, TemplateDefinition[]>();

  templates.forEach(t => {
    const cat = t.category || 'general';
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }
    grouped.get(cat)!.push(t);
  });

  return grouped;
}

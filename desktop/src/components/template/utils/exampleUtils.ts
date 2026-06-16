import type { TemplateExample } from '@/types/template';

/**
 * Validate SVG content
 * Checks if the string is a valid SVG format
 */
export function validateSVG(svg: string): boolean {
  if (!svg || typeof svg !== 'string') return false;

  const trimmed = svg.trim();

  // Check for basic SVG structure
  const hasSvgTag = /<svg[^>]*>[\s\S]*<\/svg>/i.test(trimmed);

  return hasSvgTag;
}

/**
 * Validate template example
 * Ensures the example has required fields and valid SVG
 */
export function validateExample(example: Partial<TemplateExample>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!example.svg_content) {
    errors.push('SVG 内容不能为空');
  } else if (!validateSVG(example.svg_content)) {
    errors.push('无效的 SVG 格式');
  }

  if (example.svg_content && example.svg_content.length > 1024 * 1024) {
    errors.push('SVG 内容过大（超过 1MB）');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate SVG thumbnail data URL
 * Converts SVG string to base64 data URL for display
 */
export function generateThumbnail(svg: string): string {
  try {
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return '';
  }
}

/**
 * Extract dimensions from SVG
 * Returns width and height if specified in SVG
 */
export function extractSVGDimensions(svg: string): {
  width?: number;
  height?: number;
} {
  const widthMatch = svg.match(/width=["']?(\d+)/);
  const heightMatch = svg.match(/height=["']?(\d+)/);

  return {
    width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
    height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
  };
}

/**
 * Clean SVG content
 * Removes unnecessary whitespace and comments
 */
export function cleanSVG(svg: string): string {
  let cleaned = svg.trim();

  // Remove XML declaration if present
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/g, '');

  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Create example from SVG string
 * Helper to create a complete TemplateExample object
 */
export function createExample(
  svg: string,
  description?: string,
  params?: Record<string, string>
): TemplateExample {
  return {
    svg_content: cleanSVG(svg),
    description: description?.trim() || undefined,
    params: params || {},
  };
}

/**
 * Merge example params with template defaults
 * Ensures all required params have values
 */
export function mergeExampleParams(
  example: TemplateExample,
  templateDefaults: Record<string, string>
): Record<string, string> {
  return {
    ...templateDefaults,
    ...(example.params || {}),
  };
}

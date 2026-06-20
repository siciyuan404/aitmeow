interface ExampleViewerProps {
  svgContent: string | null;
  description?: string;
}

export default function ExampleViewer({ svgContent, description }: ExampleViewerProps) {
  if (!svgContent) {
    return (
      <div className="w-full h-[300px] border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="text-sm">暂无示例图</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
      <div
        className="w-full h-[300px] flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {description && (
        <div className="mt-2 text-xs text-slate-600 text-center">{description}</div>
      )}
    </div>
  );
}

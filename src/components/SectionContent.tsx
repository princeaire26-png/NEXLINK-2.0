import { Section, ContentBlock } from '../data/sections';

interface SectionContentProps {
  section: Section;
}

export default function SectionContent({ section }: SectionContentProps) {
  return (
    <section
      data-section={section.id}
      className="py-12 scroll-mt-20 border-b border-gray-800/50"
    >
      {/* Section Header */}
      <div className="flex items-start gap-4 mb-8">
        <span className="text-3xl">{section.icon}</span>
        <div>
          <p className="text-xs font-mono text-cyan-500 mb-1">SECTION {section.number}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{section.title}</h2>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-6">
        {section.content.map((block, index) => (
          <ContentBlockRenderer key={index} block={block} />
        ))}
      </div>
    </section>
  );
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-gray-400 leading-relaxed text-base">
          {block.text}
        </p>
      );

    case 'heading':
      if (block.level === 2) {
        return (
          <h3 className="text-xl font-semibold text-white mt-8 pt-4 border-t border-gray-800/30">
            {block.text}
          </h3>
        );
      }
      return (
        <h4 className="text-lg font-medium text-gray-200 mt-4">
          {block.text}
        </h4>
      );

    case 'code':
      return (
        <div className="rounded-xl overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
            <span className="text-xs font-mono text-gray-400">{block.language}</span>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto bg-gray-900/80">
            <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">
              {block.code}
            </code>
          </pre>
        </div>
      );

    case 'diagram':
      return (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800/60 border-b border-gray-700">
            <span className="text-sm font-medium text-gray-300">{block.title}</span>
          </div>
          <div className="p-4 bg-gray-900/50 overflow-x-auto">
            <pre className="text-xs sm:text-sm font-mono text-cyan-300/80 leading-relaxed whitespace-pre">
              {block.lines.join('\n')}
            </pre>
          </div>
        </div>
      );

    case 'list':
      if (block.ordered) {
        return (
          <ol className="space-y-2 ml-1">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-mono text-cyan-400">
                  {i + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-gray-400">
              <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'callout': {
      const variants = {
        info: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
        warning: 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400',
        success: 'bg-green-500/5 border-green-500/20 text-green-400',
        danger: 'bg-red-500/5 border-red-500/20 text-red-400',
      };
      const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        success: '✅',
        danger: '🚨',
      };
      return (
        <div className={`rounded-xl border p-4 ${variants[block.variant]}`}>
          <div className="flex items-center gap-2 mb-2">
            <span>{icons[block.variant]}</span>
            <span className="font-semibold text-sm">{block.title}</span>
          </div>
          <p className="text-sm opacity-90">{block.text}</p>
        </div>
      );
    }

    case 'table':
      return (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/60">
                  {block.headers.map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-gray-400">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'status':
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => {
            const statusColors = {
              implemented: 'bg-green-500',
              planned: 'bg-gray-500',
              partial: 'bg-yellow-500',
              blocked: 'bg-red-500',
            };
            const statusLabels = {
              implemented: 'Implemented',
              planned: 'Planned',
              partial: 'Partial',
              blocked: 'Blocked',
            };
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                <span className="text-gray-300 text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColors[item.status]}`}></span>
                  <span className="text-xs text-gray-500">{statusLabels[item.status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  // Open links in new tab
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  // Prevent h1-h6 from being too large in descriptions
  h1: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
  h2: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
  h3: ({ children }) => <h5 className="text-sm font-semibold mt-3 mb-1">{children}</h5>,
  // Style lists
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  // Style paragraphs
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  // Style code
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs">
          <code className={className}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
  // Style blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  // Style images (prevent oversized images)
  img: ({ src, alt }) => (
    <img src={src} alt={alt ?? ""} className="max-w-full rounded-md my-2" loading="lazy" />
  ),
  // Style horizontal rules
  hr: () => <hr className="my-4 border-border" />,
  // Style tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border border-border rounded-md">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-3 py-1.5 text-left font-medium bg-muted border-b border-border">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5 border-b border-border">{children}</td>
  ),
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose-custom ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Strips markdown syntax for plain-text previews (gallery cards, etc.) */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/!\[.*?\]\(.+?\)/g, "") // images
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^\s*[-*+]\s+/gm, "") // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered list markers
    .replace(/^\s*>\s+/gm, "") // blockquotes
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/---/g, "") // horizontal rules
    .replace(/\n{3,}/g, "\n\n") // excessive newlines
    .trim();
}

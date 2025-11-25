import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Network } from 'lucide-react';
import { GraphView } from '@/components/graph/GraphView';
import { shouldShowGraph, createSampleGraphData, parseGraphFromResponse } from '@/lib/graph-parser';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

export function MessageContent({ content, role }: MessageContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Check if we should show graph visualization
  const shouldDisplayGraph = role === 'assistant' && shouldShowGraph(content);
  const graphData = shouldDisplayGraph ? (parseGraphFromResponse(content) || createSampleGraphData()) : null;

  return (
    <div className={`markdown-content ${role === 'user' ? 'text-white' : 'text-foreground'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\\w+)/.exec(className || '');
            const codeString = String(children).replace(/\\n$/, '');
            
            // Generate a somewhat unique index for the copy button state based on content length
            // In a real app, you might want a more robust way to track this
            const codeIndex = codeString.length; 

            if (!inline && match) {
              return (
                <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50 text-xs text-muted-foreground">
                    <span className="font-mono font-medium">{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeString, codeIndex)}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      title="Copy code"
                    >
                      {copiedIndex === codeIndex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      padding: '1rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code
                className={`${
                  role === 'user' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-muted text-foreground'
                } px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom styling for other markdown elements
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-2 bg-muted/30 italic rounded-r">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline font-medium"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border">
              <table className="w-full text-sm text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50 text-xs uppercase font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Graph Visualization */}
      {graphData && (
        <div className="mt-4">
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors mb-2"
          >
            <Network className="w-4 h-4" />
            <span>{showGraph ? 'Ẩn' : 'Hiển thị'} Knowledge Graph</span>
          </button>
          
          {showGraph && (
            <div className="relative">
              <GraphView
                data={graphData}
                width={700}
                height={500}
                onNodeClick={(node) => {
                  console.log('Clicked node:', node);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

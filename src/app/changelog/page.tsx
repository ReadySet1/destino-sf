import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What's new | Destino SF",
  description:
    'Recent updates, new menu additions, and improvements to the Destino SF online experience.',
};

async function loadChangelog(): Promise<string> {
  const file = path.join(process.cwd(), 'CHANGELOG.md');
  return fs.readFile(file, 'utf8');
}

export default async function ChangelogPage() {
  const markdown = await loadChangelog();

  return (
    <div className="w-full bg-white text-gray-900 font-quicksand">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">What&rsquo;s new</h1>
          <p className="text-base text-gray-600">
            Recent updates and improvements to Destino SF. Check back to see what&rsquo;s shipped.
          </p>
        </header>

        <article className="space-y-4 text-gray-800 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="sr-only">{children}</h2>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl md:text-3xl font-semibold mt-10 mb-4 border-b border-gray-200 pb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-4">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="text-gray-800">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[#f77c22] underline underline-offset-2 hover:text-[#d96915]"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noreferrer noopener' : undefined}
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm font-mono">
                  {children}
                </code>
              ),
              hr: () => <hr className="my-8 border-gray-200" />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}

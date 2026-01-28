import { useLocation, Link } from "react-router-dom";
import { useLegalPage } from "@/hooks/useLegalPages";
import PageShell from "@/components/PageShell";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

// Map route paths to slugs
const routeToSlug: Record<string, string> = {
  "/terms": "terms",
  "/privacy": "privacy",
  "/content-policy": "content-policy",
  "/cookies": "cookies",
  "/copyright": "copyright",
  "/contact": "contact",
  "/refunds": "refunds",
  "/advertiser-terms": "advertiser-terms",
  "/creator-terms": "creator-terms",
};

export default function LegalPage() {
  const location = useLocation();
  const slug = routeToSlug[location.pathname] || "";
  const { data: page, isLoading, error } = useLegalPage(slug);

  return (
    <PageShell maxWidth="max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error || !page ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">
            This legal page is not available or has not been published yet.
          </p>
        </div>
      ) : (
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold mb-4 text-foreground">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1 text-muted-foreground">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1 text-muted-foreground">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              a: ({ href, children }) => (
                <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>
              ),
            }}
          >
            {page.markdown_content}
          </ReactMarkdown>
          <p className="text-sm text-muted-foreground mt-8 pt-4 border-t border-border">
            Last updated: {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </article>
      )}
    </PageShell>
  );
}

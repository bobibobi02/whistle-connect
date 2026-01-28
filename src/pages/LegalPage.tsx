import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLegalPage } from "@/hooks/useLegalPages";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Simple markdown to HTML converter (basic)
const renderMarkdown = (markdown: string) => {
  return markdown
    .split("\n\n")
    .map((block, i) => {
      if (block.startsWith("# ")) {
        return (
          <h1 key={i} className="text-3xl font-bold mb-4 text-foreground">
            {block.slice(2)}
          </h1>
        );
      }
      if (block.startsWith("## ")) {
        return (
          <h2 key={i} className="text-2xl font-semibold mt-6 mb-3 text-foreground">
            {block.slice(3)}
          </h2>
        );
      }
      if (block.startsWith("### ")) {
        return (
          <h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-foreground">
            {block.slice(4)}
          </h3>
        );
      }
      if (block.startsWith("- ")) {
        const items = block.split("\n").filter(line => line.startsWith("- "));
        return (
          <ul key={i} className="list-disc pl-6 mb-4 space-y-1 text-muted-foreground">
            {items.map((item, j) => (
              <li key={j}>{item.slice(2)}</li>
            ))}
          </ul>
        );
      }
      if (block.match(/^\d+\./)) {
        const items = block.split("\n").filter(line => line.match(/^\d+\./));
        return (
          <ol key={i} className="list-decimal pl-6 mb-4 space-y-1 text-muted-foreground">
            {items.map((item, j) => (
              <li key={j}>{item.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        );
      }
      return (
        <p key={i} className="mb-4 text-muted-foreground leading-relaxed">
          {block}
        </p>
      );
    });
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = useLegalPage(slug || "");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <main className="container max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
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
            {renderMarkdown(page.markdown_content)}
            <p className="text-sm text-muted-foreground mt-8 pt-4 border-t border-border">
              Last updated: {new Date(page.updated_at).toLocaleDateString()}
            </p>
          </article>
        )}
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}

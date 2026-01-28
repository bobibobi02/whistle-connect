import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useLegalPages, useUpdateLegalPage, usePublishAllLegalPages } from "@/hooks/useLegalPages";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  FileText,
  Eye,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function AdminLegal() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: pages, isLoading: pagesLoading } = useLegalPages();
  const updatePage = useUpdateLegalPage();
  const publishAll = usePublishAllLegalPages();

  const selectedPage = pages?.find(p => p.slug === selectedSlug);

  const handleSelectPage = (slug: string) => {
    const page = pages?.find(p => p.slug === slug);
    if (page) {
      setSelectedSlug(slug);
      setEditedTitle(page.title);
      setEditedContent(page.markdown_content);
      setShowPreview(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSlug) return;

    try {
      await updatePage.mutateAsync({
        slug: selectedSlug,
        title: editedTitle,
        markdown_content: editedContent,
      });
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedPage) return;

    try {
      await updatePage.mutateAsync({
        slug: selectedPage.slug,
        is_published: !selectedPage.is_published,
      });
      toast.success(selectedPage.is_published ? "Page unpublished" : "Page published");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handlePublishAll = async () => {
    try {
      await publishAll.mutateAsync();
      toast.success("All pages published");
    } catch {
      toast.error("Failed to publish");
    }
  };

  if (roleLoading || pagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell maxWidth="max-w-2xl">
        <div className="text-center py-8">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </PageShell>
    );
  }

  const publishedCount = pages?.filter(p => p.is_published).length || 0;
  const totalCount = pages?.length || 0;

  return (
    <PageShell maxWidth="max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/admin/go-live">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Go-Live
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Legal Pages</h1>
          <p className="text-muted-foreground">
            {publishedCount} of {totalCount} pages published
          </p>
        </div>
        <Button onClick={handlePublishAll} disabled={publishAll.isPending}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Publish All
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Page List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pages?.map((page) => (
              <button
                key={page.slug}
                onClick={() => handleSelectPage(page.slug)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedSlug === page.slug
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{page.title}</span>
                  <Badge variant={page.is_published ? "default" : "secondary"} className="ml-2 shrink-0">
                    {page.is_published ? "Live" : "Draft"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">/{page.slug}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-3">
          {selectedPage ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedPage.title}</CardTitle>
                    <CardDescription>/{selectedPage.slug}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="published">Published</Label>
                      <Switch
                        id="published"
                        checked={selectedPage.is_published}
                        onCheckedChange={handleTogglePublish}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? "Edit" : "Preview"}
                    </Button>
                    <Button onClick={handleSave} disabled={updatePage.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div className="prose prose-invert max-w-none p-4 bg-muted/30 rounded-lg min-h-[400px]">
                    {editedContent.split("\n\n").map((block, i) => {
                      if (block.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold">{block.slice(2)}</h1>;
                      if (block.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-4">{block.slice(3)}</h2>;
                      if (block.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-3">{block.slice(4)}</h3>;
                      return <p key={i} className="text-muted-foreground">{block}</p>;
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Content (Markdown)</Label>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a page to edit</p>
            </CardContent>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

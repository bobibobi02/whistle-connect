import { useState } from "react";
import { FileText, Trash2, Upload, Clock, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDrafts, useDeleteDraft, usePublishDraft, Draft } from "@/hooks/useDrafts";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftsDrawerProps {
  onLoadDraft: (draft: Draft) => void;
  trigger?: React.ReactNode;
}

const DraftsDrawer = ({ onLoadDraft, trigger }: DraftsDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);

  const { data: drafts, isLoading } = useDrafts();
  const deleteDraft = useDeleteDraft();
  const publishDraft = usePublishDraft();

  const handleLoad = (draft: Draft) => {
    onLoadDraft(draft);
    setOpen(false);
  };

  const handleDelete = (draft: Draft) => {
    setSelectedDraft(draft);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDraft) {
      deleteDraft.mutate(selectedDraft.id);
      setDeleteDialogOpen(false);
      setSelectedDraft(null);
    }
  };

  const handlePublish = (draft: Draft) => {
    publishDraft.mutate(draft.id);
    setOpen(false);
  };

  const getPreviewText = (draft: Draft) => {
    if (draft.content) {
      return draft.content.slice(0, 100) + (draft.content.length > 100 ? "..." : "");
    }
    if (draft.image_url) return "📷 Image post";
    if (draft.video_url) return "🎬 Video post";
    if (draft.live_url) return "📺 Live stream";
    return "No content";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Drafts
              {drafts && drafts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {drafts.length}
                </Badge>
              )}
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Drafts
            </SheetTitle>
            <SheetDescription>
              Continue editing or publish your saved drafts.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : drafts && drafts.length > 0 ? (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoad(draft)}>
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {draft.title || "Untitled Draft"}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {getPreviewText(draft)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {draft.community_icon || "💬"} w/{draft.community}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                        </span>
                        {draft.is_nsfw && <Badge variant="destructive" className="text-xs py-0">NSFW</Badge>}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleLoad(draft)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Load & Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePublish(draft)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Publish Now
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(draft)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No drafts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your saved drafts will appear here
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedDraft?.title || 'Untitled Draft'}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DraftsDrawer;

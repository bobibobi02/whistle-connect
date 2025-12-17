import { useState } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  useCommunityFlairs,
  useCreateCommunityFlair,
  useUpdateCommunityFlair,
  useDeleteCommunityFlair,
  CommunityFlair,
} from "@/hooks/useCommunityFlairs";

interface CommunityFlairManagerProps {
  communityId: string;
}

const PRESET_COLORS = [
  { color: "#FF5C7A", bg: "#1E1A18" },
  { color: "#34D399", bg: "#1E1A18" },
  { color: "#93C5FD", bg: "#1E1A18" },
  { color: "#FBBF24", bg: "#1E1A18" },
  { color: "#A78BFA", bg: "#1E1A18" },
  { color: "#FBFBFC", bg: "#FF5C7A" },
  { color: "#FBFBFC", bg: "#34D399" },
  { color: "#FBFBFC", bg: "#93C5FD" },
];

const CommunityFlairManager = ({ communityId }: CommunityFlairManagerProps) => {
  const [editingFlair, setEditingFlair] = useState<CommunityFlair | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteFlairId, setDeleteFlairId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#FF5C7A");
  const [bgColor, setBgColor] = useState("#1E1A18");
  const [isModOnly, setIsModOnly] = useState(false);

  const { data: flairs, isLoading } = useCommunityFlairs(communityId);
  const createFlair = useCreateCommunityFlair();
  const updateFlair = useUpdateCommunityFlair();
  const deleteFlair = useDeleteCommunityFlair();

  const handleOpenDialog = (flair?: CommunityFlair) => {
    if (flair) {
      setEditingFlair(flair);
      setName(flair.name);
      setColor(flair.color);
      setBgColor(flair.background_color);
      setIsModOnly(flair.is_mod_only);
    } else {
      setEditingFlair(null);
      setName("");
      setColor("#FF5C7A");
      setBgColor("#1E1A18");
      setIsModOnly(false);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingFlair) {
      updateFlair.mutate({
        flairId: editingFlair.id,
        communityId,
        name: name.trim(),
        color,
        backgroundColor: bgColor,
        isModOnly,
      });
    } else {
      createFlair.mutate({
        communityId,
        name: name.trim(),
        color,
        backgroundColor: bgColor,
        isModOnly,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteFlairId) {
      deleteFlair.mutate({ flairId: deleteFlairId, communityId });
      setDeleteFlairId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-secondary rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Post Flairs
          </h3>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Flair
          </Button>
        </div>

        {flairs && flairs.length > 0 ? (
          <div className="space-y-2">
            {flairs.map((flair) => (
              <div
                key={flair.id}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 group"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: flair.background_color,
                      color: flair.color,
                      borderColor: flair.color,
                    }}
                    variant="outline"
                  >
                    {flair.name}
                  </Badge>
                  {flair.is_mod_only && (
                    <span className="text-xs text-muted-foreground">(Mod only)</span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleOpenDialog(flair)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => setDeleteFlairId(flair.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No flairs created yet
          </p>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlair ? "Edit Flair" : "Create Flair"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="Flair name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
              />
            </div>

            <div>
              <Label>Preview</Label>
              <div className="mt-2">
                <Badge
                  style={{
                    backgroundColor: bgColor,
                    color: color,
                    borderColor: color,
                  }}
                  variant="outline"
                >
                  {name || "Flair preview"}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Preset Colors</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((preset, i) => (
                  <button
                    key={i}
                    className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                    style={{ backgroundColor: preset.bg }}
                    onClick={() => {
                      setColor(preset.color);
                      setBgColor(preset.bg);
                    }}
                  >
                    <span
                      className="block w-4 h-4 mx-auto rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mod-only"
                checked={isModOnly}
                onCheckedChange={setIsModOnly}
              />
              <Label htmlFor="mod-only">Moderators only</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || createFlair.isPending || updateFlair.isPending}
            >
              {editingFlair ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFlairId} onOpenChange={() => setDeleteFlairId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flair</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flair? Posts using this flair will have their flair removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CommunityFlairManager;

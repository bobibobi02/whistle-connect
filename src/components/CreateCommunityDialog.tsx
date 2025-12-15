import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCreateCommunity } from "@/hooks/useCommunities";

const EMOJI_OPTIONS = ["💬", "🖥️", "🎮", "🎬", "🎵", "⚽", "🍕", "🔬", "🎨", "📚", "✈️", "💪", "🎭", "🌍", "💡", "🚀"];

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCommunityDialog = ({ open, onOpenChange }: CreateCommunityDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createCommunity = useCreateCommunity();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("💬");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    const result = await createCommunity.mutateAsync({
      name: name.trim(),
      displayName: name.trim(),
      description: description.trim(),
      icon: selectedIcon,
      userId: user.id,
    });

    if (result) {
      onOpenChange(false);
      setName("");
      setDescription("");
      setSelectedIcon("💬");
      navigate(`/c/${result.name}`);
    }
  };

  const slugifiedName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              placeholder="e.g., Photography"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            {name && (
              <p className="text-xs text-muted-foreground">
                URL: w/{slugifiedName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is your community about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    selectedIcon === emoji
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createCommunity.isPending}
              className="bg-gradient-warm hover:opacity-90"
            >
              {createCommunity.isPending ? "Creating..." : "Create Community"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityDialog;

import { Image, Link2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CreatePostBar = () => {
  return (
    <div className="bg-card rounded-xl shadow-card p-4 mb-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <span className="text-sm font-semibold text-muted-foreground">U</span>
        </div>
        <Input
          placeholder="Create a post..."
          className="flex-1 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Image className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Link2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostBar;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useStartConversation } from "@/hooks/useMessages";

interface MessageButtonProps {
  userId: string;
  username?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

const MessageButton = ({ userId, username, variant = "outline", size = "sm" }: MessageButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const startConversation = useStartConversation();

  const handleClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setOpen(true);
  };

  const handleSend = () => {
    startConversation.mutate(
      { recipientId: userId, message },
      {
        onSuccess: ({ conversationId }) => {
          setOpen(false);
          setMessage("");
          navigate(`/messages/${conversationId}`);
        },
      }
    );
  };

  // Don't show button for own profile
  if (user?.id === userId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={handleClick}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>
            Start a conversation with {username || "this user"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="bg-secondary/50 resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={startConversation.isPending || !message.trim()}>
            {startConversation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageButton;

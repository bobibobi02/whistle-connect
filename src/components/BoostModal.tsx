import { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBoostCheckout } from "@/hooks/usePostBoosts";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [200, 500, 1000]; // cents

interface BoostModalProps {
  postId: string;
  postTitle: string;
  trigger?: React.ReactNode;
}

const BoostModal = ({ postId, postTitle, trigger }: BoostModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(200);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const createCheckout = useCreateBoostCheckout();

  const amountCents = selectedAmount || (parseFloat(customAmount) * 100) || 0;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleBoost = async () => {
    if (!user) {
      toast.info("Sign in to boost posts", {
        action: {
          label: "Sign in",
          onClick: () => navigate("/auth"),
        },
      });
      setIsOpen(false);
      return;
    }

    if (amountCents < 100) return;

    try {
      await createCheckout.mutateAsync({
        postId,
        amountCents,
        message: message.trim() || undefined,
        isPublic,
      });
      // Note: redirect to Stripe happens in onSuccess, so we don't close dialog here
    } catch (error) {
      // Error is already handled in the mutation with toast
      console.error("[BoostModal] Checkout failed:", error);
      // Don't close modal on error so user can retry
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Boost</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Boost this Post
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            Support "{postTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount selection */}
          <div className="space-y-3">
            <Label>Select amount</Label>
            <div className="flex gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className={cn(
                    "flex-1",
                    selectedAmount === amount && "bg-gradient-warm"
                  )}
                  onClick={() => handlePresetClick(amount)}
                >
                  €{(amount / 100).toFixed(0)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Or custom:</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="boost-message">Message (optional)</Label>
            <Textarea
              id="boost-message"
              placeholder="Leave a supportive message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-boost">Make message public</Label>
              <p className="text-xs text-muted-foreground">
                Others can see your message on the post
              </p>
            </div>
            <Switch
              id="public-boost"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleBoost}
            disabled={amountCents < 100 || createCheckout.isPending}
            className="w-full bg-gradient-warm hover:opacity-90"
          >
            {createCheckout.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Boost for €{(amountCents / 100).toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostModal;

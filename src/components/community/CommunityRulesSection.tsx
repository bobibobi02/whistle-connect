import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  useCommunityRules,
  useCreateCommunityRule,
  useUpdateCommunityRule,
  useDeleteCommunityRule,
  CommunityRule,
} from "@/hooks/useCommunityRules";

interface CommunityRulesSectionProps {
  communityId: string;
  isMod: boolean;
}

const CommunityRulesSection = ({ communityId, isMod }: CommunityRulesSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingRule, setEditingRule] = useState<CommunityRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: rules, isLoading } = useCommunityRules(communityId);
  const createRule = useCreateCommunityRule();
  const updateRule = useUpdateCommunityRule();
  const deleteRule = useDeleteCommunityRule();

  const handleOpenDialog = (rule?: CommunityRule) => {
    if (rule) {
      setEditingRule(rule);
      setTitle(rule.title);
      setDescription(rule.description || "");
    } else {
      setEditingRule(null);
      setTitle("");
      setDescription("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (editingRule) {
      updateRule.mutate({
        ruleId: editingRule.id,
        communityId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
    } else {
      createRule.mutate({
        communityId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteRuleId) {
      deleteRule.mutate({ ruleId: deleteRuleId, communityId });
      setDeleteRuleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4">
        <div className="h-4 w-24 bg-secondary rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-secondary rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <h3 className="text-sm font-semibold text-muted-foreground">
                COMMUNITY RULES
              </h3>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {rules && rules.length > 0 ? (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 group"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {rule.rule_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{rule.title}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rule.description}
                        </p>
                      )}
                    </div>
                    {isMod && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => setDeleteRuleId(rule.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No rules yet
                </p>
              )}
              {isMod && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Rule title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Rule description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || createRule.isPending || updateRule.isPending}
            >
              {editingRule ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
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

export default CommunityRulesSection;

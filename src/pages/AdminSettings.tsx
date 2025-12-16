import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, UserCog, Lock, Search, Plus, X, Clock, History, Trash2, UserPlus, UserMinus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, AppRole } from "@/hooks/useUserRoles";
import { useUsersWithRoles, useAssignRole, useRemoveRole, UserWithRoles } from "@/hooks/useUserManagement";
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
import { formatDistanceToNow } from "date-fns";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("moderator");
  const [activeTab, setActiveTab] = useState("users");

  const { data: users, isLoading: usersLoading } = useUsersWithRoles();
  const { data: auditLogs, isLoading: logsLoading } = useAuditLogs(100);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  if (authLoading || rolesLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
        <main className="container max-w-2xl mx-auto px-4 py-16 text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access admin settings.
            This area is restricted to administrators only.
          </p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
      </div>
    );
  }

  const filteredUsers = users?.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAssignRole = (userId: string, username?: string) => {
    assignRole.mutate({ userId, role: selectedRole, username });
  };

  const handleRemoveRole = (userId: string, role: AppRole, username?: string) => {
    removeRole.mutate({ userId, role, username });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Manage user roles and view audit logs</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="users" className="gap-2">
              <Shield className="h-4 w-4" />
              User Roles
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              Audit Logs ({auditLogs?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  User Role Management
                </CardTitle>
                <CardDescription>Assign or remove moderator and admin roles from users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {filteredUsers.map((userItem) => (
                        <UserRoleCard
                          key={userItem.user_id}
                          user={userItem}
                          currentUserId={user.id}
                          selectedRole={selectedRole}
                          onSelectRole={setSelectedRole}
                          onAssignRole={handleAssignRole}
                          onRemoveRole={handleRemoveRole}
                          isAssigning={assignRole.isPending}
                          isRemoving={removeRole.isPending}
                          getRoleBadgeVariant={getRoleBadgeVariant}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>Track all admin and moderator actions for accountability</CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogsList logs={auditLogs || []} loading={logsLoading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

interface UserRoleCardProps {
  user: UserWithRoles;
  currentUserId: string;
  selectedRole: AppRole;
  onSelectRole: (role: AppRole) => void;
  onAssignRole: (userId: string, username?: string) => void;
  onRemoveRole: (userId: string, role: AppRole, username?: string) => void;
  isAssigning: boolean;
  isRemoving: boolean;
  getRoleBadgeVariant: (role: AppRole) => "default" | "secondary" | "destructive" | "outline";
}

const UserRoleCard = ({
  user,
  currentUserId,
  selectedRole,
  onSelectRole,
  onAssignRole,
  onRemoveRole,
  isAssigning,
  isRemoving,
  getRoleBadgeVariant
}: UserRoleCardProps) => {
  const displayName = user.display_name || user.username || "Unknown User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isCurrentUser = user.user_id === currentUserId;

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {displayName}
              {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              @{user.username || 'unknown'} · Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <div key={role} className="flex items-center gap-1">
                <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                {!isCurrentUser && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={isRemoving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {role} role?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the {role} role from {displayName}. They will lose associated permissions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onRemoveRole(user.user_id, role, user.username || undefined)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove Role
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          ) : (
            <Badge variant="outline">No roles</Badge>
          )}

          {!isCurrentUser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Role
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Assign role to {displayName}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Select a role to assign to this user.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Select value={selectedRole} onValueChange={(v) => onSelectRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onAssignRole(user.user_id, user.username || undefined)}
                    disabled={isAssigning || user.roles.includes(selectedRole)}
                  >
                    {user.roles.includes(selectedRole) ? 'Already has role' : 'Assign Role'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

const AuditLogsList = ({ logs, loading }: { logs: AuditLog[]; loading: boolean }) => {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No audit logs found</div>;
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'delete_post':
      case 'delete_comment':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'assign_role':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'remove_role':
        return <UserMinus className="h-4 w-4 text-orange-500" />;
      case 'resolve_report':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismiss_report':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'delete_post': return 'Deleted post';
      case 'delete_comment': return 'Deleted comment';
      case 'assign_role': return 'Assigned role';
      case 'remove_role': return 'Removed role';
      case 'resolve_report': return 'Resolved report';
      case 'dismiss_report': return 'Dismissed report';
      default: return action;
    }
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'delete_post':
      case 'delete_comment':
        return 'destructive';
      case 'assign_role':
        return 'default';
      case 'remove_role':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getActionIcon(log.action)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {getActionLabel(log.action)}
                  </Badge>
                  <Badge variant="outline">{log.target_type}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">
                    {log.actor?.display_name || log.actor?.username || 'Unknown'}
                  </span>
                  {' '}performed action on {log.target_type}
                  {log.target_id && <span className="text-muted-foreground text-xs ml-1">(ID: {log.target_id.slice(0, 8)}...)</span>}
                </p>
                {log.details && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    {log.details.role && <p>Role: <Badge variant="outline" className="text-xs">{log.details.role}</Badge></p>}
                    {log.details.username && <p>Target user: @{log.details.username}</p>}
                    {log.details.title && <p>Post title: {log.details.title}</p>}
                    {log.details.content_preview && <p>Content: {log.details.content_preview}...</p>}
                    {log.details.status && <p>Status: {log.details.status}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default AdminSettings;

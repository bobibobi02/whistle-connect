import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useMessages, useSendMessage, useMarkAsRead } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: messages, isLoading: messagesLoading } = useMessages(conversationId || "");
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Mark as read when opening a conversation
  useEffect(() => {
    if (conversationId && user) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSend = () => {
    if (!newMessage.trim() || !conversationId) return;
    sendMessage.mutate(
      { conversationId, content: newMessage },
      {
        onSuccess: () => setNewMessage(""),
      }
    );
  };

  const activeConversation = conversations?.find((c) => c.id === conversationId);
  const otherParticipant = activeConversation?.participants[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <div className="flex-1 container max-w-6xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to feed</span>
        </Link>

        <div className="flex h-[calc(100vh-200px)] gap-4 bg-card rounded-xl shadow-card overflow-hidden">
          {/* Conversations List */}
          <div className={cn(
            "w-full md:w-80 border-r border-border flex flex-col",
            conversationId && "hidden md:flex"
          )}>
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Messages</h2>
            </div>
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : conversations?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation from someone's profile</p>
                </div>
              ) : (
                conversations?.map((conv) => {
                  const participant = conv.participants[0];
                  const displayName = participant?.display_name || participant?.username || "User";
                  
                  return (
                    <Link
                      key={conv.id}
                      to={`/messages/${conv.id}`}
                      className={cn(
                        "flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors",
                        conv.id === conversationId && "bg-secondary"
                      )}
                    >
                      <Avatar>
                        <AvatarImage src={participant?.avatar_url || undefined} />
                        <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{displayName}</span>
                          {conv.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div className={cn(
            "flex-1 flex flex-col",
            !conversationId && "hidden md:flex"
          )}>
            {conversationId ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Link to="/messages" className="md:hidden">
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  {otherParticipant && (
                    <>
                      <Avatar>
                        <AvatarImage src={otherParticipant.avatar_url || undefined} />
                        <AvatarFallback>
                          {(otherParticipant.display_name || otherParticipant.username || "U")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {otherParticipant.display_name || otherParticipant.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{otherParticipant.username}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages?.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg px-4 py-2",
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary"
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={cn(
                                "text-xs mt-1",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-secondary/50"
                    />
                    <Button type="submit" disabled={sendMessage.isPending || !newMessage.trim()}>
                      {sendMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose from your existing conversations on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;

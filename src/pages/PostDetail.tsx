import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import CommunitySidebar from "@/components/CommunitySidebar";
import Comment, { CommentData } from "@/components/Comment";
import { cn } from "@/lib/utils";

const mockPost = {
  id: "1",
  community: "technology",
  communityIcon: "🖥️",
  author: "techexplorer",
  timeAgo: "2h ago",
  title: "OpenAI just announced GPT-5 with unprecedented reasoning capabilities",
  content: `The new model shows remarkable improvements in logical reasoning, mathematical problem-solving, and creative tasks. Early benchmarks suggest it outperforms previous versions by a significant margin.

Key highlights from the announcement:
- 3x improvement in complex reasoning tasks
- Near-human performance on graduate-level mathematics
- Significantly reduced hallucination rates
- New multimodal capabilities for code and image understanding

What does this mean for the future of AI? Let's discuss in the comments.`,
  upvotes: 15234,
  comments: 2341,
};

const mockComments: CommentData[] = [
  {
    id: "c1",
    author: "ai_researcher",
    timeAgo: "1h ago",
    content: "This is genuinely impressive. I've been following the benchmarks closely and the jump in reasoning capabilities is unprecedented. The fact that it can now handle multi-step mathematical proofs is a game changer.",
    upvotes: 892,
    replies: [
      {
        id: "c1-1",
        author: "skeptical_dev",
        timeAgo: "45m ago",
        content: "I'm cautiously optimistic. We've seen impressive demos before that didn't quite live up to the hype in real-world usage. Would love to see more independent testing.",
        upvotes: 234,
        replies: [
          {
            id: "c1-1-1",
            author: "ai_researcher",
            timeAgo: "30m ago",
            content: "Fair point! The independent benchmarks should be out next week. I'm particularly interested in seeing how it performs on novel problems not in its training data.",
            upvotes: 156,
            replies: [
              {
                id: "c1-1-1-1",
                author: "ml_engineer",
                timeAgo: "15m ago",
                content: "The contamination issue is real. We need benchmarks that are generated after the training cutoff date.",
                upvotes: 89,
              }
            ]
          },
          {
            id: "c1-1-2",
            author: "techblogger",
            timeAgo: "20m ago",
            content: "Exactly. Remember GPT-4's launch? The initial hype was massive but it took months to understand its true capabilities and limitations.",
            upvotes: 78,
          }
        ]
      },
      {
        id: "c1-2",
        author: "startup_founder",
        timeAgo: "30m ago",
        content: "Already thinking about how to integrate this into our product. The reduced hallucination rate alone could be transformative for enterprise use cases.",
        upvotes: 167,
      }
    ]
  },
  {
    id: "c2",
    author: "philosophy_major",
    timeAgo: "50m ago",
    content: "The philosophical implications are fascinating. If AI can now reason at near-human levels, what does that say about the nature of intelligence? Are we just complex pattern matchers too?",
    upvotes: 445,
    replies: [
      {
        id: "c2-1",
        author: "neuroscientist",
        timeAgo: "35m ago",
        content: "Interesting question, but I'd argue that biological intelligence and artificial intelligence are fundamentally different in their substrates and mechanisms, even if they can produce similar outputs.",
        upvotes: 223,
      }
    ]
  },
  {
    id: "c3",
    author: "open_source_advocate",
    timeAgo: "25m ago",
    content: "Still waiting for open weights models to catch up. Competition and transparency are crucial for the healthy development of this technology.",
    upvotes: 312,
  }
];

const PostDetail = () => {
  const { postId } = useParams();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [upvotes, setUpvotes] = useState(mockPost.upvotes);
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null);
  const [commentText, setCommentText] = useState("");

  const handleUpvote = () => {
    if (voteState === "up") {
      setUpvotes(mockPost.upvotes);
      setVoteState(null);
    } else {
      setUpvotes(mockPost.upvotes + 1);
      setVoteState("up");
    }
  };

  const handleDownvote = () => {
    if (voteState === "down") {
      setUpvotes(mockPost.upvotes);
      setVoteState(null);
    } else {
      setUpvotes(mockPost.upvotes - 1);
      setVoteState("down");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            {/* Back button */}
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to feed</span>
            </Link>

            {/* Post */}
            <article className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground text-lg font-semibold">
                      {mockPost.communityIcon}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold hover:text-primary cursor-pointer transition-colors">
                        w/{mockPost.community}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Posted by u/{mockPost.author} · {mockPost.timeAgo}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                {/* Title & Content */}
                <h1 className="text-xl sm:text-2xl font-bold mb-4 leading-tight">
                  {mockPost.title}
                </h1>
                
                <div className="prose prose-sm max-w-none text-foreground/90 mb-6">
                  {mockPost.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  {/* Votes */}
                  <div className="flex items-center gap-0.5 bg-secondary/50 rounded-full px-1">
                    <button
                      onClick={handleUpvote}
                      className={cn(
                        "vote-button vote-button-up",
                        voteState === "up" && "active animate-vote-pop"
                      )}
                    >
                      <ArrowBigUp className={cn("h-5 w-5", voteState === "up" && "fill-current")} />
                    </button>
                    <span className={cn(
                      "text-sm font-semibold min-w-[2rem] text-center",
                      voteState === "up" && "text-upvote",
                      voteState === "down" && "text-downvote"
                    )}>
                      {upvotes.toLocaleString()}
                    </span>
                    <button
                      onClick={handleDownvote}
                      className={cn(
                        "vote-button vote-button-down",
                        voteState === "down" && "active animate-vote-pop"
                      )}
                    >
                      <ArrowBigDown className={cn("h-5 w-5", voteState === "down" && "fill-current")} />
                    </button>
                  </div>

                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{mockPost.comments}</span>
                  </Button>

                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Share</span>
                  </Button>

                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full ml-auto">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>

            {/* Comment input */}
            <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in" style={{ animationDelay: "50ms" }}>
              <Textarea
                placeholder="What are your thoughts?"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-end mt-3">
                <Button disabled={!commentText.trim()}>Comment</Button>
              </div>
            </div>

            {/* Comments section */}
            <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <h2 className="font-semibold mb-4">Comments ({mockPost.comments.toLocaleString()})</h2>
              <div className="space-y-4">
                {mockComments.map((comment) => (
                  <Comment key={comment.id} comment={comment} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <CommunitySidebar className="hidden lg:block sticky top-24 h-fit" />
        </div>
      </main>
    </div>
  );
};

export default PostDetail;

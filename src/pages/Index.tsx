import { useState } from "react";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import CommunitySidebar from "@/components/CommunitySidebar";
import CreatePostBar from "@/components/CreatePostBar";
import MobileNav from "@/components/MobileNav";

const mockPosts = [
  {
    id: "1",
    community: "technology",
    communityIcon: "🖥️",
    author: "techexplorer",
    timeAgo: "2h ago",
    title: "OpenAI just announced GPT-5 with unprecedented reasoning capabilities",
    content: "The new model shows remarkable improvements in logical reasoning, mathematical problem-solving, and creative tasks. Early benchmarks suggest it outperforms previous versions by a significant margin...",
    upvotes: 15234,
    comments: 2341,
  },
  {
    id: "2",
    community: "gaming",
    communityIcon: "🎮",
    author: "gamerninja",
    timeAgo: "4h ago",
    title: "Finally completed Elden Ring after 200+ hours. Here's my journey.",
    content: "What an incredible experience. From the first steps in Limgrave to the final boss, every moment felt rewarding. Sharing my favorite builds and hidden secrets I discovered along the way.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
    upvotes: 8721,
    comments: 892,
  },
  {
    id: "3",
    community: "food",
    communityIcon: "🍕",
    author: "chefjulia",
    timeAgo: "6h ago",
    title: "Made homemade ramen from scratch - 48 hour broth included!",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop",
    upvotes: 5432,
    comments: 421,
  },
  {
    id: "4",
    community: "movies",
    communityIcon: "🎬",
    author: "cinephile99",
    timeAgo: "8h ago",
    title: "Dune Part Two is a masterpiece of modern cinema - A deep dive analysis",
    content: "Denis Villeneuve has crafted something truly special. The visual storytelling, Hans Zimmer's score, and the performances all come together to create an unforgettable experience. Let's discuss the themes...",
    upvotes: 12567,
    comments: 1823,
  },
  {
    id: "5",
    community: "music",
    communityIcon: "🎵",
    author: "melodylover",
    timeAgo: "10h ago",
    title: "Discovered this underground artist and they deserve way more recognition",
    content: "Their blend of indie folk with electronic elements creates something entirely unique. I've been listening to their album on repeat for the past week. Sharing my favorite tracks and why they stand out.",
    upvotes: 3245,
    comments: 287,
  },
];

const Index = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Feed */}
          <div className="flex-1 max-w-2xl">
            <CreatePostBar />
            <div className="space-y-4">
              {mockPosts.map((post, index) => (
                <PostCard key={post.id} {...post} index={index} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <CommunitySidebar className="hidden lg:block sticky top-24 h-fit" />
        </div>
      </main>
    </div>
  );
};

export default Index;

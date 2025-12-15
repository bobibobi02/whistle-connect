import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Image, X, Upload, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useCreatePost } from "@/hooks/usePosts";
import { useImageUpload } from "@/hooks/useImageUpload";
import { cn } from "@/lib/utils";

const communities = [
  { value: "general", label: "General", icon: "💬" },
  { value: "technology", label: "Technology", icon: "🖥️" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "food", label: "Food", icon: "🍕" },
  { value: "movies", label: "Movies", icon: "🎬" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "sports", label: "Sports", icon: "⚽" },
  { value: "art", label: "Art", icon: "🎨" },
];

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(300, "Title must be less than 300 characters"),
  content: z.string().max(10000, "Content must be less than 10000 characters").optional(),
  image_url: z.string().optional(),
  community: z.string().min(1, "Please select a community"),
});

type PostFormData = z.infer<typeof postSchema>;

const CreatePost = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createPost = useCreatePost();
  const { uploadImage, isUploading, progress } = useImageUpload({ bucket: "post-images", maxSizeMB: 5 });

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      image_url: "",
      community: "general",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleFileSelect = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      form.setValue("image_url", url);
      setImagePreview(url);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = () => {
    form.setValue("image_url", "");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (data: PostFormData) => {
    const community = communities.find(c => c.value === data.community);
    createPost.mutate(
      {
        title: data.title,
        content: data.content || undefined,
        image_url: data.image_url || undefined,
        community: data.community,
        community_icon: community?.icon,
      },
      {
        onSuccess: () => navigate("/"),
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to feed</span>
        </Link>

        <div className="bg-card rounded-xl shadow-card p-6 animate-fade-in">
          <h1 className="text-2xl font-bold mb-6">Create a post</h1>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Community Select */}
            <div className="space-y-2">
              <Label htmlFor="community">Community</Label>
              <Select
                value={form.watch("community")}
                onValueChange={(value) => form.setValue("community", value)}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((community) => (
                    <SelectItem key={community.value} value={community.value}>
                      <span className="flex items-center gap-2">
                        <span>{community.icon}</span>
                        <span>w/{community.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.community && (
                <p className="text-sm text-destructive">{form.formState.errors.community.message}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="An interesting title..."
                {...form.register("title")}
                className="bg-secondary/50 border-border/50"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content (optional)</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts..."
                rows={6}
                {...form.register("content")}
                className="bg-secondary/50 border-border/50 resize-none"
              />
              {form.formState.errors.content && (
                <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image (optional)</Label>
              
              {!imagePreview && !isUploading ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-secondary">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop an image here or click to upload</p>
                      <p className="text-sm text-muted-foreground">JPG, PNG, GIF, WebP up to 5MB</p>
                    </div>
                  </div>
                </div>
              ) : isUploading ? (
                <div className="border rounded-lg p-6 bg-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">Uploading image...</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : (
                <div className="relative">
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={imagePreview!}
                      alt="Preview"
                      className="w-full h-auto max-h-80 object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-warm hover:opacity-90 transition-opacity shadow-glow"
                disabled={createPost.isPending || isUploading}
              >
                {createPost.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreatePost;

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Image, Video, X, Upload, Loader2, Play, Settings2, Radio } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useCreatePost } from "@/hooks/usePosts";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useVideoCompression, COMPRESSION_PRESETS, CompressionPreset } from "@/hooks/useVideoCompression";
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

// YouTube and Twitch URL validation regex
const liveUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtube\.com\/live\/[\w-]+|youtu\.be\/[\w-]+|twitch\.tv\/\w+|twitch\.tv\/videos\/\d+)/i;

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(300, "Title must be less than 300 characters"),
  content: z.string().max(10000, "Content must be less than 10000 characters").optional(),
  image_url: z.string().optional(),
  video_url: z.string().optional(),
  video_mime_type: z.string().optional(),
  video_size_bytes: z.number().optional(),
  video_duration_seconds: z.number().optional(),
  poster_image_url: z.string().optional(),
  live_url: z.string().optional().refine(
    (val) => !val || liveUrlPattern.test(val),
    { message: "Please enter a valid YouTube or Twitch URL" }
  ),
  community: z.string().min(1, "Please select a community"),
});

type PostFormData = z.infer<typeof postSchema>;

const CreatePost = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaTab, setMediaTab] = useState<"image" | "video" | "live">("image");
  const [enableCompression, setEnableCompression] = useState(false);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('medium');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const createPost = useCreatePost();
  const { uploadImage, isUploading: isUploadingImage, progress: imageProgress } = useImageUpload({ bucket: "post-images", maxSizeMB: 5 });
  const { 
    uploadVideo, 
    isUploading: isUploadingVideo, 
    progress: videoProgress, 
    uploadStage,
    acceptedTypes, 
    maxSizeMB 
  } = useVideoUpload({ maxSizeMB: 500, enableModeration: true, frameSampleCount: 5 });
  const {
    compressWithPreset,
    isCompressing,
    progress: compressionProgress,
    presets,
  } = useVideoCompression();

  const isUploading = isUploadingImage || isUploadingVideo || isCompressing;
  const uploadProgress = isCompressing ? compressionProgress : (isUploadingImage ? imageProgress : videoProgress);
  const currentStage = isCompressing ? 'Compressing video...' : uploadStage;

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      image_url: "",
      video_url: "",
      live_url: "",
      community: "general",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleImageSelect = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      form.setValue("image_url", url);
      setImagePreview(url);
      // Clear video if image is selected
      form.setValue("video_url", "");
      form.setValue("video_mime_type", undefined);
      form.setValue("video_size_bytes", undefined);
      form.setValue("video_duration_seconds", undefined);
      form.setValue("poster_image_url", undefined);
      setVideoPreview(null);
      setVideoPoster(null);
    }
  };

  const handleVideoSelect = async (file: File) => {
    let fileToUpload = file;
    
    // Compress if enabled
    if (enableCompression) {
      const result = await compressWithPreset(file, compressionPreset);
      if (result) {
        fileToUpload = new File([result.blob], file.name.replace(/\.[^.]+$/, '.webm'), {
          type: result.blob.type,
        });
      }
    }
    
    const metadata = await uploadVideo(fileToUpload);
    if (metadata) {
      form.setValue("video_url", metadata.url);
      form.setValue("video_mime_type", metadata.mimeType);
      form.setValue("video_size_bytes", metadata.sizeBytes);
      form.setValue("video_duration_seconds", metadata.durationSeconds);
      form.setValue("poster_image_url", metadata.posterUrl);
      setVideoPreview(metadata.url);
      setVideoPoster(metadata.posterUrl || null);
      form.setValue("image_url", "");
      setImagePreview(null);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "image") {
        handleImageSelect(file);
      } else {
        handleVideoSelect(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setMediaTab("image");
        handleImageSelect(file);
      } else if (file.type.startsWith("video/")) {
        setMediaTab("video");
        handleVideoSelect(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeMedia = () => {
    form.setValue("image_url", "");
    form.setValue("video_url", "");
    form.setValue("video_mime_type", undefined);
    form.setValue("video_size_bytes", undefined);
    form.setValue("video_duration_seconds", undefined);
    form.setValue("poster_image_url", undefined);
    form.setValue("live_url", "");
    setImagePreview(null);
    setVideoPreview(null);
    setVideoPoster(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = (data: PostFormData) => {
    const community = communities.find(c => c.value === data.community);
    createPost.mutate(
      {
        title: data.title,
        content: data.content || undefined,
        image_url: data.image_url || undefined,
        video_url: data.video_url || undefined,
        video_mime_type: data.video_mime_type,
        video_size_bytes: data.video_size_bytes,
        video_duration_seconds: data.video_duration_seconds,
        poster_image_url: data.poster_image_url,
        live_url: data.live_url || undefined,
        community: data.community,
        community_icon: community?.icon,
      },
      {
        onSuccess: () => navigate("/"),
      }
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasImage = !!imagePreview;
  const hasVideo = !!videoPreview;
  const hasMedia = hasImage || hasVideo;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <main className="container max-w-2xl mx-auto px-4 py-6">
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

            {/* Media Upload */}
            <div className="space-y-2">
              <Label>Media (optional)</Label>
              
              {!hasMedia && !isUploading ? (
                <Tabs value={mediaTab} onValueChange={(v) => setMediaTab(v as "image" | "video" | "live")}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="image" className="gap-2">
                      <Image className="h-4 w-4" />
                      Image
                    </TabsTrigger>
                    <TabsTrigger value="video" className="gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="live" className="gap-2">
                      <Radio className="h-4 w-4" />
                      Live Stream
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image">
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => imageInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
                      )}
                    >
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileInput(e, "image")}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-secondary">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Drop an image here or click to upload</p>
                          <p className="text-sm text-muted-foreground">JPG, PNG, GIF, WebP up to 5MB</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="video">
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => videoInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
                      )}
                    >
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept={acceptedTypes}
                        onChange={(e) => handleFileInput(e, "video")}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-secondary">
                          <Video className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Drop a video here or click to upload</p>
                          <p className="text-sm text-muted-foreground">MP4, WebM, MOV up to {maxSizeMB}MB</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="live">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-3 rounded-full bg-destructive/10">
                            <Radio className="h-6 w-6 text-destructive" />
                          </div>
                          <div className="space-y-2 w-full max-w-md">
                            <p className="font-medium">Add a Live Stream</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              Paste a YouTube or Twitch URL to embed a live stream
                            </p>
                            <Input
                              placeholder="https://youtube.com/watch?v=... or https://twitch.tv/..."
                              {...form.register("live_url")}
                              className="bg-secondary/50 border-border/50"
                            />
                            {form.formState.errors.live_url && (
                              <p className="text-sm text-destructive">{form.formState.errors.live_url.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Supported: YouTube (live, videos, shorts) and Twitch (channels, VODs)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : isUploading ? (
                <div className="border rounded-lg p-6 bg-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {isUploadingImage ? "Uploading image" : currentStage || "Processing video"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(uploadProgress)}% complete
                      </span>
                    </div>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              ) : hasImage ? (
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
                    onClick={removeMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : hasVideo ? (
                <div className="relative">
                  <div className="rounded-lg overflow-hidden border border-border bg-black">
                    {videoPoster ? (
                      <div className="relative">
                        <img
                          src={videoPoster}
                          alt="Video thumbnail"
                          className="w-full h-auto max-h-80 object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="h-6 w-6 text-primary fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <video
                        src={videoPreview!}
                        className="w-full h-auto max-h-80 object-contain"
                        controls={false}
                      />
                    )}
                    {form.watch("video_duration_seconds") && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(form.watch("video_duration_seconds")!)}
                      </div>
                    )}
                    {form.watch("video_size_bytes") && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatFileSize(form.watch("video_size_bytes")!)}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
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

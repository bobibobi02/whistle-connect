import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { usePosts, usePost } from '@/hooks/usePosts';
import { useVideoQueue } from '@/hooks/useVideoQueue';
import { theme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: posts } = usePosts('new');
  const { data: currentPost, isLoading } = usePost(id);
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const {
    queue,
    currentIndex,
    initializeQueue,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
  } = useVideoQueue();

  // Initialize video queue with all video posts
  useEffect(() => {
    if (posts && currentPost) {
      const videoPosts = posts.filter((p) => p.video_url);
      const startIndex = videoPosts.findIndex((p) => p.id === id);
      initializeQueue(videoPosts, startIndex >= 0 ? startIndex : 0);
    }
  }, [posts, currentPost, id]);

  // Get current video from queue or fall back to the post
  const videoPost = queue[currentIndex] || currentPost;

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setProgress(status.positionMillis);
    setDuration(status.durationMillis || 0);

    // Auto-play next video when current one finishes
    if (status.didJustFinish && hasNext) {
      goToNext();
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      goToPrevious();
    }
  };

  const handleNext = () => {
    if (hasNext) {
      goToNext();
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Navigate to the new video when queue index changes
  useEffect(() => {
    if (queue[currentIndex] && queue[currentIndex].id !== id) {
      router.setParams({ id: queue[currentIndex].id });
    }
  }, [currentIndex, queue]);

  if (isLoading || !videoPost) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoPost.video_url! }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          isLooping={!hasNext}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          posterSource={videoPost.poster_image_url ? { uri: videoPost.poster_image_url } : undefined}
          usePoster
        />

        {/* Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top Bar */}
            <SafeAreaView edges={['top']} style={styles.topBar}>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.topBarInfo}>
                <Text style={styles.postTitle} numberOfLines={1}>
                  {videoPost.title}
                </Text>
                <Text style={styles.postCommunity}>w/{videoPost.community}</Text>
              </View>
            </SafeAreaView>

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={[styles.navButton, !hasPrevious && styles.navButtonDisabled]}
                onPress={handlePrevious}
                disabled={!hasPrevious}
              >
                <Ionicons
                  name="play-skip-back"
                  size={32}
                  color={hasPrevious ? theme.colors.text : theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={48}
                  color={theme.colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
                onPress={handleNext}
                disabled={!hasNext}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={32}
                  color={hasNext ? theme.colors.text : theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' },
                    ]}
                  />
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{formatTime(progress)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.queueInfo}>
                <Text style={styles.queueText}>
                  {currentIndex + 1} / {queue.length} videos
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewPostButton}
                onPress={() => router.push(`/post/${videoPost.id}`)}
              >
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
                <Text style={styles.viewPostText}>{videoPost.comment_count} comments</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  topBarInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  postTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postCommunity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xxl,
  },
  navButton: {
    padding: theme.spacing.md,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressContainer: {
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  timeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  queueInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  queueText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  viewPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  viewPostText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
});

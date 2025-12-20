import { useState, useCallback, useRef } from 'react';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number; // in bps
  audioBitrate?: number; // in bps
  frameRate?: number;
}

interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

interface UseVideoCompressionOptions {
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  videoBitrate: 2_500_000, // 2.5 Mbps
  audioBitrate: 128_000, // 128 kbps
  frameRate: 30,
};

export const COMPRESSION_PRESETS = {
  high: {
    label: 'High Quality',
    description: '1080p, good for detailed content',
    options: { maxWidth: 1920, maxHeight: 1080, videoBitrate: 4_000_000, frameRate: 30 },
  },
  medium: {
    label: 'Medium Quality',
    description: '720p, balanced quality and size',
    options: { maxWidth: 1280, maxHeight: 720, videoBitrate: 2_000_000, frameRate: 30 },
  },
  low: {
    label: 'Low Quality',
    description: '480p, smaller file size',
    options: { maxWidth: 854, maxHeight: 480, videoBitrate: 1_000_000, frameRate: 24 },
  },
  mobile: {
    label: 'Mobile Optimized',
    description: '720p, optimized for mobile viewing',
    options: { maxWidth: 1280, maxHeight: 720, videoBitrate: 1_500_000, frameRate: 30 },
  },
} as const;

export type CompressionPreset = keyof typeof COMPRESSION_PRESETS;

export const useVideoCompression = (hookOptions: UseVideoCompressionOptions = {}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const compressVideo = useCallback(async (
    file: File,
    options: CompressionOptions = DEFAULT_OPTIONS
  ): Promise<CompressionResult | null> => {
    setIsCompressing(true);
    setProgress(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    const {
      maxWidth = DEFAULT_OPTIONS.maxWidth!,
      maxHeight = DEFAULT_OPTIONS.maxHeight!,
      videoBitrate = DEFAULT_OPTIONS.videoBitrate!,
      frameRate = DEFAULT_OPTIONS.frameRate!,
    } = options;

    try {
      // Create video element to load the source
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });

      // Calculate output dimensions maintaining aspect ratio
      let outputWidth = video.videoWidth;
      let outputHeight = video.videoHeight;

      if (outputWidth > maxWidth || outputHeight > maxHeight) {
        const aspectRatio = outputWidth / outputHeight;
        if (outputWidth / maxWidth > outputHeight / maxHeight) {
          outputWidth = maxWidth;
          outputHeight = Math.round(maxWidth / aspectRatio);
        } else {
          outputHeight = maxHeight;
          outputWidth = Math.round(maxHeight * aspectRatio);
        }
      }

      // Ensure dimensions are even (required for many codecs)
      outputWidth = Math.floor(outputWidth / 2) * 2;
      outputHeight = Math.floor(outputHeight / 2) * 2;

      setProgress(10);

      // Create canvas for rendering frames
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d')!;

      // Check for MediaRecorder support with VP8/VP9
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];

      let supportedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          supportedMimeType = mimeType;
          break;
        }
      }

      if (!supportedMimeType) {
        throw new Error('No supported video codec found for compression');
      }

      // Create stream from canvas
      const stream = canvas.captureStream(frameRate);

      // Try to add audio track if available
      try {
        // Create audio context to process audio
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (audioError) {
        console.warn('Could not capture audio track:', audioError);
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: videoBitrate,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const recordingPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: supportedMimeType });
          resolve(blob);
        };
        recorder.onerror = (e) => reject(e);
      });

      recorder.start(100); // Collect data every 100ms

      // Play video and render frames to canvas
      video.currentTime = 0;
      await video.play();

      const duration = video.duration;
      const startTime = performance.now();

      const renderFrame = () => {
        if (abortControllerRef.current?.signal.aborted) {
          recorder.stop();
          video.pause();
          return;
        }

        ctx.drawImage(video, 0, 0, outputWidth, outputHeight);

        // Update progress
        const currentProgress = Math.min(90, 10 + (video.currentTime / duration) * 80);
        setProgress(currentProgress);
        hookOptions.onProgress?.(currentProgress);

        if (!video.ended && !video.paused) {
          requestAnimationFrame(renderFrame);
        }
      };

      video.onended = () => {
        recorder.stop();
      };

      renderFrame();

      const compressedBlob = await recordingPromise;

      URL.revokeObjectURL(videoUrl);
      setProgress(100);

      const result: CompressionResult = {
        blob: compressedBlob,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        compressionRatio: file.size / compressedBlob.size,
      };

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compression failed';
      setError(errorMessage);
      console.error('Video compression error:', err);
      return null;
    } finally {
      setIsCompressing(false);
      abortControllerRef.current = null;
    }
  }, [hookOptions]);

  const compressWithPreset = useCallback(async (
    file: File,
    preset: CompressionPreset
  ): Promise<CompressionResult | null> => {
    return compressVideo(file, COMPRESSION_PRESETS[preset].options);
  }, [compressVideo]);

  const cancelCompression = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const estimateCompressedSize = useCallback((
    file: File,
    options: CompressionOptions = DEFAULT_OPTIONS
  ): number => {
    // Rough estimation based on bitrate and duration
    // Actual size may vary based on content
    const estimatedDuration = file.size / 1_000_000; // Very rough estimate
    const videoBitrate = options.videoBitrate || DEFAULT_OPTIONS.videoBitrate!;
    const audioBitrate = options.audioBitrate || DEFAULT_OPTIONS.audioBitrate!;
    const totalBitrate = videoBitrate + audioBitrate;
    return Math.round((totalBitrate * estimatedDuration) / 8);
  }, []);

  return {
    compressVideo,
    compressWithPreset,
    cancelCompression,
    estimateCompressedSize,
    isCompressing,
    progress,
    error,
    presets: COMPRESSION_PRESETS,
  };
};

export default useVideoCompression;

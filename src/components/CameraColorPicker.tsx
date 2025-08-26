import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorData {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

interface SamplingPoint {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
}

export const CameraColorPicker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [topColor, setTopColor] = useState<ColorData>({ hex: '#000000', rgb: { r: 0, g: 0, b: 0 } });
  const [bottomColor, setBottomColor] = useState<ColorData>({ hex: '#000000', rgb: { r: 0, g: 0, b: 0 } });
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [topPoint, setTopPoint] = useState<SamplingPoint>({ x: 50, y: 20 });
  const [bottomPoint, setBottomPoint] = useState<SamplingPoint>({ x: 50, y: 80 });
  const [isDragging, setIsDragging] = useState<'top' | 'bottom' | null>(null);
  const { toast } = useToast();

  const rgbToHex = (r: number, g: number, b: number): string => {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  };

  const getColorAtPoint = useCallback((x: number, y: number): ColorData => {
    if (!videoRef.current || !canvasRef.current) {
      return { hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };

    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    
    return {
      hex: rgbToHex(r, g, b),
      rgb: { r, g, b }
    };
  }, []);

  const updateColors = useCallback(() => {
    if (!videoRef.current || !isActive) return;

    const video = videoRef.current;
    if (video.videoWidth && video.videoHeight) {
      // Convert percentage positions to pixel coordinates
      const topX = Math.floor((topPoint.x / 100) * video.videoWidth);
      const topY = Math.floor((topPoint.y / 100) * video.videoHeight);
      const bottomX = Math.floor((bottomPoint.x / 100) * video.videoWidth);
      const bottomY = Math.floor((bottomPoint.y / 100) * video.videoHeight);

      const newTopColor = getColorAtPoint(topX, topY);
      const newBottomColor = getColorAtPoint(bottomX, bottomY);

      setTopColor(newTopColor);
      setBottomColor(newBottomColor);
    }
  }, [getColorAtPoint, isActive, topPoint, bottomPoint]);

  const handleMouseDown = (point: 'top' | 'bottom') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(point);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDragging === 'top') {
      setTopPoint({ x: clampedX, y: clampedY });
    } else if (isDragging === 'bottom') {
      setBottomPoint({ x: clampedX, y: clampedY });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(updateColors, 100);
    return () => clearInterval(interval);
  }, [updateColors, isActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
      toast({
        title: "Camera Started",
        description: "Color sampling is now active",
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    toast({
      title: "Camera Stopped",
      description: "Color sampling has been disabled",
    });
  };

  const copyToClipboard = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedColor(hex);
      setTimeout(() => setCopiedColor(null), 2000);
      toast({
        title: "Copied!",
        description: `Color ${hex} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Camera Controls */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Camera Color Picker</h2>
          <Button
            onClick={isActive ? stopCamera : startCamera}
            variant={isActive ? "destructive" : "default"}
            size="lg"
          >
            {isActive ? (
              <>
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Start Camera
              </>
            )}
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Start your camera to sample colors from any two points in the video feed. Drag the sampling points to position them wherever you want.
        </p>
      </Card>

      {/* Video Feed */}
      <div ref={containerRef} className="relative">
        <video
          ref={videoRef}
          className="w-full rounded-lg bg-secondary"
          style={{ maxHeight: '60vh' }}
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {isActive && (
          <>
            {/* Sampling Points Overlay */}
            <div className="absolute inset-0">
              {/* Top sampling point */}
              <div
                className={`absolute w-6 h-6 border-2 border-sampling-point rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-move transition-all duration-200 ${
                  isDragging === 'top' ? 'scale-125 animate-pulse' : 'hover:scale-110'
                }`}
                style={{ 
                  left: `${topPoint.x}%`, 
                  top: `${topPoint.y}%`,
                  backgroundColor: topColor.hex,
                  pointerEvents: 'all'
                }}
                onMouseDown={handleMouseDown('top')}
              >
                <div className="w-full h-full rounded-full border-2 border-background shadow-lg" />
              </div>
              
              {/* Bottom sampling point */}
              <div
                className={`absolute w-6 h-6 border-2 border-sampling-point rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-move transition-all duration-200 ${
                  isDragging === 'bottom' ? 'scale-125 animate-pulse' : 'hover:scale-110'
                }`}
                style={{ 
                  left: `${bottomPoint.x}%`, 
                  top: `${bottomPoint.y}%`,
                  backgroundColor: bottomColor.hex,
                  pointerEvents: 'all'
                }}
                onMouseDown={handleMouseDown('bottom')}
              >
                <div className="w-full h-full rounded-full border-2 border-background shadow-lg" />
              </div>
              
              {/* Labels */}
              <div
                className="absolute bg-glass-overlay/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none transform -translate-x-1/2 shadow-lg"
                style={{ 
                  left: `${topPoint.x}%`, 
                  top: `${Math.max(0, topPoint.y - 8)}%` 
                }}
              >
                Top Sample
              </div>
              <div
                className="absolute bg-glass-overlay/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none transform -translate-x-1/2 shadow-lg"
                style={{ 
                  left: `${bottomPoint.x}%`, 
                  top: `${Math.min(92, bottomPoint.y + 8)}%` 
                }}
              >
                Bottom Sample
              </div>
            </div>
          </>
        )}
      </div>

      {/* Color Display */}
      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Color */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Top Sample</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(topColor.hex)}
                className="h-8"
              >
                {copiedColor === topColor.hex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="space-y-4">
              <div
                className="w-full h-20 rounded-lg border-2 border-border"
                style={{ backgroundColor: topColor.hex }}
              />
              <div className="space-y-2">
                <div className="font-mono text-lg font-bold text-foreground">
                  {topColor.hex.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  RGB({topColor.rgb.r}, {topColor.rgb.g}, {topColor.rgb.b})
                </div>
              </div>
            </div>
          </Card>

          {/* Bottom Color */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Bottom Sample</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(bottomColor.hex)}
                className="h-8"
              >
                {copiedColor === bottomColor.hex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="space-y-4">
              <div
                className="w-full h-20 rounded-lg border-2 border-border"
                style={{ backgroundColor: bottomColor.hex }}
              />
              <div className="space-y-2">
                <div className="font-mono text-lg font-bold text-foreground">
                  {bottomColor.hex.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  RGB({bottomColor.rgb.r}, {bottomColor.rgb.g}, {bottomColor.rgb.b})
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
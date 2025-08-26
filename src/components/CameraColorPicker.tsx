import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorData {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export const CameraColorPicker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [topColor, setTopColor] = useState<ColorData>({ hex: '#000000', rgb: { r: 0, g: 0, b: 0 } });
  const [bottomColor, setBottomColor] = useState<ColorData>({ hex: '#000000', rgb: { r: 0, g: 0, b: 0 } });
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
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
      const centerX = Math.floor(video.videoWidth / 2);
      const topY = Math.floor(video.videoHeight * 0.2);
      const bottomY = Math.floor(video.videoHeight * 0.8);

      const newTopColor = getColorAtPoint(centerX, topY);
      const newBottomColor = getColorAtPoint(centerX, bottomY);

      setTopColor(newTopColor);
      setBottomColor(newBottomColor);
    }
  }, [getColorAtPoint, isActive]);

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
          Start your camera to sample colors from the top and bottom middle of the video feed.
        </p>
      </Card>

      {/* Video Feed */}
      <div className="relative">
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
            <div className="absolute inset-0 pointer-events-none">
              {/* Top sampling point */}
              <div
                className="absolute w-4 h-4 border-2 border-sampling-point rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ left: '50%', top: '20%' }}
              />
              {/* Bottom sampling point */}
              <div
                className="absolute w-4 h-4 border-2 border-sampling-point rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ left: '50%', top: '80%' }}
              />
              
              {/* Labels */}
              <div
                className="absolute bg-glass-overlay/80 backdrop-blur-sm text-foreground px-2 py-1 rounded text-sm transform -translate-x-1/2"
                style={{ left: '50%', top: '15%' }}
              >
                Top Sample
              </div>
              <div
                className="absolute bg-glass-overlay/80 backdrop-blur-sm text-foreground px-2 py-1 rounded text-sm transform -translate-x-1/2"
                style={{ left: '50%', top: '85%' }}
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
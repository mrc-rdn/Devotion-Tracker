import { useState, useEffect, useRef } from 'react';
import { X, Camera, RotateCcw, Check, AlertCircle } from 'lucide-react';

/**
 * Mobile-optimized camera component with proper aspect ratio handling
 * Features:
 * - Full-screen camera view on mobile
 * - Correct 4:3 or 16:9 aspect ratio
 * - Live preview before capture
 * - Retake/Confirm flow after capture
 */
export default function CameraView({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    async function initCamera() {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (mounted) {
              setCameraReady(true);
              videoRef.current.play();
            }
          };
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
        if (mounted) {
          if (err.name === 'NotAllowedError') {
            setError('Camera permission denied. Please allow camera access and try again.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else {
            setError(`Unable to access camera: ${err.message}`);
          }
        }
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  function capturePhoto() {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Get the actual video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Set canvas to match video dimensions (maintains aspect ratio)
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `devotion-${Date.now()}.jpg`, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        setCapturedImage(URL.createObjectURL(blob));
        setCapturedFile(file);
      }
    }, 'image/jpeg', 0.9);
  }

  function retakePhoto() {
    setCapturedImage(null);
    setCapturedFile(null);
  }

  function confirmPhoto() {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  }

  function switchCamera() {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setCameraReady(false);
  }

  function cleanup() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    onClose();
  }

  // Photo review screen
  if (capturedImage) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <button
            onClick={cleanup}
            className="p-2 rounded-full hover:bg-gray-800"
          >
            <X className="w-6 h-6" />
          </button>
          <h3 className="text-lg font-semibold">Review Photo</h3>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        {/* Photo Preview */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
            style={{
              maxHeight: 'calc(100vh - 180px)',
              maxWidth: '100vw'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-900 p-6 flex items-center justify-center gap-6">
          <button
            onClick={retakePhoto}
            className="flex flex-col items-center gap-2 text-white"
          >
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600">
              <RotateCcw className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Retake</span>
          </button>

          <button
            onClick={confirmPhoto}
            className="flex flex-col items-center gap-2 text-white"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600">
              <Check className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium">Use Photo</span>
          </button>
        </div>
      </div>
    );
  }

  // Camera view
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-red-900/90 backdrop-blur-sm p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={cleanup}
                className="text-red-300 text-sm mt-2 hover:text-white"
              >
                Close Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <button
          onClick={cleanup}
          className="p-2 rounded-full hover:bg-gray-800"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-semibold">Take a Photo</h3>
        <button
          onClick={switchCamera}
          className="p-2 rounded-full hover:bg-gray-800"
          title="Switch camera"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-black overflow-hidden"
        style={{
          // Use 4:3 aspect ratio container for mobile
          aspectRatio: '4/3'
        }}
      >
        {/* Camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!cameraReady ? 'opacity-0' : 'opacity-100'}`}
          style={{
            // Ensure proper aspect ratio
            aspectRatio: '4/3'
          }}
        />

        {/* Loading indicator */}
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Camera grid overlay (optional, helps with framing) */}
        {cameraReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Capture Controls */}
      <div className="bg-gray-900 p-6 pb-8 flex items-center justify-center gap-8">
        {/* Capture Button */}
        <button
          onClick={capturePhoto}
          disabled={!cameraReady}
          className="relative group"
        >
          {/* Outer ring */}
          <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group-hover:border-gray-300 transition-colors">
            {/* Inner circle */}
            <div className="w-16 h-16 rounded-full bg-white group-hover:bg-gray-200 transition-colors" />
          </div>
          {/* Label */}
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium whitespace-nowrap">
            Capture
          </span>
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 pb-4 text-center">
        <p className="text-gray-400 text-xs">
          Frame your photo and tap the capture button
        </p>
      </div>
    </div>
  );
}

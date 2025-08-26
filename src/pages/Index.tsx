import { CameraColorPicker } from '@/components/CameraColorPicker';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Real-Time Color Picker
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Use your camera to sample colors in real-time. Perfect for designers, developers, and anyone who needs to identify colors from the world around them.
          </p>
        </header>
        
        <CameraColorPicker />
        
        <footer className="mt-12 text-center text-muted-foreground">
          <p className="text-sm">
            Click on the sampling points to copy hex values to your clipboard
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;

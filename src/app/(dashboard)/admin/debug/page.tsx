import { ImageDebugger } from '../products/components/ImageDebugger';
import { TestSquareImage } from './test-square-image';

export const metadata = {
  title: 'Debug Tools',
  description: 'Internal debug tools',
};

export default function DebugPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>

      <div className="grid gap-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Square Image Tester</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Test different URL formats to find the correct one for Square images. This tool will
            help diagnose issues with Square image URLs.
          </p>
          <TestSquareImage />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Image Debugging</h2>
          <ImageDebugger />
        </section>
      </div>
    </div>
  );
}

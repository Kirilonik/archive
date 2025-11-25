import { Hero } from '../components/landing/Hero';
import { Screenshots } from '../components/landing/Screenshots';
import { CTA } from '../components/landing/CTA';
import { Navbar } from '../components/landing/Navbar';

export function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Screenshots />
      <CTA />
    </div>
  );
}

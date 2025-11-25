import { Hero } from './components/Hero';
import { Screenshots } from './components/Screenshots';
import { CTA } from './components/CTA';
import { Navbar } from './components/Navbar';

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Screenshots />
      <CTA />
    </div>
  );
}

export default App;

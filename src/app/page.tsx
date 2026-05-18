import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { Services } from '@/components/services';
import { Pricing } from '@/components/pricing';
import { About } from '@/components/about';
import { Process } from '@/components/process';
import { Testimonials } from '@/components/testimonials';
import { CallToAction } from '@/components/call-to-action';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Pricing />
      <About />
      <Process />
      <Testimonials />
      <CallToAction />
      <Footer />
    </>
  );
}
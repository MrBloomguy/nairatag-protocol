import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import ProductWindow from './components/ProductWindow.jsx';
import AgenticIdentity from './components/AgenticIdentity.jsx';
import WhyCelo from './components/WhyCelo.jsx';
import UseCases from './components/UseCases.jsx';
import SecuritySphere from './components/SecuritySphere.jsx';
import ProductsShowcase from './components/ProductsShowcase.jsx';
import BentoGrid from './components/BentoGrid.jsx';
import ShowcaseSection from './components/ShowcaseSection.jsx';
import TasksBounties from './components/TasksBounties.jsx';
import ContractsSection from './components/ContractsSection.jsx';
import DeveloperSection from './components/DeveloperSection.jsx';
import PricingTiers from './components/PricingTiers.jsx';
import FaqAccordion from './components/FaqAccordion.jsx';
import BottomCta from './components/BottomCta.jsx';
import Footer from './components/Footer.jsx';

export default function CeloTagsLanding() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check system preference or stored theme
    const saved = localStorage.getItem('celotags_theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('celotags_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="landing-shell">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <ProductWindow />
        <AgenticIdentity />
        <WhyCelo />
        <UseCases />
        <SecuritySphere />
        <ProductsShowcase />
        <BentoGrid />
        <ShowcaseSection />
        <TasksBounties />
        <ContractsSection />
        <DeveloperSection />
        <PricingTiers />
        <FaqAccordion />
        <BottomCta />
      </main>
      <Footer />
    </div>
  );
}

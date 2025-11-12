
import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsSection from '@/components/landing/StatsSection';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const handleHumoristeClick = () => {
    navigate('/signup?type=humoriste');
  };

  const handleOrganisateurClick = () => {
    navigate('/signup?type=organisateur');
  };

  return (
    <div className="min-h-screen">
      <HeroSection 
        onHumoristeClick={handleHumoristeClick}
        onOrganisateurClick={handleOrganisateurClick}
      />
      <FeaturesSection />
      <StatsSection />
    </div>
  );
};

export default Index;

import { type CSSProperties, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pageStyle: CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    backgroundImage: 'linear-gradient(to bottom right, #1a1a2e, #331f41)',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    padding: '40px 20px',
  };

  const containerStyle: CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const headingStyle: CSSProperties = {
    color: '#FF5A7E',
    marginBottom: '24px',
    fontSize: '2.5em',
    textAlign: 'center',
  };

  const sectionTitleStyle: CSSProperties = {
    color: '#FF5A7E',
    marginTop: '40px',
    marginBottom: '16px',
    fontSize: '1.5em',
  };

  const textStyle: CSSProperties = {
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: '1.8',
    marginBottom: '16px',
    fontSize: '1.05em',
  };

  const listStyle: CSSProperties = {
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: '2',
    marginBottom: '16px',
    paddingLeft: '24px',
  };

  const highlightStyle: CSSProperties = {
    color: '#FF5A7E',
    fontWeight: 'bold',
  };

  const linkStyle: CSSProperties = {
    color: '#ff416c',
    textDecoration: 'none',
    fontWeight: 'bold',
  };

  const backLinkStyle: CSSProperties = {
    ...linkStyle,
    display: 'inline-block',
    marginBottom: '24px',
  };

  const ctaBoxStyle: CSSProperties = {
    backgroundColor: 'rgba(255, 90, 126, 0.1)',
    border: '2px solid #FF5A7E',
    borderRadius: '12px',
    padding: '32px',
    marginTop: '40px',
    textAlign: 'center',
  };

  const ctaTitleStyle: CSSProperties = {
    color: '#FF5A7E',
    fontSize: '1.4em',
    marginBottom: '16px',
  };

  const ctaButtonStyle: CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#FF5A7E',
    color: 'white',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '1.1em',
    marginTop: '16px',
    transition: 'background-color 0.3s',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backLinkStyle}>&larr; Retour à l'accueil</Link>

        <h1 style={headingStyle}>À propos de Connect Comedy Club</h1>

        <p style={textStyle}>
          Bienvenue chez <span style={highlightStyle}>Connect Comedy Club</span> — la plateforme qui révolutionne le stand-up et les scènes humoristiques en France et au-delà.
        </p>

        <p style={textStyle}>
          Chez Connect Comedy Club, notre mission est simple : <strong>connecter les artistes, les scènes et le public</strong> autour du rire, de la créativité et des opportunités. Nous ne sommes pas seulement un site : nous sommes un village d'humour numérique, pensé pour :
        </p>

        <ul style={listStyle}>
          <li>Donner de la <strong>visibilité aux humoristes</strong></li>
          <li>Faciliter la <strong>création de plateaux et de scènes</strong></li>
          <li>Unir les <strong>talents et les publics</strong> qui aiment rire</li>
        </ul>

        <p style={textStyle}>
          Grâce à notre interface intuitive, chaque humoriste peut soumettre son profil, candidater à des événements ou créer son propre plateau — et chaque organisateur peut découvrir, programmer et mettre en lumière de nouveaux talents. Tout cela au même endroit, sans barrières, sans complexité.
        </p>

        <h2 style={sectionTitleStyle}>Notre vision</h2>

        <p style={textStyle}>
          Le stand-up est plus qu'un spectacle : c'est un art vivant qui se nourrit de diversité, d'authenticité et de partage. Chez Connect Comedy Club, nous croyons que :
        </p>

        <ul style={listStyle}>
          <li>Chaque <strong>voix humoristique</strong> mérite d'être entendue</li>
          <li>Les scènes doivent être <strong>accessibles et collaboratives</strong></li>
          <li><strong>Rire rassemble</strong> et crée des connexions durables</li>
        </ul>

        <p style={textStyle}>
          Nous aspirons à être une vraie communauté de l'humour — où les petits plateaux d'initiés côtoient les scènes confirmées, où les talents émergents trouvent leur public, et où chaque spectateur découvre de nouvelles raisons de rire.
        </p>

        <h2 style={sectionTitleStyle}>Ce que nous faisons</h2>

        <p style={textStyle}>
          Avec Connect Comedy Club, tu peux :
        </p>

        <ul style={listStyle}>
          <li>Parcourir une <strong>sélection de comédiens</strong>, de scènes et d'événements en stand-up</li>
          <li>Soumettre ta <strong>candidature pour performer</strong> ou organiser un plateau</li>
          <li>Accéder à une plateforme conçue pour <strong>valoriser le talent et l'opportunité</strong></li>
          <li>Rejoindre une <strong>communauté</strong> qui place l'humour au cœur de toutes les interactions</li>
        </ul>

        <p style={textStyle}>
          Que tu sois humoriste, programmateur, fan de stand-up ou simplement curieux, Connect Comedy Club est l'espace où l'humour prend vie et où les connexions créent les prochains grands éclats de rire.
        </p>

        <div style={ctaBoxStyle}>
          <h3 style={ctaTitleStyle}>Rejoignez l'aventure</h3>
          <p style={textStyle}>
            Le stand-up se vit, se partage et se construit avec vous — que vous soyez sur scène ou dans l'assistance.
          </p>
          <p style={textStyle}>
            Inscrivez-vous, participez, découvrez et faisons rire ensemble.
          </p>
          <Link to="/register" style={ctaButtonStyle}>
            Créer mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PortfolioPage from './PortfolioPage';
import { portfolioCaseStudies, portfolioCategories } from './portfolioData';
import { getRouteForPathname } from '../../navigation/routeRegistry';

const renderPortfolio = () => render(<PortfolioPage />);

const getShowcaseGrid = () => screen.getByRole('list', { name: /case studies/i });

const getCardCount = () => (
  document.querySelectorAll('[data-ui="portfolio-case-study-card"]').length
);

describe('PortfolioPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders every case study with the All filter active by default', () => {
    renderPortfolio();

    expect(getShowcaseGrid()).toBeTruthy();
    expect(getCardCount()).toBe(portfolioCaseStudies.length);

    portfolioCaseStudies.forEach((caseStudy) => {
      expect(screen.getByText(caseStudy.title)).toBeInTheDocument();
      expect(screen.getByText(caseStudy.tagline)).toBeInTheDocument();
    });
  });

  it('renders the full category filter list including All', () => {
    renderPortfolio();

    const chips = screen.getAllByRole('button', {
      name: (name) => portfolioCategories.some((category) => category.label === name),
    });
    expect(chips).toHaveLength(portfolioCategories.length);

    expect(screen.getByRole('button', { name: /^All$/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('filters the showcase grid to the selected category', () => {
    renderPortfolio();

    fireEvent.click(screen.getByRole('button', { name: 'Design systems' }));

    expect(getCardCount()).toBe(1);
    expect(screen.getByText('Aura Design System')).toBeInTheDocument();
    expect(screen.queryByText('TalentSphere Unified Platform')).toBeNull();
  });

  it('shows an empty state for a category with no case studies', () => {
    renderPortfolio();

    fireEvent.click(screen.getByRole('button', { name: 'Mobile/Embedded' }));

    expect(screen.getByText('No case studies here yet')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /case studies/i })).toBeNull();
  });

  it('returns to the full showcase when All is selected again', () => {
    renderPortfolio();

    fireEvent.click(screen.getByRole('button', { name: 'Design systems' }));
    fireEvent.click(screen.getByRole('button', { name: /^All$/ }));

    expect(getCardCount()).toBe(portfolioCaseStudies.length);
  });
});

describe('PortfolioPage route registration', () => {
  it('registers /portfolio as an accessible main-section route', () => {
    const route = getRouteForPathname('/portfolio');

    expect(route?.id).toBe('portfolio');
    expect(route?.label).toBe('Portfolio');
    expect(route?.path).toBe('/portfolio');
    expect(route?.navSection).toBe('main');
  });
});
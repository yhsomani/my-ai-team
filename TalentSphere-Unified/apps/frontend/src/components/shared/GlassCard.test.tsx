import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './GlassCard';
import {
  Card as AuraCard,
  CardContent as AuraCardContent,
  CardDescription as AuraCardDescription,
  CardFooter as AuraCardFooter,
  CardHeader as AuraCardHeader,
  CardTitle as AuraCardTitle,
} from './AuraCard';

describe('Card', () => {
  it('preserves caller semantics while adding shared containment metadata', () => {
    render(
      <Card role="region" aria-label="Billing transaction history" data-testid="card">
        Transaction content
      </Card>,
    );

    const card = screen.getByRole('region', { name: 'Billing transaction history' });

    expect(card.getAttribute('data-ui')).toBe('card');
    expect(card.getAttribute('data-slot')).toBe('card');
    expect(card.className).toContain('surface-card');
    expect(card.className).toContain('max-w-full');
    expect(card.className).toContain('min-w-0');
    expect(card.textContent).toBe('Transaction content');
  });

  it('keeps card text and footer actions wrapping-safe by default', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>VeryLongUnbrokenOperationalStatusLabel</CardTitle>
          <CardDescription>VeryLongUnbrokenProviderDescriptionValue</CardDescription>
        </CardHeader>
        <CardContent>Panel body</CardContent>
        <CardFooter>
          <button type="button">Review</button>
          <button type="button">Retry</button>
        </CardFooter>
      </Card>,
    );

    const title = screen.getByText('VeryLongUnbrokenOperationalStatusLabel');
    const description = screen.getByText('VeryLongUnbrokenProviderDescriptionValue');
    const content = screen.getByText('Panel body');
    const header = title.parentElement;
    const footer = screen.getByRole('button', { name: 'Review' }).parentElement;

    expect(header?.getAttribute('data-ui')).toBe('card-header');
    expect(header?.getAttribute('data-slot')).toBe('card-header');
    expect(title.getAttribute('data-ui')).toBe('card-title');
    expect(title.getAttribute('data-slot')).toBe('card-title');
    expect(title.className).toContain('break-words');
    expect(description.getAttribute('data-ui')).toBe('card-description');
    expect(description.getAttribute('data-slot')).toBe('card-description');
    expect(description.className).toContain('break-words');
    expect(content.getAttribute('data-ui')).toBe('card-content');
    expect(content.getAttribute('data-slot')).toBe('card-content');
    expect(content.className).toContain('min-w-0');
    expect(footer?.getAttribute('data-ui')).toBe('card-footer');
    expect(footer?.getAttribute('data-slot')).toBe('card-footer');
    expect(footer?.className).toContain('flex-wrap');
  });

  it('keeps legacy AuraCard compatibility exports on the shared card primitives', () => {
    expect(AuraCard).toBe(Card);
    expect(AuraCardHeader).toBe(CardHeader);
    expect(AuraCardTitle).toBe(CardTitle);
    expect(AuraCardDescription).toBe(CardDescription);
    expect(AuraCardContent).toBe(CardContent);
    expect(AuraCardFooter).toBe(CardFooter);

    render(
      <AuraCard role="region" aria-label="Legacy Aura card">
        <AuraCardHeader>
          <AuraCardTitle>Legacy Card</AuraCardTitle>
          <AuraCardDescription>Compatibility import</AuraCardDescription>
        </AuraCardHeader>
        <AuraCardContent>Legacy body</AuraCardContent>
        <AuraCardFooter>
          <button type="button">Continue</button>
        </AuraCardFooter>
      </AuraCard>,
    );

    const card = screen.getByRole('region', { name: 'Legacy Aura card' });

    expect(card.getAttribute('data-ui')).toBe('card');
    expect(card.getAttribute('data-slot')).toBe('card');
    expect(card.querySelector('[data-ui="card-header"]')?.getAttribute('data-slot')).toBe('card-header');
    expect(card.querySelector('[data-ui="card-title"]')?.textContent).toBe('Legacy Card');
    expect(card.querySelector('[data-ui="card-description"]')?.textContent).toBe('Compatibility import');
    expect(card.querySelector('[data-ui="card-content"]')?.textContent).toBe('Legacy body');
    expect(card.querySelector('[data-ui="card-footer"]')?.getAttribute('data-slot')).toBe('card-footer');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });
});

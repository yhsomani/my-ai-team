import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BodyMD, DisplayLG, HeadlineMD, LabelSM } from './Typography';

describe('Typography helpers', () => {
  it('keeps heading and body text wrapping-safe while preserving caller props', () => {
    render(
      <>
        <DisplayLG id="page-title" data-testid="display-title">
          VeryLongProductHeadingWithoutSpaces
        </DisplayLG>
        <HeadlineMD className="truncate" aria-label="Candidate headline">
          Candidate summary
        </HeadlineMD>
        <BodyMD data-testid="body-copy">
          Long provider generated copy that should wrap inside narrow helper surfaces.
        </BodyMD>
        <LabelSM data-testid="metadata-label">Live source</LabelSM>
      </>,
    );

    const displayTitle = screen.getByRole('heading', { level: 1, name: 'VeryLongProductHeadingWithoutSpaces' });
    const headline = screen.getByRole('heading', { level: 2, name: 'Candidate headline' });
    const bodyCopy = screen.getByTestId('body-copy');
    const label = screen.getByTestId('metadata-label');

    expect(displayTitle.getAttribute('id')).toBe('page-title');
    expect(displayTitle.className).toContain('break-words');
    expect(displayTitle.className).toContain('max-w-full');
    expect(headline.className).toContain('truncate');
    expect(bodyCopy.className).toContain('break-words');
    expect(label.tagName).toBe('SPAN');
    expect(label.className).toContain('uppercase');
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

const profileTabs = [
  { id: 'overview', label: 'Overview', icon: <span data-testid="overview-icon">O</span> },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
];

describe('Tabs', () => {
  it('renders labeled horizontal tabs with controlled panel relationships', () => {
    const onTabChange = vi.fn();

    render(
      <Tabs
        ariaLabel="Profile sections"
        idPrefix="profile-sections"
        tabs={profileTabs}
        activeTab="overview"
        onTabChange={onTabChange}
        className="w-full"
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'Profile sections' });
    const overview = screen.getByRole('tab', { name: 'Overview' });
    const experience = screen.getByRole('tab', { name: 'Experience' });
    const icon = screen.getByTestId('overview-icon').parentElement;

    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tablist.getAttribute('data-ui')).toBe('tabs-list');
    expect(tablist.getAttribute('data-slot')).toBe('tabs-list');
    expect(tablist.className).toContain('max-w-full');
    expect(tablist.className).toContain('w-full');
    expect(overview.getAttribute('id')).toBe('profile-sections-tab-overview');
    expect(overview.getAttribute('aria-controls')).toBe('profile-sections-panel-overview');
    expect(overview.getAttribute('aria-selected')).toBe('true');
    expect(overview.getAttribute('data-ui')).toBe('tabs-trigger');
    expect(overview.getAttribute('data-state')).toBe('active');
    expect(overview.getAttribute('tabindex')).toBe('0');
    expect(experience.getAttribute('aria-selected')).toBe('false');
    expect(experience.getAttribute('data-state')).toBe('inactive');
    expect(experience.getAttribute('tabindex')).toBe('-1');
    expect(experience.getAttribute('data-ui')).toBe('tabs-trigger');
    expect(experience.getAttribute('data-slot')).toBe('tabs-trigger');
    expect(icon?.getAttribute('data-ui')).toBe('tabs-icon');
    expect(icon?.getAttribute('data-slot')).toBe('tabs-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(experience);
    expect(onTabChange).toHaveBeenCalledWith('experience');
  });

  it('keeps roving focus aligned with keyboard-selected tabs', async () => {
    const ControlledTabs = () => {
      const [activeTab, setActiveTab] = React.useState('overview');

      return (
        <Tabs
          ariaLabel="Profile sections"
          idPrefix="profile-sections"
          tabs={profileTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      );
    };

    render(<ControlledTabs />);

    const tablist = screen.getByRole('tablist', { name: 'Profile sections' });
    const overview = screen.getByRole('tab', { name: 'Overview' });
    const experience = screen.getByRole('tab', { name: 'Experience' });
    const education = screen.getByRole('tab', { name: 'Education' });

    overview.focus();
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(experience.getAttribute('aria-selected')).toBe('true');
      expect(experience.getAttribute('data-state')).toBe('active');
      expect(overview.getAttribute('data-state')).toBe('inactive');
      expect(document.activeElement).toBe(experience);
    });

    fireEvent.keyDown(tablist, { key: 'End' });

    await waitFor(() => {
      expect(education.getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(education);
    });

    fireEvent.keyDown(tablist, { key: 'Home' });

    await waitFor(() => {
      expect(overview.getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(overview);
    });
  });
});

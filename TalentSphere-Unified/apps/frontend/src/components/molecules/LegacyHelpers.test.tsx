import React from 'react';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';
import { PostCard } from './PostCard';
import SyncStatusBar from './SyncStatusBar';
import { AuraStatusBar } from '../shared/AuraStatusBar';

describe('legacy helper presentation components', () => {
  it('exposes stat cards as named metric groups with connected descriptions', () => {
    render(
      <StatCard
        label="Open roles"
        value={42}
        icon={Activity}
        trend={{ value: '+8%', isPositive: true }}
        description="Compared with last month"
      />,
    );

    const metric = screen.getByRole('group', { name: 'Open roles: 42' });
    const description = screen.getByText('Compared with last month');
    const iconWrapper = metric.querySelector('[aria-hidden="true"]');

    expect(metric.getAttribute('data-ui')).toBe('stat-card');
    expect(metric.getAttribute('data-slot')).toBe('stat-card');
    expect(metric.querySelector('[data-ui="stat-card-header"]')?.getAttribute('data-slot')).toBe('stat-card-header');
    expect(metric.querySelector('[data-ui="stat-card-icon"]')?.getAttribute('data-slot')).toBe('stat-card-icon');
    expect(metric.querySelector('[data-ui="stat-card-trend"]')?.getAttribute('data-slot')).toBe('stat-card-trend');
    expect(metric.querySelector('[data-ui="stat-card-trend"]')?.textContent).toBe('+8%');
    expect(metric.querySelector('[data-ui="stat-card-body"]')?.getAttribute('data-slot')).toBe('stat-card-body');
    expect(metric.querySelector('[data-ui="stat-card-label"]')?.getAttribute('data-slot')).toBe('stat-card-label');
    expect(metric.querySelector('[data-ui="stat-card-label"]')?.textContent).toBe('Open roles');
    expect(metric.querySelector('[data-ui="stat-card-value"]')?.getAttribute('data-slot')).toBe('stat-card-value');
    expect(metric.querySelector('[data-ui="stat-card-value"]')?.textContent).toBe('42');
    expect(metric.querySelector('[data-ui="stat-card-description"]')?.getAttribute('data-slot')).toBe('stat-card-description');
    expect(metric.querySelector('[data-ui="stat-card-description"]')?.textContent).toBe('Compared with last month');
    expect(metric.getAttribute('aria-describedby')).toBe(description.getAttribute('id'));
    expect(iconWrapper).toBeTruthy();
    expect(screen.getByText('+8%')).toBeTruthy();
  });

  it('keeps post cards as named article surfaces with decorative avatar initials', () => {
    render(
      <PostCard
        author="Avery Johnson"
        role="Recruiter"
        content="Review the shortlist before Friday."
        timestamp="Today"
        likes={3}
      />,
    );

    const article = screen.getByRole('article', { name: 'Avery Johnson update' });

    expect(article.getAttribute('data-slot')).toBe('post-card');
    expect(article.querySelector('[data-ui="post-card-header"]')?.getAttribute('data-slot')).toBe('post-card-header');
    expect(article.querySelector('[data-ui="post-card-avatar"]')?.getAttribute('data-slot')).toBe('post-card-avatar');
    expect(article.querySelector('[data-ui="post-card-avatar"]')?.textContent).toBe('AJ');
    expect(article.querySelector('[data-ui="post-card-meta"]')?.getAttribute('data-slot')).toBe('post-card-meta');
    expect(article.querySelector('[data-ui="post-card-content"]')?.getAttribute('data-slot')).toBe('post-card-content');
    expect(article.querySelector('[data-ui="post-card-content"]')?.textContent).toContain('Review the shortlist before Friday.');
    expect(article.querySelector('[data-ui="post-card-actions"]')?.getAttribute('data-slot')).toBe('post-card-actions');
    expect(article.textContent).toContain('Avery Johnson');
    expect(article.textContent).toContain('Review the shortlist before Friday.');
    expect(article.querySelector('[aria-hidden="true"]')?.textContent).toBe('AJ');
    expect(screen.getByRole('button', { name: 'Like (3)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });

  it('names status bars and hides decorative status icons', () => {
    render(
      <>
        <SyncStatusBar nodeName="Jobs" latency="8ms" security="Verified" syncLabel="Synced" />
        <AuraStatusBar nodeName="Core" latency="12ms" security="LOCKED" />
      </>,
    );

    const syncStatus = screen.getByRole('status', { name: 'Sync status' });
    const systemStatus = screen.getByRole('status', { name: 'System status' });

    expect(syncStatus.getAttribute('data-ui')).toBe('status-bar');
    expect(syncStatus.getAttribute('data-slot')).toBe('status-bar');
    expect(systemStatus.getAttribute('data-ui')).toBe('status-bar');
    expect(systemStatus.getAttribute('data-slot')).toBe('status-bar');
    expect(syncStatus.querySelector('[data-ui="status-bar-state"]')?.getAttribute('data-slot')).toBe('status-bar-state');
    expect(syncStatus.querySelector('[data-ui="status-bar-indicator"]')?.getAttribute('data-slot')).toBe('status-bar-indicator');
    expect(syncStatus.querySelectorAll('[data-ui="status-bar-separator"]')).toHaveLength(2);
    syncStatus.querySelectorAll('[data-ui="status-bar-separator"]').forEach((separator) => {
      expect(separator.getAttribute('data-slot')).toBe('status-bar-separator');
    });
    expect(syncStatus.querySelector('[data-ui="status-bar-latency"]')?.getAttribute('data-slot')).toBe('status-bar-latency');
    expect(syncStatus.querySelector('[data-ui="status-bar-security"]')?.getAttribute('data-slot')).toBe('status-bar-security');
    expect(syncStatus.querySelector('[data-ui="status-bar-sync"]')?.getAttribute('data-slot')).toBe('status-bar-sync');
    expect(syncStatus.textContent).toContain('Jobs: ONLINE');
    expect(syncStatus.textContent).toContain('Latency 8ms');
    expect(syncStatus.textContent).toContain('Security Verified');
    expect(syncStatus.textContent).toContain('Synced');
    expect(systemStatus.textContent).toContain('Core: ACTIVE');
    expect(systemStatus.textContent).toContain('Latency 12ms');
    expect(systemStatus.textContent).toContain('Security LOCKED');

    [...syncStatus.querySelectorAll('svg'), ...systemStatus.querySelectorAll('svg')].forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    });
  });

  it('preserves status-bar compatibility defaults through the shared surface', () => {
    render(
      <>
        <SyncStatusBar />
        <AuraStatusBar />
      </>,
    );

    const syncStatus = screen.getByRole('status', { name: 'Sync status' });
    const systemStatus = screen.getByRole('status', { name: 'System status' });

    expect(syncStatus.getAttribute('data-ui')).toBe('status-bar');
    expect(syncStatus.getAttribute('data-slot')).toBe('status-bar');
    expect(syncStatus.textContent).toContain('CORE: ONLINE');
    expect(syncStatus.textContent).toContain('Latency 4ms');
    expect(syncStatus.textContent).toContain('Security Secure');
    expect(syncStatus.textContent).toContain('Sync active');
    expect(systemStatus.getAttribute('data-ui')).toBe('status-bar');
    expect(systemStatus.getAttribute('data-slot')).toBe('status-bar');
    expect(systemStatus.textContent).toContain('SYSTEM: ACTIVE');
    expect(systemStatus.textContent).toContain('Latency 4ms');
    expect(systemStatus.textContent).toContain('Security SECURE');
    expect(systemStatus.textContent).toContain('Sync active');
  });
});

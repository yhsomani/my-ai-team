import { describe, expect, it } from 'vitest';
import * as shared from './index';
import { AuraButton, Button } from './AuraButton';
import { AuraBadge, Badge } from './Badge';
import { BodyMD, DisplayLG, HeadlineMD, LabelSM } from '../atoms/Typography';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './GlassCard';
import { AuraImage, MemoizedAuraImage } from './AuraImage';
import { AuraInput, Input } from './AuraInput';
import { AuraModal } from './AuraModal';
import { AuraNavbar } from './AuraNavbar';
import { AuraStatusBar, StatusBarSurface } from './AuraStatusBar';
import { AuraThemeProvider } from './AuraThemeProvider';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { PageTemplate } from '../templates/PageTemplate';
import { ResponsiveLayout } from './ResponsiveLayout';
import { Skeleton } from './Skeleton';
import { Tabs } from './Tabs';
import { ToastProvider, useToast } from './Toast';
import { Toggle } from './Toggle';

describe('shared design-system barrel', () => {
  it('exports canonical primitives and compatibility aliases from one public entrypoint', () => {
    expect(shared.Button).toBe(Button);
    expect(shared.AuraButton).toBe(AuraButton);
    expect(shared.Badge).toBe(Badge);
    expect(shared.AuraBadge).toBe(AuraBadge);
    expect(shared.DisplayLG).toBe(DisplayLG);
    expect(shared.HeadlineMD).toBe(HeadlineMD);
    expect(shared.BodyMD).toBe(BodyMD);
    expect(shared.LabelSM).toBe(LabelSM);
    expect(shared.Card).toBe(Card);
    expect(shared.CardHeader).toBe(CardHeader);
    expect(shared.CardTitle).toBe(CardTitle);
    expect(shared.CardDescription).toBe(CardDescription);
    expect(shared.CardContent).toBe(CardContent);
    expect(shared.CardFooter).toBe(CardFooter);
    expect(shared.AuraImage).toBe(AuraImage);
    expect(shared.MemoizedAuraImage).toBe(MemoizedAuraImage);
    expect(shared.Input).toBe(Input);
    expect(shared.AuraInput).toBe(AuraInput);
    expect(shared.AuraModal).toBe(AuraModal);
    expect(shared.AuraNavbar).toBe(AuraNavbar);
    expect(shared.AuraStatusBar).toBe(AuraStatusBar);
    expect(shared.StatusBarSurface).toBe(StatusBarSurface);
    expect(shared.AuraThemeProvider).toBe(AuraThemeProvider);
    expect(shared.EmptyState).toBe(EmptyState);
    expect(shared.PageHeader).toBe(PageHeader);
    expect(shared.PageTemplate).toBe(PageTemplate);
    expect(shared.ResponsiveLayout).toBe(ResponsiveLayout);
    expect(shared.Skeleton).toBe(Skeleton);
    expect(shared.Tabs).toBe(Tabs);
    expect(shared.ToastProvider).toBe(ToastProvider);
    expect(shared.useToast).toBe(useToast);
    expect(shared.Toggle).toBe(Toggle);
  });
});

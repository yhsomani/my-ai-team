import React, { useMemo, useState } from 'react';
import { LayoutGrid, Sparkles, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  portfolioCategories,
  portfolioSummary,
  portfolioCaseStudies,
  filterCaseStudies,
  getCategoriesForCaseStudy,
  type PortfolioCaseStudy,
} from './portfolioData';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const emptyCategoryDescription = 'No case study is tagged for this category yet. Pick another filter to keep browsing the showcase.';

const CaseStudyMetrics = ({ caseStudy }: { caseStudy: PortfolioCaseStudy }) => (
  <div className="grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4">
    {caseStudy.metrics.map((metric) => (
      <div key={metric.label}>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{metric.value}</p>
        <p className="text-xs text-[var(--text-muted)]">{metric.label}</p>
      </div>
    ))}
  </div>
);

const CaseStudyCard = ({ caseStudy }: { caseStudy: PortfolioCaseStudy }) => {
  const categories = getCategoriesForCaseStudy(caseStudy);

  return (
    <Card
      data-ui="portfolio-case-study-card"
      className="flex h-full min-h-72 flex-col gap-4 p-5 transition-colors hover:border-[var(--border-strong)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <Badge key={category.id} variant="outline">{category.label}</Badge>
        ))}
        <Badge variant="success">{caseStudy.year}</Badge>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{caseStudy.title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{caseStudy.tagline}</p>
      </div>

      <p className="text-sm leading-6 text-[var(--text-secondary)]">{caseStudy.summary}</p>

      <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text-secondary)]">
        {caseStudy.highlights.slice(0, 3).map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      <div className="mt-auto space-y-4">
        <CaseStudyMetrics caseStudy={caseStudy} />
        <div className="flex flex-wrap gap-1.5">
          {caseStudy.stack.map((item) => (
            <Badge key={item} variant="default">{item}</Badge>
          ))}
        </div>
        <details className="group rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 px-3 py-2">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <ShieldCheck {...decorativeIconProps} size={14} className="text-accent" />
            Source-verified claims
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--text-muted)]">
            {caseStudy.truthTags.map((tag) => (
              <li key={tag.evidence}>
                <span className="text-[var(--text-secondary)]">{tag.claim}</span> —{' '}
                <code className="break-all">{tag.evidence}</code>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Card>
  );
};

const PortfolioPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const visibleCaseStudies = useMemo(
    () => filterCaseStudies(activeCategory),
    [activeCategory],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Portfolio"
        description={portfolioSummary.headline}
        badge={(
          <Badge variant="default">
            <LayoutGrid {...decorativeIconProps} size={14} />
            {portfolioCaseStudies.length} case studies
          </Badge>
        )}
      />

      <div className="surface-panel p-4">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{portfolioSummary.paragraph}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          {portfolioSummary.focus.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div role="group" aria-label="Filter case studies by category" className="flex flex-wrap gap-2">
        {portfolioCategories.map((category) => {
          const isActive = category.id === activeCategory;
          return (
            <button
              key={category.id}
              type="button"
              data-ui="portfolio-category-filter"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {visibleCaseStudies.length > 0 ? (
        <div
          data-ui="portfolio-showcase-grid"
          role="list"
          aria-label={`${activeCategory === 'all' ? 'All' : 'Filtered'} case studies`}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visibleCaseStudies.map((caseStudy) => (
            <div key={caseStudy.id} role="listitem">
              <CaseStudyCard caseStudy={caseStudy} />
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={<Sparkles {...decorativeIconProps} className="h-10 w-10" />}
            title="No case studies here yet"
            description={emptyCategoryDescription}
          />
        </Card>
      )}
    </div>
  );
};

export default PortfolioPage;
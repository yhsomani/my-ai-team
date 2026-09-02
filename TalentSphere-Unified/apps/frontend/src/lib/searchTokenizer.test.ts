import { describe, expect, it } from 'vitest';
import {
  STOP_WORDS,
  stemmer,
  trimmer,
  stopWordFilter,
  tokenize,
  buildSearchQuery,
  calculateRelevance,
} from './searchTokenizer';

describe('searchTokenizer', () => {
  describe('STOP_WORDS', () => {
    it('contains common English stop words', () => {
      expect(STOP_WORDS.has('the')).toBe(true);
      expect(STOP_WORDS.has('and')).toBe(true);
      expect(STOP_WORDS.has('developer')).toBe(false);
    });
  });

  describe('stemmer', () => {
    it('applies suffix reduction rules accurately', () => {
      expect(stemmer('processes')).toBe('process');
      expect(stemmer('companies')).toBe('company');
      expect(stemmer('programming')).toBe('programm');
      expect(stemmer('developed')).toBe('develop');
      expect(stemmer('scalability')).toBe('scalability');
      expect(stemmer('management')).toBe('manage');
      expect(stemmer('darkness')).toBe('dark');
      expect(stemmer('quickly')).toBe('quick');
      expect(stemmer('hopeful')).toBe('hope');
      expect(stemmer('applicable')).toBe('applic');
      expect(stemmer('flexible')).toBe('flex');
      expect(stemmer('organization')).toBe('organiza');
      expect(stemmer('decision')).toBe('deci');
    });

    it('handles words without matching rules unchanged', () => {
      expect(stemmer('react')).toBe('react');
      expect(stemmer('node')).toBe('node');
    });
  });

  describe('trimmer', () => {
    it('lowercases, strips extra whitespace and non-alphanumeric/hyphen symbols', () => {
      expect(trimmer('  Full-Stack   Developer!! @2026 ')).toBe('full-stack developer 2026');
      expect(trimmer('AI / ML Engineer & Data Architect')).toBe('ai  ml engineer  data architect');
    });
  });

  describe('stopWordFilter', () => {
    it('removes known stop words from a token array', () => {
      const tokens = ['the', 'senior', 'react', 'developer', 'with', 'experience'];
      const filtered = stopWordFilter(tokens);
      expect(filtered).toEqual(['senior', 'react', 'developer', 'experience']);
    });
  });

  describe('tokenize', () => {
    it('runs the complete pipeline: trim, split, filter length, stem, and remove stop words', () => {
      const tokens = tokenize('Senior Full-Stack Developers building modern web applications');
      expect(tokens).toContain('senior');
      expect(tokens).toContain('full-stack');
      expect(tokens).toContain('develop');
      expect(tokens).toContain('build');
      expect(tokens).toContain('modern');
      expect(tokens).toContain('web');
      expect(tokens).toContain('applica');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('a');
    });
  });

  describe('buildSearchQuery', () => {
    it('builds a space-separated search query string from tokens', () => {
      const result = buildSearchQuery('Looking for React and TypeScript engineers');
      expect(result).toContain('react');
      expect(result).toContain('typescript');
      expect(result).toContain('engine');
    });
  });

  describe('calculateRelevance', () => {
    it('returns 0 when query tokens array is empty', () => {
      expect(calculateRelevance(['react', 'node'], [])).toBe(0);
    });

    it('calculates the fraction of query tokens present in indexed tokens', () => {
      const indexed = ['senior', 'frontend', 'engineer', 'react', 'typescript'];
      const query1 = ['frontend', 'react'];
      expect(calculateRelevance(indexed, query1)).toBe(1);

      const query2 = ['frontend', 'python'];
      expect(calculateRelevance(indexed, query2)).toBe(0.5);

      const query3 = ['golang', 'kubernetes'];
      expect(calculateRelevance(indexed, query3)).toBe(0);
    });
  });
});

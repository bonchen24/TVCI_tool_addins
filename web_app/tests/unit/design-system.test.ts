import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

describe('Design System Tokens Specification', () => {
  it('defines the exact TVCI primary Indigo color (#6366F1)', () => {
    const primary = (tailwindConfig.theme?.extend?.colors as any)?.primary;
    expect(primary.DEFAULT).toBe('#6366F1');
    expect(primary[500]).toBe('#6366F1');
  });

  it('defines the exact Emerald action trigger color (#10B981)', () => {
    const action = (tailwindConfig.theme?.extend?.colors as any)?.action;
    expect(action.DEFAULT).toBe('#10B981');
    expect(action[500]).toBe('#10B981');
  });

  it('defines legal NĐ 30/2020 page margin presets', () => {
    const spacing = tailwindConfig.theme?.extend?.spacing as any;
    expect(spacing['a4-w']).toBe('210mm');
    expect(spacing['a4-h']).toBe('297mm');
    expect(spacing['nd30-top']).toBe('20mm');
    expect(spacing['nd30-bottom']).toBe('20mm');
    expect(spacing['nd30-left']).toBe('30mm');
    expect(spacing['nd30-right']).toBe('15mm');
  });

  it('configures Plus Jakarta Sans as primary font and Times New Roman as canvas font', () => {
    const fontFamily = tailwindConfig.theme?.extend?.fontFamily as any;
    expect(fontFamily.sans[0]).toBe('var(--font-plus-jakarta-sans)');
    expect(fontFamily.canvas[0]).toBe('"Times New Roman"');
  });
});

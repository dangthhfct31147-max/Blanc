import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SkipToContent from '../../components/SkipToContent';

describe('SkipToContent', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('smooth-scrolls to the Blanc pulse section when it exists', () => {
    render(
      <>
        <SkipToContent />
        <section id="home-live-stats" tabIndex={-1}>
          Blanc pulse
        </section>
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>
    );

    const target = screen.getByText('Blanc pulse');
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    fireEvent.click(screen.getByRole('link', { name: /skip to content/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(target).toHaveFocus();
  });

  it('falls back to the main landmark outside the home page', () => {
    render(
      <>
        <SkipToContent />
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>
    );

    const target = screen.getByText('Main content');
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    fireEvent.click(screen.getByRole('link', { name: /skip to content/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(target).toHaveFocus();
  });
});

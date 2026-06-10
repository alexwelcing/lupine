import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SavedTrajectories } from './SavedTrajectories';

describe('SavedTrajectories', () => {
  it('renders nothing when the local library is unsupported (e.g. jsdom)', async () => {
    // jsdom has no OPFS, so isTrajectoryLibrarySupported() is false and the
    // component must stay invisible — purely additive on the landing page.
    const { container } = render(<SavedTrajectories />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(screen.queryByText(/your library/i)).toBeNull();
  });
});

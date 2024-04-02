import Page from './Page';
import { render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma(),
}));

describe('Page component', () => {
  it('Component text exists', () => {
    render(<Page />);

    expect(screen.getByText('Hello Page Component (AppId: test-app)')).toBeInTheDocument();
  });
});

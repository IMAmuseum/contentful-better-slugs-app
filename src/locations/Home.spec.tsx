import Home from './Home';
import { render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma(),
}));

describe('Home component', () => {
  it('Component text exists', () => {
    render(<Home />);

    expect(screen.getByText('Hello Home Component (AppId: test-app)')).toBeInTheDocument();
  });
});

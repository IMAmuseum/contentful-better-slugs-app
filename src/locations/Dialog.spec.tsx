import Dialog from './Dialog';
import { render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk(),
  useCMA: () => mockCma,
}));

describe('Dialog component', () => {
  it('Component text exists', () => {
    render(<Dialog />);

    expect(screen.getByText('Hello Dialog Component (AppId: test-app)')).toBeInTheDocument();
  });
});

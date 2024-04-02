import EntryEditor from './EntryEditor';
import { render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma(),
}));

describe('Entry component', () => {
  it('Component text exists', () => {
    render(<EntryEditor />);
    expect(screen.getByText('Hello Entry Editor Component (AppId: test-app)')).toBeInTheDocument();
  });
});

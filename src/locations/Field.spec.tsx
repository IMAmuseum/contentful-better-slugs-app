import Field from './Field';
import { render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk(),
  useCMA: () => mockCma,
}));

describe('Field component', () => {
  it('Component text exists', () => {
    render(<Field />);

    expect(screen.getByText('Hello Entry Field Component (AppId: test-app)')).toBeInTheDocument();
  });
});

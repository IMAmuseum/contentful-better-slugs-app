import { act, render, screen } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';
import ConfigScreen from './ConfigScreen';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma(),
}));

describe('Config Screen component', () => {
  it('Component text exists', async () => {
    render(<ConfigScreen />);

    // simulate the user clicking the install button
    await act(() => mockSdk.app.onConfigure.mock.calls[0][0]());

    expect(
      screen.getByText('Better Slugs Config')
    ).toBeInTheDocument();
  });
});

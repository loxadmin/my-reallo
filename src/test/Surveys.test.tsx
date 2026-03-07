import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DecisionFlow from '../components/DecisionFlow';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

vi.mock('../contexts/AuthContext');
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com' } })),
      })),
    },
  },
}));

describe('DecisionFlow Survey Logic', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      refreshProfile: vi.fn(),
    });

    // Unified mock for supabase.from
    (supabase.from as any).mockImplementation((table: string) => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          if (table === 'surveys') {
            return Promise.resolve(resolve({
              data: [{ id: 'survey-1', title: 'Test Survey', points_reward: 1000, is_active: true }],
              error: null
            }));
          }
          if (table === 'survey_questions') {
            return Promise.resolve(resolve({
              data: [{ id: 'q-1', survey_id: 'survey-1', question_text: 'What is 1+1?', options: ['1', '2', '3'], correct_option: '2', order_index: 0 }],
              error: null
            }));
          }
          return Promise.resolve(resolve({ data: [], error: null }));
        }),
      };
      return mockQueryBuilder;
    });
  });

  it('renders surveys tab and can start a survey', async () => {
    render(<DecisionFlow />);

    // Switch to surveys tab
    const surveyTab = await screen.findByText(/Surveys/i);
    fireEvent.click(surveyTab);

    // Find and start the test survey
    const startButton = await screen.findByText(/Start/i);
    expect(screen.getByText('Test Survey')).toBeInTheDocument();
    fireEvent.click(startButton);

    // Verify question is shown
    expect(await screen.findByText('What is 1+1?')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles incorrect answer', async () => {
    render(<DecisionFlow />);
    fireEvent.click(await screen.findByText(/Surveys/i));
    fireEvent.click(await screen.findByText(/Start/i));

    // Click wrong answer
    const wrongOpt = await screen.findByText('1');
    fireEvent.click(wrongOpt);

    // Verify we are still on the same question
    expect(screen.getByText('What is 1+1?')).toBeInTheDocument();
  });

  it('completes survey on correct answer', async () => {
    render(<DecisionFlow />);
    fireEvent.click(await screen.findByText(/Surveys/i));
    fireEvent.click(await screen.findByText(/Start/i));

    // Click correct answer
    const correctOpt = await screen.findByText('2');
    fireEvent.click(correctOpt);

    // Verify completion screen
    expect(await screen.findByText(/Survey Completed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Screenshot/i)).toBeInTheDocument();
  });
});

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "manus-onboarding-progress";

export type OnboardingStep = "upvote" | "search" | "submit";

export interface OnboardingState {
  upvote: boolean;
  search: boolean;
  submit: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  upvote: false,
  search: false,
  submit: false,
};

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      upvote: !!parsed.upvote,
      search: !!parsed.search,
      submit: !!parsed.submit,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be unavailable
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadState());
  }, []);

  const markComplete = useCallback((step: OnboardingStep) => {
    setState((prev) => {
      if (prev[step]) return prev; // already complete
      const next = { ...prev, [step]: true };
      saveState(next);
      return next;
    });
  }, []);

  const completedCount = [state.upvote, state.search, state.submit].filter(Boolean).length;
  const totalSteps = 3;
  const isComplete = completedCount === totalSteps;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return {
    state,
    markComplete,
    completedCount,
    totalSteps,
    isComplete,
    progressPercent,
  };
}

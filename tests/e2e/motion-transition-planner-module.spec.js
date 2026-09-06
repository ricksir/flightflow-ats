const { test, expect } = require('@playwright/test');

test('MotionTransitionPlanner carrega no navegador e permanece fora da navegação', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const api = window.FlightFlowMotionTransitionPlanner;
    if (!api) return { loaded: false };
    const state = {
      index: 4,
      speed: 1,
      playing: false,
      geo: { eventRoutes: Array.from({ length: 6 }, (_, i) => ({ target: i / 5 })) },
      motion: { initialized: true, currentProgress: 0.4, velocity: 3, ffrpTransition: null },
    };
    const routeApi = {
      transitionPlanForEvents(from, to) {
        return { fromIndex: from, toIndex: to, fromProgress: 0.4, toProgress: 1, checkpoints: [] };
      },
      transitionDurations() { return []; },
    };
    const planner = api.create({
      state,
      getRouteProcessedApi: () => routeApi,
      now: () => 321,
      warn: () => {},
    });
    planner.planMotionTransition(5);
    return {
      loaded: true,
      apiFrozen: Object.isFrozen(api),
      plannerFrozen: Object.isFrozen(planner),
      keys: Object.keys(planner),
      index: state.index,
      velocity: state.motion.velocity,
      transition: state.motion.ffrpTransition,
    };
  });

  expect(result.loaded).toBe(true);
  expect(result.apiFrozen).toBe(true);
  expect(result.plannerFrozen).toBe(true);
  expect(result.keys).toEqual(['planMotionTransition']);
  expect(result.index).toBe(4);
  expect(result.velocity).toBe(0);
  expect(result.transition).toEqual({ from: 0.4, to: 1, start: 321, duration: 1450 });
});

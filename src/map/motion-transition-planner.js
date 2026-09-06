(function () {
  'use strict';

  const create = ({ state, getRouteProcessedApi, now, warn } = {}) => {
    if (!state) throw new Error('state é obrigatório.');
    if (typeof getRouteProcessedApi !== 'function') throw new TypeError('getRouteProcessedApi deve ser função.');
    if (typeof now !== 'function') throw new TypeError('now deve ser função.');
    if (typeof warn !== 'function') throw new TypeError('warn deve ser função.');

    function planMotionTransition(nextIndex) {
      if (!state.motion) return;
      const route = state.geo && state.geo.eventRoutes && state.geo.eventRoutes[nextIndex];
      const target = Number(route && route.target);
      const current = Number.isFinite(Number(state.motion.currentProgress)) ? Number(state.motion.currentProgress) : target;
      if (Number.isFinite(target) && Number.isFinite(current) && state.motion.initialized) {
        let waypointPlan = null;
        try {
          const api = getRouteProcessedApi();
          const plan = api && typeof api.transitionPlanForEvents === 'function' ? api.transitionPlanForEvents(state.index, nextIndex) : null;
          const steps = plan && typeof api.transitionDurations === 'function' ? api.transitionDurations(plan, state.speed, state.playing) : [];
          if (plan && Array.isArray(steps) && steps.length) waypointPlan = {plan,steps};
        } catch (err) { warn('[FlightFlow] plano de transição por fixos:', err); }
        if (waypointPlan) {
          state.motion.ffrpTransition = {
            mode:'waypoints', from:current, to:target,
            steps:waypointPlan.steps, stepIndex:0, stepFrom:current,
            stepStart:now(), plan:waypointPlan.plan
          };
        } else {
          const delta = Math.abs(target - current);
          const speedFactor = state.playing ? Math.max(.75, Math.sqrt(Math.max(.25, Number(state.speed) || 1))) : 1;
          const duration = Math.max(650, Math.min(1450, 700 + delta * 2200)) / speedFactor;
          state.motion.ffrpTransition = { from: current, to: target, start: now(), duration };
        }
      } else state.motion.ffrpTransition = null;
      state.motion.velocity = 0;
    }

    return Object.freeze({ planMotionTransition });
  };

  window.FlightFlowMotionTransitionPlanner = Object.freeze({ create });
})();

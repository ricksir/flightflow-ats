(function () {
  'use strict';

  let state;
  let els;
  let pointAlongPolyline;
  let clamp01;
  let getCurrentMapSymbolScale;
  let smoothPath;
  let slicePolyline;
  let updateRadarTagPosition;
  let maybeFollowAircraft;
  let updateRealMapAircraft;
  let clamp;

  function resetMotionController() {
    const motion = state.motion;
    motion.initialized = false;
    motion.targetProgress = 0;
    motion.currentProgress = 0;
    motion.velocity = 0;
    motion.heading = 90;
    motion.pitch = 0;
    motion.bank = 0;
    motion.lastFrame = performance.now();
    motion.lastPoint = { x:205, y:748 };
    motion.ffrpTransition = null;
    state.renderedProgress = 0;
    state.renderedPlane = { x:205, y:748, angle:90, heading:90, progress:0, scale:1 };
  }

  function motionRoute() {
    const route = state.geo && state.geo.eventRoutes && state.geo.eventRoutes[state.index];
    if (route && Array.isArray(route.points) && route.points.length > 1) return route.points;
    return [{x:205,y:748},{x:800,y:450},{x:1370,y:575}];
  }

  function applyMotionFrame(progress, immediate=false) {
    const points = motionRoute();
    const hit = pointAlongPolyline(points, clamp01(progress));
    const prev = points[Math.max(0, hit.index - 1)] || hit.point;
    const next = points[Math.min(points.length - 1, hit.index)] || hit.point;
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const desiredHeading = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (Number.isFinite(desiredHeading)) {
      const previousHeading = Number.isFinite(state.motion.heading) ? state.motion.heading : desiredHeading;
      const angularDelta = ((desiredHeading - previousHeading + 540) % 360) - 180;
      state.motion.heading = previousHeading + angularDelta * (immediate ? 1 : .18);
    }
    state.motion.lastPoint = hit.point;
    state.renderedProgress = clamp01(progress);
    state.renderedPlane = { x:hit.point.x, y:hit.point.y, angle:state.motion.heading, heading:state.motion.heading, progress:clamp01(progress), scale:getCurrentMapSymbolScale('plane') };
    state.lastPlane = { x:hit.point.x, y:hit.point.y };
    if (els.planeGroup) {
      const scale = getCurrentMapSymbolScale('plane');
      els.planeGroup.setAttribute('transform', `translate(${hit.point.x.toFixed(1)} ${hit.point.y.toFixed(1)}) rotate(${state.motion.heading.toFixed(1)}) scale(${scale.toFixed(3)})`);
    }
    if (els.completedPath) els.completedPath.setAttribute('d', smoothPath(slicePolyline(points, progress).prefix));
    updateRadarTagPosition(hit.point);
    maybeFollowAircraft(hit.point);
    updateRealMapAircraft(state.renderedPlane);
  }

  function snapMotionTo(progress) {
    const value = clamp01(progress);
    state.motion.currentProgress = value;
    state.motion.targetProgress = value;
    state.motion.velocity = 0;
    state.motion.ffrpTransition = null;
    state.motion.initialized = true;
    applyMotionFrame(value, true);
  }

  function startMotionLoop() {
    if (state.motion.raf) cancelAnimationFrame(state.motion.raf);
    const frame = now => {
      const dt = clamp((now - (state.motion.lastFrame || now)) / 1000, 0, .06);
      state.motion.lastFrame = now;
      if (state.parsed && state.motion.initialized) {
        const target = clamp01(state.motion.targetProgress);
        const current = clamp01(state.motion.currentProgress);
        const diff = target - current;
        const transition = state.motion.ffrpTransition;
        if (transition && transition.mode === 'waypoints' && Array.isArray(transition.steps) && transition.steps.length && Math.abs(Number(transition.to) - target) < .0001) {
          const si = Math.max(0, Math.min(transition.steps.length - 1, Number(transition.stepIndex) || 0));
          const step = transition.steps[si];
          const fromProgress = Number.isFinite(Number(transition.stepFrom)) ? Number(transition.stepFrom) : current;
          const duration = Math.max(1, Number(step.duration) || 1);
          const u = clamp((now - Number(transition.stepStart || now)) / duration, 0, 1);
          // easing senoidal: velocidade contínua em cada perna e chegada suave exatamente no fixo.
          const eased = .5 - .5 * Math.cos(Math.PI * u);
          state.motion.currentProgress = clamp01(fromProgress + (Number(step.progress) - fromProgress) * eased);
          applyMotionFrame(state.motion.currentProgress);
          if (u >= 1) {
            // Renderiza explicitamente a coordenada do fixo por pelo menos um frame antes de seguir.
            state.motion.currentProgress = clamp01(Number(step.progress));
            applyMotionFrame(state.motion.currentProgress, true);
            try { window.dispatchEvent(new CustomEvent('flightflow:route-fix-crossed',{detail:{ident:step.ident||'',progress:state.motion.currentProgress,eventIndex:state.index}})); } catch (_) {}
            if (si >= transition.steps.length - 1) {
              state.motion.currentProgress = target;
              state.motion.ffrpTransition = null;
              applyMotionFrame(target, true);
            } else {
              transition.stepIndex = si + 1;
              transition.stepFrom = state.motion.currentProgress;
              transition.stepStart = now;
            }
          }
        } else if (transition && Math.abs(Number(transition.to) - target) < .0001) {
          const u = clamp((now - Number(transition.start || now)) / Math.max(1, Number(transition.duration) || 1), 0, 1);
          const eased = u * u * (3 - 2 * u);
          state.motion.currentProgress = clamp01(Number(transition.from) + (Number(transition.to) - Number(transition.from)) * eased);
          applyMotionFrame(state.motion.currentProgress);
          if (u >= 1) { state.motion.currentProgress = target; state.motion.ffrpTransition = null; applyMotionFrame(target, true); }
        } else if (Math.abs(diff) > .00005) {
          const factor = 1 - Math.exp(-dt * (state.playing ? 2.4 : 3.0));
          state.motion.currentProgress = current + diff * factor;
          applyMotionFrame(state.motion.currentProgress);
        } else if (current !== target) {
          state.motion.currentProgress = target;
          applyMotionFrame(target);
        }
      }
      state.motion.raf = requestAnimationFrame(frame);
    };
    state.motion.lastFrame = performance.now();
    state.motion.raf = requestAnimationFrame(frame);
  }

  function create(deps = {}) {
    state = deps.state;
    els = deps.els;
    pointAlongPolyline = deps.pointAlongPolyline;
    clamp01 = deps.clamp01;
    getCurrentMapSymbolScale = deps.getCurrentMapSymbolScale;
    smoothPath = deps.smoothPath;
    slicePolyline = deps.slicePolyline;
    updateRadarTagPosition = deps.updateRadarTagPosition;
    maybeFollowAircraft = deps.maybeFollowAircraft;
    updateRealMapAircraft = deps.updateRealMapAircraft;
    clamp = deps.clamp;
    if (!state || !state.motion) throw new Error('state.motion é obrigatório.');
    if (!els) throw new Error('els é obrigatório.');
    for (const [name, fn] of Object.entries({
      pointAlongPolyline, clamp01, getCurrentMapSymbolScale, smoothPath, slicePolyline,
      updateRadarTagPosition, maybeFollowAircraft, updateRealMapAircraft, clamp,
    })) {
      if (typeof fn !== 'function') throw new TypeError(`${name} deve ser função.`);
    }
    return Object.freeze({
      resetMotionController,
      motionRoute,
      applyMotionFrame,
      snapMotionTo,
      startMotionLoop,
    });
  }

  window.FlightFlowAircraftMotionController = Object.freeze({ create });
})();

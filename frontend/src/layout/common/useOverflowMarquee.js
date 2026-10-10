import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

export function useOverflowMarquee(props, mode) {
  const containerRef = ref(null);
  const textRef = ref(null);
  let animation;
  let resizeObserver;
  let mutationObserver;
  let measureFrame = 0;
  let disposed = false;

  function measure() {
    const container = containerRef.value;
    const text = textRef.value;
    if (!container || !text) return;

    animation?.cancel();
    animation = undefined;

    const containerWidth = container.clientWidth;
    const textWidth = text.scrollWidth;
    if (!containerWidth || textWidth <= containerWidth) return;

    // The existing speed prop is pixels per animation frame; use 60 Hz for duration.
    const pixelsPerSecond = props.speed * 60;
    const pause = props.pauseTime;
    let frames;
    let duration;

    if (mode === 'ping-pong') {
      const travel = (textWidth - containerWidth) / pixelsPerSecond * 1000;
      duration = travel * 2 + pause * 2;
      const left = `translateX(${containerWidth - textWidth}px)`;
      frames = [
        { transform: 'translateX(0px)', offset: 0 },
        { transform: 'translateX(0px)', offset: pause / duration },
        { transform: left, offset: (pause + travel) / duration },
        { transform: left, offset: (pause * 2 + travel) / duration },
        { transform: 'translateX(0px)', offset: 1 },
      ];
    } else {
      const space = props.extraSpace;
      const travelOut = (textWidth + space) / pixelsPerSecond * 1000;
      const travelIn = (containerWidth + space) / pixelsPerSecond * 1000;
      duration = travelOut + travelIn + pause;
      const switchPoint = travelOut / duration;
      frames = [
        { transform: 'translateX(0px)', offset: 0 },
        { transform: `translateX(-${textWidth + space}px)`, offset: switchPoint },
        { transform: `translateX(${containerWidth + space}px)`, offset: switchPoint },
        { transform: 'translateX(0px)', offset: (travelOut + travelIn) / duration },
        { transform: 'translateX(0px)', offset: 1 },
      ];
    }

    animation = text.animate(frames, { duration, iterations: Infinity, easing: 'linear' });
  }

  function scheduleMeasure() {
    if (disposed || measureFrame) return;
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      measure();
    });
  }

  onMounted(async () => {
    await nextTick();
    if (disposed || !containerRef.value || !textRef.value) return;

    resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerRef.value);
    resizeObserver.observe(textRef.value);
    mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(textRef.value, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    document.fonts?.ready.then(scheduleMeasure);
    scheduleMeasure();
  });

  onBeforeUnmount(() => {
    disposed = true;
    cancelAnimationFrame(measureFrame);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    animation?.cancel();
  });

  return { containerRef, textRef };
}

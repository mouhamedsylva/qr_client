import type { Ref } from 'vue';

/**
 * Défilement horizontal confortable à la souris pour une rangée (onglets,
 * pastilles, carrousel) : glisser-déplacer, molette verticale convertie en
 * défilement horizontal, et état des bords pour afficher des flèches.
 * Au doigt, le défilement natif du navigateur reste utilisé.
 */
export function useHScroll(el: Ref<HTMLElement | null | undefined>) {
  const canLeft = ref(false);
  const canRight = ref(false);

  function update() {
    const e = el.value;
    if (!e) return;
    canLeft.value = e.scrollLeft > 2;
    canRight.value = e.scrollLeft + e.clientWidth < e.scrollWidth - 2;
  }

  /** Fait défiler d'environ 70 % de la largeur visible. */
  function scrollBy(direction: 1 | -1) {
    const e = el.value;
    if (e) e.scrollBy({ left: direction * e.clientWidth * 0.7, behavior: 'smooth' });
  }

  // ─── Glisser-déplacer à la souris ───
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  let moved = false;

  function onPointerDown(ev: PointerEvent) {
    if (ev.pointerType !== 'mouse' || ev.button !== 0 || !el.value) return;
    dragging = true;
    moved = false;
    startX = ev.clientX;
    startLeft = el.value.scrollLeft;
  }
  function onPointerMove(ev: PointerEvent) {
    if (!dragging || !el.value) return;
    const dx = ev.clientX - startX;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      el.value.style.cursor = 'grabbing';
      el.value.style.userSelect = 'none';
    }
    if (moved) el.value.scrollLeft = startLeft - dx;
  }
  function onPointerUp() {
    if (!dragging || !el.value) return;
    dragging = false;
    el.value.style.cursor = '';
    el.value.style.userSelect = '';
  }
  // Après un glissement, le relâchement ne doit pas déclencher le clic sur un onglet.
  function onClickCapture(ev: MouseEvent) {
    if (moved) {
      ev.preventDefault();
      ev.stopPropagation();
      moved = false;
    }
  }

  // ─── Molette : vertical → horizontal tant que la rangée peut défiler ───
  function onWheel(ev: WheelEvent) {
    const e = el.value;
    if (!e || Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
    const atStart = e.scrollLeft <= 0 && ev.deltaY < 0;
    const atEnd = e.scrollLeft + e.clientWidth >= e.scrollWidth - 1 && ev.deltaY > 0;
    if (atStart || atEnd || e.scrollWidth <= e.clientWidth) return; // laisse défiler la page
    ev.preventDefault();
    e.scrollLeft += ev.deltaY;
  }

  let resize: ResizeObserver | null = null;
  watch(
    el,
    (e, old) => {
      if (old) {
        old.removeEventListener('scroll', update);
        old.removeEventListener('pointerdown', onPointerDown);
        old.removeEventListener('wheel', onWheel);
        old.removeEventListener('click', onClickCapture, true);
        resize?.disconnect();
      }
      if (!e) return;
      e.addEventListener('scroll', update, { passive: true });
      e.addEventListener('pointerdown', onPointerDown);
      e.addEventListener('wheel', onWheel, { passive: false });
      e.addEventListener('click', onClickCapture, true);
      resize = new ResizeObserver(update);
      resize.observe(e);
      nextTick(update);
    },
    { immediate: true, flush: 'post' },
  );

  onMounted(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    resize?.disconnect();
  });

  return { canLeft, canRight, scrollBy, update };
}

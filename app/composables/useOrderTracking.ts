import { createEventHook, useDocumentVisibility } from '@vueuse/core';
import { io, type Socket } from 'socket.io-client';
import type { CustomerOrder, OrderStatus, PaymentSummary } from '~/types/api';

/** Intervalle du repli par polling quand le WebSocket est coupé (NOT-06). */
const POLL_MS = 15_000;

/**
 * Suivi d'une commande en temps réel : connexion Socket.IO authentifiée par
 * le jeton de suivi, rechargement complet à chaque (re)connexion pour ne rien
 * manquer, et polling tant que le temps réel est indisponible.
 */
export function useOrderTracking(orderId: string, token: string) {
  const api = useApi();
  const config = useRuntimeConfig();
  const headers = { 'X-Order-Token': token };

  const order = ref<CustomerOrder | null>(null);
  const payments = ref<PaymentSummary | null>(null);
  const error = ref<unknown>(null);
  const live = ref(false);
  /** Appelé à chaque changement de statut (son, vibration…). */
  const onStatusChange = createEventHook<{ from: OrderStatus; to: OrderStatus }>();

  function setOrder(next: CustomerOrder) {
    const from = order.value?.status;
    order.value = next;
    if (from && from !== next.status) void onStatusChange.trigger({ from, to: next.status });
  }

  async function refresh() {
    try {
      const [o, p] = await Promise.all([
        api<CustomerOrder>(`/public/orders/${orderId}`, { headers, silent: true }),
        api<PaymentSummary>(`/public/orders/${orderId}/payments`, { headers, silent: true }),
      ]);
      setOrder(o);
      payments.value = p;
      error.value = null;
    } catch (err) {
      error.value = err;
    }
  }

  let socket: Socket | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function connect() {
    socket = io(`${config.public.socketUrl}/realtime`, {
      auth: { orderId, orderToken: token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => {
      live.value = true;
      void refresh(); // rattrapage après une coupure
    });
    socket.on('disconnect', () => (live.value = false));
    socket.on('connect_error', () => (live.value = false));
    const onOrder = (msg: { payload: CustomerOrder }) => setOrder(msg.payload);
    socket.on('order.status_changed', onOrder);
    socket.on('order.items_added', onOrder);
    socket.on('order.payment_updated', (msg: { payload: Omit<PaymentSummary, 'payments'> & { payments: PaymentSummary['payments'] } }) => {
      payments.value = msg.payload;
      if (order.value) order.value = { ...order.value, paymentStatus: msg.payload.paymentStatus };
    });
  }

  // Le navigateur mobile suspend les onglets en arrière-plan : on resynchronise au retour.
  const visibility = useDocumentVisibility();
  watch(visibility, (v) => {
    if (v === 'visible') void refresh();
  });

  onMounted(async () => {
    await refresh();
    connect();
    timer = setInterval(() => {
      if (!live.value && visibility.value === 'visible') void refresh();
    }, POLL_MS);
  });

  onBeforeUnmount(() => {
    socket?.disconnect();
    if (timer) clearInterval(timer);
  });

  return { order, payments, error, live, refresh, onStatusChange: onStatusChange.on, headers };
}

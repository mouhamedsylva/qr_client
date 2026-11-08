/** Montants et heures dans la devise, la langue et le fuseau du restaurant consulté. */
export function useMoney() {
  const venue = useVenueStore();
  const timeZone = () => venue.restaurant?.timezone ?? 'Africa/Dakar';
  return {
    money: (amount: number, currency?: string) => formatMoney(amount, currency ?? venue.currency, venue.locale),
    time: (date: string | Date) => formatDateTime(date, timeZone(), { hour: '2-digit', minute: '2-digit' }),
    dateTime: (date: string | Date) => formatDateTime(date, timeZone(), { dateStyle: 'medium', timeStyle: 'short' }),
  };
}

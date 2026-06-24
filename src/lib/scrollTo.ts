export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function scrollToSubscribe() {
  scrollToId('subscribe');
}

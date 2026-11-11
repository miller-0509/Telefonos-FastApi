/**
 * Formatea valores numéricos a moneda colombiana COP ($ 5.499.900)
 */
export function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return '$ ' + Math.round(Number(amount)).toLocaleString('es-CO');
}

/**
 * Formatea fechas ISO a formato legible en español
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

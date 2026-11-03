const LABELS: Record<string, string> = {
  necessidades: "Necessidades",
  desejos: "Desejos",
  futuro: "Futuro",
  amortizacao_apto: "Amortização do apto",
  reserva: "Reserva e investimentos",
}

export function labelOf(id: string) {
  return LABELS[id] ?? id.replaceAll("_", " ")
}

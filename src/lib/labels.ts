const LABELS: Record<string, string> = {
  necessidades: "Necessidades",
  desejos: "Desejos",
  seguranca: "Segurança",
  futuro: "Futuro",
  moradia: "Moradia",
  mercado: "Mercado",
  familia_educacao: "Família e educação",
  dizimo: "Dízimo",
  transporte: "Transporte",
  saude: "Saúde",
  contas_consumo: "Contas de consumo",
  pessoais: "Pessoais",
  emergencia: "Emergência",
  despesas_anuais: "Despesas anuais",
  manutencao: "Manutenção",
  amortizacao_apto: "Amortização do apto",
  reserva: "Reserva e investimentos",
  aposentadoria: "Aposentadoria",
  consulta: "Consulta",
  combustivel: "Combustível",
  restaurante: "Restaurante",
  presente: "Presente",
  carro: "Carro",
  casa: "Casa",
  educacao: "Educação",
  celular: "Celular",
  cuidados: "Cuidados",
}

export function labelOf(id: string) {
  return LABELS[id] ?? id.replaceAll("_", " ")
}

const API_URL = 'https://api.frankfurter.dev/v2/rate/'

export async function buscarCotacao(moedaOrigem, moedaDestino) {
  if (moedaOrigem === moedaDestino) {
    return {
      rate: 1,
      date: new Date().toISOString().slice(0, 10)
    }
  }

  const url = API_URL + moedaOrigem + '/' + moedaDestino

  const resposta = await fetch(url)

  if (!resposta.ok) {
    throw new Error('Não foi possível consultar a cotação.')
  }

  const dados = await resposta.json()

  return {
    rate: dados.rate,
    date: dados.date
  }
}
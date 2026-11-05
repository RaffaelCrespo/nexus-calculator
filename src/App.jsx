
import { useEffect, useState } from 'react'
import {
  Calculator,
  ArrowLeftRight,
  RefreshCw,
  LayoutDashboard,
  History,
  Moon,
  Sun,
  ArrowUpRight,
  Clock3,
  Search,
  ChartNoAxesCombined,
  Plus,
  MoreHorizontal,
  Menu,
  X
} from 'lucide-react'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

import './App.css'

// Avalia expressões matemáticas sem executar código JavaScript.
function avaliarExpressao(expressao) {
  const tokens = expressao.match(/\d+(?:\.\d*)?|\.\d+|[()+\-*/]/g)

  if (!tokens || tokens.join('') !== expressao.replace(/\s/g, '')) {
    throw new Error('Expressão inválida')
  }

  let posicao = 0

  function expressaoMatematica() {
    let resultado = termo()

    while (tokens[posicao] === '+' || tokens[posicao] === '-') {
      const operador = tokens[posicao]
      posicao++

      const proximo = termo()

      resultado = operador === '+'
        ? resultado + proximo
        : resultado - proximo
    }

    return resultado
  }

  function termo() {
    let resultado = fator()

    while (tokens[posicao] === '*' || tokens[posicao] === '/') {
      const operador = tokens[posicao]
      posicao++

      const proximo = fator()

      if (operador === '/' && proximo === 0) {
        throw new Error('Divisão por zero')
      }

      resultado = operador === '*'
        ? resultado * proximo
        : resultado / proximo
    }

    return resultado
  }

  function fator() {
    const token = tokens[posicao]

    if (token === '-') {
      posicao++
      return -fator()
    }

    if (token === '+') {
      posicao++
      return fator()
    }

    if (token === '(') {
      posicao++
      const resultado = expressaoMatematica()

      if (tokens[posicao] !== ')') {
        throw new Error('Parênteses inválidos')
      }

      posicao++
      return resultado
    }

    if (token === undefined || !Number.isFinite(Number(token))) {
      throw new Error('Expressão inválida')
    }

    posicao++
    return Number(token)
  }

  const resultado = expressaoMatematica()

  if (posicao !== tokens.length || !Number.isFinite(resultado)) {
    throw new Error('Expressão inválida')
  }

  return resultado
}

function App() {
  const [pagina, setPagina] = useState('dashboard')

  const [historico, setHistorico] = useState(() => {
    try {
      const salvo = localStorage.getItem('nexus-historico')
      const dados = salvo ? JSON.parse(salvo) : []

      return Array.isArray(dados) ? dados : []
    } catch {
      return []
    }
  })

  const [menuAberto, setMenuAberto] = useState(false)
  const [temaClaro, setTemaClaro] = useState(false)
  const [expressao, setExpressao] = useState('0')

  const [valorOrigem, setValorOrigem] = useState('1000')
  const [moedaOrigem, setMoedaOrigem] = useState('BRL')
  const [moedaDestino, setMoedaDestino] = useState('USD')

  const [cotacao, setCotacao] = useState(null)
  const [dataCotacao, setDataCotacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erroCotacao, setErroCotacao] = useState('')
  const [atualizacao, setAtualizacao] = useState(0)

  const [dadosGrafico, setDadosGrafico] = useState([])
  const [carregandoGrafico, setCarregandoGrafico] = useState(false)
  const [erroGrafico, setErroGrafico] = useState('')
  const [moedaGraficoOrigem, setMoedaGraficoOrigem] = useState('BRL')
  const [moedaGraficoDestino, setMoedaGraficoDestino] = useState('USD')
  const [periodoGrafico, setPeriodoGrafico] = useState(30)

  const menu = [
    { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'converter', label: 'Conversor', icon: ArrowLeftRight },
    { id: 'history', label: 'Histórico', icon: History }
  ]

  const botoes = [
    ['AC', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['⌫', '0', '.', '=']
  ]

  const simbolos = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'Fr',
    CNY: '¥',
    INR: '₹',
    MXN: '$',
    KRW: '₩',
    SGD: 'S$',
    NZD: 'NZ$',
    ZAR: 'R'
  }

  // consulta a cotação das moedas selecionadas
  useEffect(() => {
    let ativo = true
    const controller = new AbortController()

    async function buscarCotacao() {
      if (moedaOrigem === moedaDestino) {
        setCotacao(1)
        setDataCotacao('')
        setErroCotacao('')
        setCarregando(false)
        return
      }

      setCarregando(true)
      setErroCotacao('')
      setCotacao(null)

      try {
        const url = `https://api.frankfurter.dev/v2/rate/${moedaOrigem}/${moedaDestino}`

        const resposta = await fetch(url, {
          signal: controller.signal
        })

        if (!resposta.ok) {
          throw new Error('Não foi possível consultar essa cotação.')
        }

        const dados = await resposta.json()

        if (typeof dados.rate !== 'number') {
          throw new Error('Cotação inválida recebida da API.')
        }

        if (ativo) {
          setCotacao(dados.rate)
          setDataCotacao(dados.date || '')
        }
      } catch (erro) {
        if (ativo && erro.name !== 'AbortError') {
          setErroCotacao('Não foi possível carregar a cotação. Tente novamente.')
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    buscarCotacao()

    return () => {
      ativo = false
      controller.abort()
    }
  }, [moedaOrigem, moedaDestino, atualizacao])

  // Busca os dados históricos utilizados no gráfico.
  useEffect(() => {
    const controller = new AbortController()

    async function carregarHistorico() {
      setCarregandoGrafico(true)
      setErroGrafico('')

      if (moedaGraficoOrigem === moedaGraficoDestino) {
        setDadosGrafico([])
        setErroGrafico('Selecione moedas diferentes.')
        setCarregandoGrafico(false)
        return
      }

      const hoje = new Date()
      const inicio = new Date()

      inicio.setDate(hoje.getDate() - periodoGrafico)

      function formatarDataAPI(data) {
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const dia = String(data.getDate()).padStart(2, '0')

        return `${ano}-${mes}-${dia}`
      }

      const dataInicio = formatarDataAPI(inicio)
      const dataFim = formatarDataAPI(hoje)

      const url = `https://api.frankfurter.dev/v2/rates?from=${dataInicio}&to=${dataFim}&base=${moedaGraficoOrigem}&quotes=${moedaGraficoDestino}`

      try {
        const resposta = await fetch(url, {
          signal: controller.signal
        })

        if (!resposta.ok) {
          throw new Error('Erro ao buscar cotações.')
        }

        const dados = await resposta.json()

        const serie = dados.map(item => ({
          data: item.date,
          dataFormatada: new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
          }),
          cotacao: item.rate
        }))

        setDadosGrafico(serie)
      } catch (erro) {
        if (erro.name !== 'AbortError') {
          setErroGrafico('Não foi possível carregar o histórico cambial.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoGrafico(false)
        }
      }
    }

    carregarHistorico()

    return () => controller.abort()
  }, [moedaGraficoOrigem, moedaGraficoDestino, periodoGrafico])

  // Salva o histórico no navegador sempre que ele é atualizado.
  useEffect(() => {
    localStorage.setItem('nexus-historico', JSON.stringify(historico))
  }, [historico])

  const numeroOrigem = Number(valorOrigem.replace(',', '.'))

  const resultadoConversao =
    cotacao !== null &&
    valorOrigem.trim() !== '' &&
    Number.isFinite(numeroOrigem)
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: moedaDestino
        }).format(numeroOrigem * cotacao)
      : '—'

  const moedasUtilizadas = new Set(
    historico.flatMap(item => [item.moedaOrigem, item.moedaDestino])
  ).size

  const ultimaAtividade = historico.length > 0
    ? new Date(historico[0].data).toLocaleDateString('pt-BR')
    : 'Nenhuma'

  function registrarConversao() {
    if (
      carregando ||
      erroCotacao ||
      cotacao === null ||
      valorOrigem.trim() === '' ||
      !Number.isFinite(numeroOrigem)
    ) {
      return
    }

    const novoRegistro = {
      id: Date.now(),
      valorOrigem: numeroOrigem,
      moedaOrigem,
      moedaDestino,
      cotacao,
      valorConvertido: numeroOrigem * cotacao,
      data: new Date().toISOString()
    }

    setHistorico(atual => [novoRegistro, ...atual])
  }

  function formatarCotacao() {
    if (carregando) {
      return 'Buscando cotação...'
    }

    if (erroCotacao) {
      return erroCotacao
    }

    if (cotacao === null) {
      return 'Aguardando cotação...'
    }

    if (moedaOrigem === moedaDestino) {
      return 'Mesma moeda — conversão 1:1.'
    }

    const taxaFormatada = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 6
    }).format(cotacao)

    const dataFormatada = dataCotacao
      ? dataCotacao.split('-').reverse().join('/')
      : ''

    return '1 ' + moedaOrigem + ' = ' + taxaFormatada
      + ' ' + moedaDestino
      + (dataFormatada ? ' · Referência: ' + dataFormatada : '')
  }

  function calcular() {
    try {
      const limpa = expressao
        .replaceAll('×', '*')
        .replaceAll('÷', '/')
        .replaceAll('−', '-')

      const resultado = avaliarExpressao(limpa)

      setExpressao(String(Number(resultado.toFixed(8))))
    } catch {
      setExpressao('Erro')
    }
  }

  function pressionarBotao(valor) {
    if (valor === 'AC') {
      setExpressao('0')
      return
    }

    if (valor === '⌫') {
      if (expressao === 'Erro') {
        setExpressao('0')
        return
      }

      setExpressao(
        expressao.length > 1
          ? expressao.slice(0, -1)
          : '0'
      )
      return
    }

    if (valor === '=') {
      if (expressao !== 'Erro') {
        calcular()
      }
      return
    }

    if (valor === '±') {
      if (expressao === 'Erro') {
        setExpressao('0')
        return
      }

      setExpressao(
        expressao.startsWith('-')
          ? expressao.slice(1)
          : '-' + expressao
      )
      return
    }

    if (valor === '%') {
      const numero = Number(expressao)

      if (Number.isFinite(numero)) {
        setExpressao(String(numero / 100))
      }

      return
    }

    if (expressao === 'Erro') {
      if (/^\d$/.test(valor) || valor === '.') {
        setExpressao(valor === '.' ? '0.' : valor)
      }

      return
    }

    setExpressao(
      expressao === '0'
        ? valor
        : expressao + valor
    )
  }

  function trocarMoedas() {
    setMoedaOrigem(moedaDestino)
    setMoedaDestino(moedaOrigem)
  }

  function salvarNoHistoricoDesabilitado() {
    return (
      carregando ||
      Boolean(erroCotacao) ||
      cotacao === null ||
      valorOrigem.trim() === '' ||
      !Number.isFinite(numeroOrigem)
    )
  }

  return (
    <div className={`app-shell ${temaClaro ? 'light-theme' : ''}`}>
      <aside className={`sidebar ${menuAberto ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <span>N</span>
          </div>

          <span className="brand-name">
            NEXUS<span>.</span>
          </span>

          <button
            className="mobile-close"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-label">MENU PRINCIPAL</div>

        <nav className="navigation">
          {menu.map(item => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                className={`nav-item ${pagina === item.id ? 'active' : ''}`}
                onClick={() => {
                  setPagina(item.id)
                  setMenuAberto(false)
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-glow" />

            <div className="upgrade-icon">
              <ArrowUpRight size={18} />
            </div>

            <strong>Seu dinheiro,</strong>
            <strong>novas possibilidades.</strong>

            <p>Controle suas operações em um só lugar.</p>
          </div>

          <button
            className="nav-item settings-item"
            onClick={() => setTemaClaro(!temaClaro)}
          >
            {temaClaro ? <Moon size={19} /> : <Sun size={19} />}
            <span>Alternar aparência</span>
          </button>

          <div className="sidebar-footer">
            <div className="avatar">N</div>

            <div className="profile-info">
              <strong>Meu espaço</strong>
              <span>Personal workspace</span>
            </div>

            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      {menuAberto && (
        <div
          className="mobile-overlay"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
            >
              <Menu size={21} />
            </button>

            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>

            <strong>
              {menu.find(item => item.id === pagina)?.label || 'Visão geral'}
            </strong>
          </div>

          <div className="topbar-actions">
            <div className="status-indicator">
              <span />
              Sistema operacional
            </div>

            <button
              className="icon-button"
              onClick={() => setTemaClaro(!temaClaro)}
              aria-label="Alternar tema"
            >
              {temaClaro ? <Moon size={19} /> : <Sun size={19} />}
            </button>

            <div className="top-avatar">N</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <span />
                FINANCE & PRODUCTIVITY
              </div>

              <h1>
                {pagina === 'dashboard'
                  ? 'Tudo em perspectiva.'
                  : `${menu.find(item => item.id === pagina)?.label || 'NEXUS'}.`}
              </h1>

              <p>Um espaço inteligente para seus cálculos e conversões.</p>
            </div>

            <div className="date-label">
              <Clock3 size={15} />
              Seu espaço de trabalho
            </div>
          </section>

          {pagina === 'dashboard' && (
            <>
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>CONVERSÕES REGISTRADAS</span>

                    <div className="stat-icon purple">
                      <ArrowLeftRight size={18} />
                    </div>
                  </div>

                  <div className="stat-value">
                    {historico.length}
                  </div>

                  <div className="stat-bottom">
                    <span>Operações salvas no histórico</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>MOEDAS UTILIZADAS</span>

                    <div className="stat-icon blue">
                      <Plus size={18} />
                    </div>
                  </div>

                  <div className="stat-value">
                    {String(moedasUtilizadas).padStart(2, '0')}
                  </div>

                  <div className="stat-bottom">
                    <span>Moedas presentes no histórico</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>ÚLTIMA CONVERSÃO</span>

                    <div className="stat-icon green">
                      <Clock3 size={18} />
                    </div>
                  </div>

                  <div className="stat-value stat-time">
                    {ultimaAtividade}
                  </div>

                  <div className="stat-bottom">
                    <span>
                      {historico.length > 0
                        ? 'Data da última operação salva'
                        : 'Nenhuma operação registrada'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="workspace-grid">
                <div className="panel calculator-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="panel-icon purple">
                        <Calculator size={18} />
                      </div>

                      <div>
                        <h2>Calculadora</h2>
                        <p>Simples, rápida e precisa.</p>
                      </div>
                    </div>

                    <button
                      className="text-link"
                      onClick={() => setPagina('calculator')}
                    >
                      Abrir <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="calculator-display">
                    <span>RESULTADO</span>
                    <div>{expressao}</div>
                  </div>

                  <div className="calculator-keys">
                    {botoes.flat().map((botao, i) => (
                      <button
                        key={`${botao}-${i}`}
                        className={`${['AC', '±', '%'].includes(botao) ? 'key-muted' : ''} ${['÷', '×', '−', '+', '='].includes(botao) ? 'key-operator' : ''} ${botao === '=' ? 'key-equal' : ''}`}
                        onClick={() => pressionarBotao(botao)}
                      >
                        {botao}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="right-column">
                  <div className="panel converter-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="panel-icon blue">
                          <ArrowLeftRight size={18} />
                        </div>

                        <div>
                          <h2>Conversor de moedas</h2>
                          <p>Converta valores entre moedas.</p>
                        </div>
                      </div>

                      <button
                        className="text-link"
                        onClick={() => setPagina('converter')}
                      >
                        Abrir <ArrowUpRight size={15} />
                      </button>
                    </div>

                    <div className="currency-input">
                      <label>VOCÊ ENVIA</label>

                      <div className="currency-field">
                        <input
                          value={valorOrigem}
                          onChange={e => setValorOrigem(e.target.value)}
                          inputMode="decimal"
                        />

                        <select
                          value={moedaOrigem}
                          onChange={e => setMoedaOrigem(e.target.value)}
                        >
                          {Object.keys(simbolos).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="swap-row">
                      <span>CONVERSÃO</span>

                      <button
                        onClick={trocarMoedas}
                        aria-label="Inverter moedas"
                      >
                        <ArrowLeftRight size={17} />
                      </button>
                    </div>

                    <div className="currency-input">
                      <label>VOCÊ RECEBE</label>

                      <div className="currency-field">
                        <div className="converted-value">
                          {resultadoConversao}
                        </div>

                        <select
                          value={moedaDestino}
                          onChange={e => setMoedaDestino(e.target.value)}
                        >
                          {Object.keys(simbolos).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        className="save-history-button dashboard-save-button"
                        onClick={registrarConversao}
                        disabled={salvarNoHistoricoDesabilitado()}
                      >
                        <Plus size={14} />
                        Salvar no histórico
                      </button>
                    </div>

                    <div className="rate-note">
                      <span className="rate-dot" />
                      {formatarCotacao()}

                      <button
                        className="refresh-button"
                        onClick={() => setAtualizacao(atual => atual + 1)}
                        disabled={carregando}
                        title="Atualizar cotação"
                        aria-label="Atualizar cotação"
                      >
                        <RefreshCw
                          size={16}
                          className={carregando ? 'refresh-spinning' : ''}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="panel activity-panel">
                    <div className="panel-heading compact-heading">
                      <div>
                        <h2>Atividade recente</h2>
                        <p>Suas últimas movimentações.</p>
                      </div>

                      <button
                        className="more-button"
                        onClick={() => setPagina('history')}
                        aria-label="Ver histórico completo"
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </div>

                    {historico.length > 0 ? (
                      historico.slice(0, 2).map(item => (
                        <div className="activity-item" key={item.id}>
                          <div className="activity-symbol">
                            <ArrowUpRight size={17} />
                          </div>

                          <div className="activity-description">
                            <strong>
                              {item.moedaOrigem} → {item.moedaDestino}
                            </strong>
                            <span>Conversão de moedas</span>
                          </div>

                          <div className="activity-value">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: item.moedaDestino
                            }).format(item.valorConvertido)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <p>Nenhuma conversão registrada ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-icon purple">
                      <ChartNoAxesCombined size={18} />
                    </div>

                    <div>
                      <h2>Evolução cambial</h2>
                      <p>Variação da cotação nos últimos {periodoGrafico} dias.</p>
                    </div>
                  </div>
                </div>

                <div className="chart-controls">
                  <button
                    className="chart-swap-button"
                    onClick={() => {
                      setMoedaGraficoOrigem(moedaGraficoDestino)
                      setMoedaGraficoDestino(moedaGraficoOrigem)
                    }}
                    title="Inverter moedas"
                    aria-label="Inverter moedas do gráfico"
                  >
                    <ArrowLeftRight size={17} />
                  </button>

                  <div className="chart-currency-select">
                    <label>MOEDA DE ORIGEM</label>

                    <select
                      value={moedaGraficoOrigem}
                      onChange={e => setMoedaGraficoOrigem(e.target.value)}
                    >
                      {Object.keys(simbolos).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="chart-currency-select">
                    <label>MOEDA DE DESTINO</label>

                    <select
                      value={moedaGraficoDestino}
                      onChange={e => setMoedaGraficoDestino(e.target.value)}
                    >
                      {Object.keys(simbolos).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="chart-period-select">
                    <label>PERÍODO</label>

                    <div>
                      {[7, 30, 90].map(periodo => (
                        <button
                          key={periodo}
                          className={periodoGrafico === periodo ? 'active' : ''}
                          onClick={() => setPeriodoGrafico(periodo)}
                        >
                          {periodo}D
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="chart-summary">
                  <div>
                    <span>ÚLTIMA COTAÇÃO DISPONÍVEL</span>

                    <strong>
                      {dadosGrafico.length > 0
                        ? dadosGrafico[dadosGrafico.length - 1].cotacao.toFixed(4)
                        : '--'}
                    </strong>

                    <small>{moedaGraficoOrigem} / {moedaGraficoDestino}</small>
                  </div>

                  <div>
                    <span>VARIAÇÃO NO PERÍODO</span>

                    <strong
                      className={
                        dadosGrafico.length > 1
                          ? dadosGrafico[dadosGrafico.length - 1].cotacao >= dadosGrafico[0].cotacao
                            ? 'chart-positive'
                            : 'chart-negative'
                          : ''
                      }
                    >
                      {dadosGrafico.length > 1
                        ? `${(((dadosGrafico[dadosGrafico.length - 1].cotacao / dadosGrafico[0].cotacao) - 1) * 100).toFixed(2)}%`
                        : '--'}
                    </strong>

                    <small>Últimos {periodoGrafico} dias</small>
                  </div>
                </div>

                <div className="chart-container">
                  {carregandoGrafico ? (
                    <p>Carregando histórico cambial...</p>
                  ) : erroGrafico ? (
                    <p>{erroGrafico}</p>
                  ) : dadosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="dataFormatada"
                          interval="preserveStartEnd"
                          minTickGap={35}
                          tick={{ fontSize: 12 }}
                          tickMargin={10}
                        />

                        <YAxis domain={['auto', 'auto']} />

                        <Tooltip
                          formatter={valor => [
                            Number(valor).toFixed(4),
                            'Cotação'
                          ]}
                          labelFormatter={label => `Data: ${label}`}
                          contentStyle={{
                            backgroundColor: '#191a27',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            borderRadius: '12px',
                            padding: '12px',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
                          }}
                          labelStyle={{
                            color: '#a1a1aa',
                            marginBottom: '6px'
                          }}
                          itemStyle={{
                            color: '#a78bfa',
                            fontWeight: 600
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="cotacao"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Não há dados disponíveis para este período.</p>
                  )}
                </div>
              </section>
            </>
          )}

          {pagina === 'calculator' && (
            <section className="panel standalone-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-icon purple">
                    <Calculator size={18} />
                  </div>

                  <div>
                    <h2>Calculadora</h2>
                    <p>Faça seus cálculos com praticidade.</p>
                  </div>
                </div>
              </div>

              <div className="large-calculator">
                <div className="calculator-display">
                  <span>RESULTADO</span>
                  <div>{expressao}</div>
                </div>

                <div className="calculator-keys">
                  {botoes.flat().map((botao, i) => (
                    <button
                      key={`${botao}-${i}`}
                      className={`${['AC', '±', '%'].includes(botao) ? 'key-muted' : ''} ${['÷', '×', '−', '+', '='].includes(botao) ? 'key-operator' : ''} ${botao === '=' ? 'key-equal' : ''}`}
                      onClick={() => pressionarBotao(botao)}
                    >
                      {botao}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {pagina === 'converter' && (
            <section className="panel standalone-panel converter-standalone">
              <div className="panel-heading">
                <div>
                  <div className="panel-icon blue">
                    <ArrowLeftRight size={18} />
                  </div>

                  <div>
                    <h2>Conversor de moedas</h2>
                    <p>Converta valores entre diferentes moedas.</p>
                  </div>
                </div>
              </div>

              <div className="converter-large">
                <div className="currency-input">
                  <label>VALOR DE ORIGEM</label>

                  <div className="currency-field">
                    <input
                      value={valorOrigem}
                      onChange={e => setValorOrigem(e.target.value)}
                      inputMode="decimal"
                    />

                    <select
                      value={moedaOrigem}
                      onChange={e => setMoedaOrigem(e.target.value)}
                    >
                      {Object.keys(simbolos).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  className="large-swap"
                  onClick={trocarMoedas}
                  aria-label="Inverter moedas"
                >
                  <ArrowLeftRight size={20} />
                </button>

                <div className="currency-input">
                  <label>MOEDA DE DESTINO</label>

                  <div className="currency-field">
                    <div className="converted-value">
                      {resultadoConversao}
                    </div>

                    <select
                      value={moedaDestino}
                      onChange={e => setMoedaDestino(e.target.value)}
                    >
                      {Object.keys(simbolos).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="save-history-button"
                    onClick={registrarConversao}
                    disabled={salvarNoHistoricoDesabilitado()}
                  >
                    <Plus size={16} />
                    Salvar no histórico
                  </button>
                </div>

                <div className="rate-note">
                  <span className="rate-dot" />
                  {formatarCotacao()}

                  <button
                    className="refresh-button"
                    onClick={() => setAtualizacao(atual => atual + 1)}
                    disabled={carregando}
                    title="Atualizar cotação"
                    aria-label="Atualizar cotação"
                  >
                    <RefreshCw
                      size={16}
                      className={carregando ? 'refresh-spinning' : ''}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}

          {pagina === 'history' && (
            <section className="panel standalone-panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-icon purple">
                    <History size={18} />
                  </div>

                  <div>
                    <h2>Histórico</h2>
                    <p>Suas atividades aparecerão aqui.</p>
                  </div>
                </div>
              </div>

              {historico.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Search size={24} />
                  </div>

                  <h3>Nenhuma atividade registrada</h3>

                  <p>
                    Seu histórico será preenchido conforme você utilizar o NEXUS.
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {historico.map(item => (
                    <div className="history-item" key={item.id}>
                      <div>
                        <strong>
                          {item.moedaOrigem} → {item.moedaDestino}
                        </strong>

                        <p>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: item.moedaOrigem
                          }).format(item.valorOrigem)}
                          {' → '}
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: item.moedaDestino
                          }).format(item.valorConvertido)}
                        </p>

                        <small>
                          {new Date(item.data).toLocaleString('pt-BR')}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <footer className="page-footer">
            <span>© 2026 NEXUS. Todos os direitos reservados.</span>

            <span>
              Desenvolvido por <strong>Raffael Crespo</strong>
              <span className="footer-dot">◆</span>
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App

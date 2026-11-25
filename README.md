# Open Transit Sim

Simulador open-source de planejamento e gestão de transporte público urbano baseado em dados geográficos reais (OpenStreetMap).

## Objetivo
Permitir que cidadãos, estudantes e planejadores urbanos testem redes de ônibus em suas próprias cidades respeitando o orçamento municipal, metas de redução de CO₂, acessibilidade da frota e sustentabilidade financeira, gerando ao final um dossiê técnico em PDF e arquivos no padrão GTFS.

## Arquitetura
- **`/backend`**: Motor de grafos viários, simulação econômica/ambiental e exportação PDF/GTFS (Python, FastAPI, OSMnx, NetworkX).
- **`/frontend`**: Mapa interativo, construção de linhas e painel de indicadores em tempo real (TypeScript, React, MapLibre GL).

## Status do Desenvolvimento
- [x] Estrutura inicial do repositório
- [ ] Motor viário em Python (OSMnx + FastAPI)
- [ ] Mapa interativo em TypeScript (MapLibre)
- [ ] Simulação de demanda, finanças e CO₂
- [ ] Exportação de proposta técnica (PDF + GTFS)
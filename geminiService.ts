import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisData, SavedAnalysis, MatchHistory, LiveOddsMarket, OverOddLine } from "./types";
import { SYSTEM_PROMPT, POST_MATCH_PROMPT } from "./constants";

export interface TeamAutomaticStats {
  htPercentage: number;
  avgScored: number;
  avgConceded: number;
  logoUrl?: string;
  recentMatches: MatchHistory[];
  sources: { title: string; uri: string }[];
}

export const fetchTeamAutomaticStats = async (
  teamName: string, 
  league: string, 
  isHome: boolean
): Promise<TeamAutomaticStats> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const context = isHome ? "como mandante (em casa)" : "como visitante (fora de casa)";
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Pesquise as estatísticas do time de futebol "${teamName}" na temporada 2024/2025.
      
      INSTRUÇÕES CRÍTICAS:
      1. Colete a URL do escudo (.png ou .svg).
      2. HT Goal %: Jogos com gol no 1º tempo.
      3. Médias jogando ${context}.
      4. ÚLTIMOS 10 JOGOS EM GERAL: Preciso de uma lista dos últimos 10 jogos (todas as competições), contendo: Oponente, Gols do ${teamName}, Gols do Oponente e se o ${teamName} era Mandante (true/false).
      
      Retorne APENAS um objeto JSON válido.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            htPercentage: { type: Type.NUMBER },
            avgScored: { type: Type.NUMBER },
            avgConceded: { type: Type.NUMBER },
            logoUrl: { type: Type.STRING },
            recentMatches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  opponent: { type: Type.STRING },
                  goalsFor: { type: Type.INTEGER },
                  goalsAgainst: { type: Type.INTEGER },
                  isHome: { type: Type.BOOLEAN }
                },
                required: ["opponent", "goalsFor", "goalsAgainst", "isHome"]
              }
            }
          },
          required: ["htPercentage", "avgScored", "avgConceded", "logoUrl", "recentMatches"]
        }
      },
    });

    const stats = JSON.parse(response.text || "{}");
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      }));

    return { 
      htPercentage: stats.htPercentage || 50, 
      avgScored: stats.avgScored || 0, 
      avgConceded: stats.avgConceded || 0, 
      logoUrl: stats.logoUrl,
      recentMatches: stats.recentMatches || Array(10).fill({ opponent: '', goalsFor: 0, goalsAgainst: 0, isHome: true }),
      sources 
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas automáticas:", error);
    return { 
      htPercentage: 50, 
      avgScored: 0, 
      avgConceded: 0, 
      recentMatches: Array(10).fill({ opponent: '', goalsFor: 0, goalsAgainst: 0, isHome: true }),
      sources: [] 
    };
  }
};

export const fetchLiveOdds = async (
  homeTeam: string,
  awayTeam: string,
  minute: number,
  score: string
): Promise<{ marketOdds: LiveOddsMarket; overOdds: OverOddLine[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Busque as odds AO VIVO em sites como Bet365 e Betfair para o jogo: ${homeTeam} vs ${awayTeam}. 
      O jogo está no minuto ${minute}' com o placar atual de ${score}.
      Preciso das odds de Match Odds (1, X, 2) e 3 linhas de Over condizentes com o resultado atual (ex: se está 1-0, Over 1.5, 2.5, 3.5).
      Retorne APENAS o JSON.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            marketOdds: {
              type: Type.OBJECT,
              properties: {
                home: { type: Type.NUMBER },
                draw: { type: Type.NUMBER },
                away: { type: Type.NUMBER }
              },
              required: ["home", "draw", "away"]
            },
            overOdds: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  odd: { type: Type.NUMBER }
                },
                required: ["label", "odd"]
              }
            }
          },
          required: ["marketOdds", "overOdds"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Erro ao buscar odds live:", error);
    return null;
  }
};

export const analyzeMatch = async (data: AnalysisData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formatMatches = (matches: MatchHistory[]) => 
    matches.map(m => `${m.goalsFor}-${m.goalsAgainst} vs ${m.opponent} (${m.isHome ? 'C' : 'F'})`).join('; ');

  const formatOdds = (odds?: LiveOddsMarket, over?: OverOddLine[]) => {
    if (!odds) return "N/A";
    const match = `1: ${odds.home} | X: ${odds.draw} | 2: ${odds.away}`;
    const overLines = over?.map(o => `${o.label}: ${o.odd}`).join(' | ') || "N/A";
    return `Match Odds: [${match}] - Over: [${overLines}]`;
  };

  const prompt = `
    Analise a ASSIMETRIA e sugira uma entrada baseada em GESTÃO RIGOROSA:
    
    TIME MANDANTE: ${data.preLive.homeTeam.name}
    - Médias (M/S): ${data.preLive.homeTeam.avgGoalsScored} / ${data.preLive.homeTeam.avgGoalsConceded}
    - ÚLTIMOS 10 JOGOS: ${formatMatches(data.preLive.homeTeam.recentMatches)}
    
    TIME VISITANTE: ${data.preLive.awayTeam.name}
    - Médias (M/S): ${data.preLive.awayTeam.avgGoalsScored} / ${data.preLive.awayTeam.avgGoalsConceded}
    - ÚLTIMOS 10 JOGOS: ${formatMatches(data.preLive.awayTeam.recentMatches)}
    
    FASE DO TORNEIO: ${data.preLive.tournamentType}
    
    ${data.live ? `
    LIVE STATUS: Minuto ${data.live.minute}' | Placar ${data.live.scoreHome}-${data.live.scoreAway}
    LIVE ODDS ATUAIS: ${formatOdds(data.live.marketOdds, data.live.overOdds)}
    ` : 'STATUS: Pre-Live'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text || "Erro ao gerar análise.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erro técnico na IA.";
  }
};

export const generatePostMatchReport = async (analysis: SavedAnalysis): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    AUDITORIA DE VALOR (+EV):
    Análise Original: ${analysis.prognosis}
    Resultado Real: ${analysis.finalScore?.home} x ${analysis.finalScore?.away}
    
    Avalie o valor da entrada sugerida face ao desfecho real.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: POST_MATCH_PROMPT,
        temperature: 0.5,
      },
    });

    return response.text || "Erro ao gerar relatório.";
  } catch (error) {
    return "Erro no relatório pós-jogo.";
  }
};
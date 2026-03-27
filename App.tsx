import React, { useState, useEffect, useMemo } from 'react';
import { 
  PreLiveStats, 
  LiveStats, 
  TournamentType, 
  AnalysisData,
  SavedAnalysis,
  BankrollEntry,
  EntryResult,
  BankrollSummary,
  MatchHistory
} from './types';
import { SUPPORTED_LEAGUES, BRAZILIAN_TEAMS } from './constants';
import { analyzeMatch, generatePostMatchReport, fetchTeamAutomaticStats, fetchLiveOdds } from './geminiService';
import { 
  Activity, 
  BarChart3, 
  Zap, 
  Loader2,
  Trophy,
  History,
  BookOpen,
  Trash2,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  AlertCircle,
  Link2,
  Timer,
  ExternalLink,
  Scale,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  DollarSign,
  Share2,
  Copy
} from 'lucide-react';

const TeamLogo = ({ url, loading, teamName }: { url?: string, loading?: boolean, teamName?: string }) => {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [url]);

  if (loading) return (
    <div className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center animate-pulse flex-shrink-0">
      <div className="w-6 h-6 bg-slate-700 rounded-full"></div>
    </div>
  );

  return (
    <div className="w-12 h-12 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg group transition-all hover:border-emerald-500/50">
      {url && !error ? (
        <img src={url} alt={teamName} onError={() => setError(true)} className="w-full h-full object-contain p-1.5 transition-transform group-hover:scale-110" />
      ) : (
        <Trophy className="w-5 h-5 text-slate-600" />
      )}
    </div>
  );
};

const MatchHistoryRow: React.FC<{ 
  match: MatchHistory; 
  onUpdate: (updated: MatchHistory) => void; 
}> = ({ 
  match, 
  onUpdate 
}) => {
  const resultColor = match.goalsFor > match.goalsAgainst 
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
    : match.goalsFor < match.goalsAgainst 
    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
    : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <div className="flex items-center gap-2 bg-slate-900/40 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
      <button 
        onClick={() => onUpdate({ ...match, isHome: !match.isHome })}
        className={`w-6 h-6 flex items-center justify-center rounded text-[9px] font-black transition-colors ${match.isHome ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}
        title={match.isHome ? "Mandante" : "Visitante"}
      >
        {match.isHome ? 'C' : 'F'}
      </button>
      
      <div className="flex-1 flex items-center gap-2 overflow-hidden">
        <input 
          type="text" 
          value={match.opponent} 
          onChange={(e) => onUpdate({ ...match, opponent: e.target.value })}
          placeholder="Adversário"
          className="bg-transparent border-none text-[10px] font-medium text-slate-300 w-full outline-none focus:text-white"
        />
      </div>

      <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${resultColor}`}>
        <input 
          type="number" 
          value={match.goalsFor} 
          onChange={(e) => onUpdate({ ...match, goalsFor: Number(e.target.value) })}
          className="bg-transparent border-none w-4 text-center text-[10px] font-black outline-none"
        />
        <span className="text-[8px] opacity-50">x</span>
        <input 
          type="number" 
          value={match.goalsAgainst} 
          onChange={(e) => onUpdate({ ...match, goalsAgainst: Number(e.target.value) })}
          className="bg-transparent border-none w-4 text-center text-[10px] font-black outline-none"
        />
      </div>
    </div>
  );
};

const Header = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: 'analysis' | 'study' | 'bankroll') => void }) => (
  <header className="bg-slate-900 border-b border-slate-800 py-3 px-6 flex items-center justify-between sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="bg-emerald-500 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
        <Activity className="text-white w-5 h-5" />
      </div>
      <h1 className="text-lg font-bold text-white tracking-tight">AI SPORTS <span className="text-emerald-500">PRO</span></h1>
    </div>
    <nav className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
      <button onClick={() => onTabChange('analysis')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analysis' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><BarChart3 className="w-3.5 h-3.5" /> Painel</button>
      <button onClick={() => onTabChange('study')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'study' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><BookOpen className="w-3.5 h-3.5" /> LAB</button>
      <button onClick={() => onTabChange('bankroll')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'bankroll' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Wallet className="w-3.5 h-3.5" /> Banca</button>
    </nav>
  </header>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'study' | 'bankroll'>('analysis');
  const [loading, setLoading] = useState(false);
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [loadingStats, setLoadingStats] = useState<{home: boolean, away: boolean}>({home: false, away: false});
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [bankEntries, setBankEntries] = useState<BankrollEntry[]>([]);
  const [initialBankroll, setInitialBankroll] = useState<number>(1000);
  const [groundingSources, setGroundingSources] = useState<{title: string, uri: string}[]>([]);
  const [useLive, setUseLive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const initialTeamState = (name: string = '') => ({
    name,
    htGoalPercentage: 50,
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
    recentMatches: Array(10).fill(null).map(() => ({ opponent: '', goalsFor: 0, goalsAgainst: 0, isHome: true })),
    logoUrl: undefined
  });

  const [preLive, setPreLive] = useState<PreLiveStats>({
    league: SUPPORTED_LEAGUES[0],
    tournamentType: TournamentType.PONTOS_CORRIDOS,
    matchDate: new Date().toISOString().split('T')[0],
    homeTeam: initialTeamState(),
    awayTeam: initialTeamState(),
  });

  const [live, setLive] = useState<LiveStats>({
    minute: 0, scoreHome: 0, scoreAway: 0, possessionHome: 50, possessionAway: 50,
    dangerousAttacksHome: 0, dangerousAttacksAway: 0,
    totalAttacksHome: 0, totalAttacksAway: 0,
    shotsOnGoalHome: 0, shotsOnGoalAway: 0,
    totalShotsHome: 0, totalShotsAway: 0,
    cornersHome: 0, cornersAway: 0,
    yellowCardsHome: 0, yellowCardsAway: 0,
    redCardsHome: 0, redCardsAway: 0,
    xgHome: 0, xgAway: 0,
    marketOdds: undefined,
    overOdds: undefined
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('analysis_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedBank = localStorage.getItem('bankroll_entries');
    if (savedBank) setBankEntries(JSON.parse(savedBank));
    const savedInitial = localStorage.getItem('initial_bankroll');
    if (savedInitial) setInitialBankroll(Number(savedInitial));
  }, []);

  const saveHistory = (newHistory: SavedAnalysis[]) => {
    setHistory(newHistory);
    localStorage.setItem('analysis_history', JSON.stringify(newHistory));
  };

  const saveBankEntries = (entries: BankrollEntry[]) => {
    setBankEntries(entries);
    localStorage.setItem('bankroll_entries', JSON.stringify(entries));
  };

  const resetAnalysis = () => {
    if (confirm("Deseja limpar todos os campos da análise?")) {
      setPreLive({
        league: SUPPORTED_LEAGUES[0],
        tournamentType: TournamentType.PONTOS_CORRIDOS,
        matchDate: new Date().toISOString().split('T')[0],
        homeTeam: initialTeamState(),
        awayTeam: initialTeamState(),
      });
      setLive({
        minute: 0, scoreHome: 0, scoreAway: 0, possessionHome: 50, possessionAway: 50,
        dangerousAttacksHome: 0, dangerousAttacksAway: 0,
        totalAttacksHome: 0, totalAttacksAway: 0,
        shotsOnGoalHome: 0, shotsOnGoalAway: 0,
        totalShotsHome: 0, totalShotsAway: 0,
        cornersHome: 0, cornersAway: 0,
        yellowCardsHome: 0, yellowCardsAway: 0,
        redCardsHome: 0, redCardsAway: 0,
        xgHome: 0, xgAway: 0
      });
      setAnalysisResult(null);
      setGroundingSources([]);
    }
  };

  const fetchStatsForTeam = async (type: 'home' | 'away') => {
    const teamName = type === 'home' ? preLive.homeTeam.name : preLive.awayTeam.name;
    if (teamName.length < 3) return;
    setLoadingStats(prev => ({ ...prev, [type]: true }));
    try {
      const result = await fetchTeamAutomaticStats(teamName, preLive.league, type === 'home');
      setPreLive(prev => ({
        ...prev,
        [type === 'home' ? 'homeTeam' : 'awayTeam']: {
          ...prev[type === 'home' ? 'homeTeam' : 'awayTeam'],
          htGoalPercentage: result.htPercentage,
          avgGoalsScored: result.avgScored,
          avgGoalsConceded: result.avgConceded,
          logoUrl: result.logoUrl,
          recentMatches: result.recentMatches
        }
      }));
    } finally {
      setLoadingStats(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleUpdateLiveOdds = async () => {
    if (!preLive.homeTeam.name || !preLive.awayTeam.name) return;
    setLoadingOdds(true);
    try {
      const result = await fetchLiveOdds(
        preLive.homeTeam.name,
        preLive.awayTeam.name,
        live.minute,
        `${live.scoreHome}-${live.scoreAway}`
      );
      if (result) {
        setLive(prev => ({ ...prev, marketOdds: result.marketOdds, overOdds: result.overOdds }));
      }
    } finally {
      setLoadingOdds(false);
    }
  };

  const handleAnalyze = async () => {
    if (!preLive.homeTeam.name || !preLive.awayTeam.name) return;
    setLoading(true);
    try {
      const result = await analyzeMatch({ preLive, live: useLive ? live : undefined });
      setAnalysisResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!analysisResult) return;
    const shareText = `📊 Análise Profissional AI Sports\n\n⚽️ Jogo: ${preLive.homeTeam.name} vs ${preLive.awayTeam.name}\n📅 Data: ${preLive.matchDate}\n🏆 Liga: ${preLive.league}\n\n${analysisResult}\n\nvia AI Sports Pro Analyst`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Análise AI Sports Pro',
          text: shareText,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Clipboard failed', err);
      }
    }
  };

  const handleConfirmEntry = () => {
    if (!analysisResult) return;
    const studyId = Date.now().toString();
    const newSaved: SavedAnalysis = {
      id: studyId,
      timestamp: Date.now(),
      data: { preLive, live: useLive ? live : undefined },
      prognosis: analysisResult
    };
    saveHistory([newSaved, ...history]);

    const bankEntry: BankrollEntry = {
      id: (Date.now() + 1).toString(),
      date: preLive.matchDate,
      match: `${preLive.homeTeam.name} vs ${preLive.awayTeam.name}`,
      league: preLive.league,
      market: useLive ? "IA Live (Contexto)" : "IA Pre-Live (Contexto)",
      stake: 10,
      odds: live.marketOdds?.home || 1.80,
      result: 'PENDING',
      profit: 0,
      analysisId: studyId
    };
    saveBankEntries([bankEntry, ...bankEntries]);
    alert("Entrada registrada com sucesso!");
    setActiveTab('bankroll');
  };

  const bankSummary = useMemo<BankrollSummary>(() => {
    let profit = 0, greenCount = 0, redCount = 0, voidCount = 0, totalStake = 0;
    bankEntries.forEach(entry => {
      if (entry.result !== 'PENDING') {
        profit += entry.profit;
        totalStake += entry.stake;
        if (entry.result === 'GREEN') greenCount++;
        else if (entry.result === 'RED') redCount++;
        else voidCount++;
      }
    });
    return {
      initialBankroll,
      currentBankroll: initialBankroll + profit,
      totalProfit: profit,
      roi: totalStake > 0 ? (profit / totalStake) * 100 : 0,
      winRate: (greenCount + redCount) > 0 ? (greenCount / (greenCount + redCount)) * 100 : 0,
      greenCount, redCount, voidCount
    };
  }, [bankEntries, initialBankroll]);

  const updateEntryResult = (id: string, result: EntryResult) => {
    saveBankEntries(bankEntries.map(e => {
      if (e.id === id) {
        const profit = result === 'GREEN' ? e.stake * (e.odds - 1) : result === 'RED' ? -e.stake : 0;
        return { ...e, result, profit };
      }
      return e;
    }));
  };

  const updateMatch = (teamType: 'homeTeam' | 'awayTeam', index: number, updated: MatchHistory) => {
    setPreLive(prev => ({
      ...prev,
      [teamType]: {
        ...prev[teamType],
        recentMatches: prev[teamType].recentMatches.map((m, i) => i === index ? updated : m)
      }
    }));
  };

  const deleteAnalysis = (id: string) => {
    saveHistory(history.filter(h => h.id !== id));
    saveBankEntries(bankEntries.filter(e => e.analysisId !== id));
  };

  const updateFinalScore = async (id: string, home: number, away: number) => {
    const analysis = history.find(h => h.id === id);
    if (!analysis) return;
    const updatedAnalysis = { ...analysis, finalScore: { home, away } };
    saveHistory(history.map(h => h.id === id ? updatedAnalysis : h));
    try {
      const report = await generatePostMatchReport(updatedAnalysis);
      if (report) {
        saveHistory(history.map(h => h.id === id ? { ...updatedAnalysis, postMatchReport: report } : h));
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-200">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <datalist id="brazil-teams">
        {BRAZILIAN_TEAMS.map(team => (
          <option key={team} value={team} />
        ))}
      </datalist>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              
              <div className="flex gap-2">
                <button onClick={resetAnalysis} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-emerald-400 text-[10px] uppercase tracking-widest group shadow-lg">
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Limpar Dados
                </button>
                <button 
                  onClick={() => setUseLive(!useLive)} 
                  className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2 ${useLive ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                >
                  <Timer className={`w-4 h-4 ${useLive ? 'animate-pulse' : ''}`} /> {useLive ? 'LIVE ATIVADO' : 'ATIVAR LIVE'}
                </button>
              </div>

              {/* MÓDULO PRE-LIVE TÉCNICO */}
              <section className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="bg-slate-700/50 p-4 border-b border-slate-700 flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-300 uppercase flex items-center gap-2"><History className="w-4 h-4 text-emerald-500" /> Diagnóstico Pre-Live Profissional</h2>
                </div>
                <div className="p-5 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Layers className="w-3 h-3"/> Liga / Campeonato</label>
                      <select value={preLive.league} onChange={e => setPreLive({...preLive, league: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                        {SUPPORTED_LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Layers className="w-3 h-3"/> Fase do Torneio</label>
                      <select value={preLive.tournamentType} onChange={e => setPreLive({...preLive, tournamentType: e.target.value as TournamentType})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                        {Object.values(TournamentType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Data do Confronto</label>
                    <input type="date" value={preLive.matchDate} onChange={e => setPreLive({...preLive, matchDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" />
                  </div>

                  {/* MANDANTE */}
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <TeamLogo url={preLive.homeTeam.logoUrl} loading={loadingStats.home} teamName={preLive.homeTeam.name} />
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase">Mandante</label>
                        <input list="brazil-teams" type="text" placeholder="Time mandante..." value={preLive.homeTeam.name} onBlur={() => fetchStatsForTeam('home')} onChange={e => setPreLive({...preLive, homeTeam: {...preLive.homeTeam, name: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm font-bold text-emerald-400 focus:border-emerald-500 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">HT Goal %</label>
                        <input type="number" value={preLive.homeTeam.htGoalPercentage} onChange={e => setPreLive({...preLive, homeTeam: {...preLive.homeTeam, htGoalPercentage: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-emerald-400 font-bold" />
                      </div>
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Gol Mar.</label>
                        <input type="number" step="0.01" value={preLive.homeTeam.avgGoalsScored} onChange={e => setPreLive({...preLive, homeTeam: {...preLive.homeTeam, avgGoalsScored: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-white" />
                      </div>
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Gol Sof.</label>
                        <input type="number" step="0.01" value={preLive.homeTeam.avgGoalsConceded} onChange={e => setPreLive({...preLive, homeTeam: {...preLive.homeTeam, avgGoalsConceded: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-white" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><History className="w-3 h-3 text-emerald-500" /> Últimos 10 Jogos Gerais (Histórico Real)</p>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar text-slate-400">
                        {preLive.homeTeam.recentMatches.map((m, i) => (
                          <MatchHistoryRow key={i} match={m} onUpdate={(updated) => updateMatch('homeTeam', i, updated)} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* VISITANTE */}
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <TeamLogo url={preLive.awayTeam.logoUrl} loading={loadingStats.away} teamName={preLive.awayTeam.name} />
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase">Visitante</label>
                        <input list="brazil-teams" type="text" placeholder="Time visitante..." value={preLive.awayTeam.name} onBlur={() => fetchStatsForTeam('away')} onChange={e => setPreLive({...preLive, awayTeam: {...preLive.awayTeam, name: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm font-bold text-blue-400 focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">HT Goal %</label>
                        <input type="number" value={preLive.awayTeam.htGoalPercentage} onChange={e => setPreLive({...preLive, awayTeam: {...preLive.awayTeam, htGoalPercentage: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-blue-400 font-bold" />
                      </div>
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Gol Mar.</label>
                        <input type="number" step="0.01" value={preLive.awayTeam.avgGoalsScored} onChange={e => setPreLive({...preLive, awayTeam: {...preLive.awayTeam, avgGoalsScored: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-white" />
                      </div>
                      <div className="text-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Gol Sof.</label>
                        <input type="number" step="0.01" value={preLive.awayTeam.avgGoalsConceded} onChange={e => setPreLive({...preLive, awayTeam: {...preLive.awayTeam, avgGoalsConceded: Number(e.target.value)}})} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-xs text-white" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><History className="w-3 h-3 text-blue-500" /> Últimos 10 Jogos Gerais (Histórico Real)</p>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar text-slate-400">
                        {preLive.awayTeam.recentMatches.map((m, i) => (
                          <MatchHistoryRow key={i} match={m} onUpdate={(updated) => updateMatch('awayTeam', i, updated)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* MÓDULO LIVE COMPLETO */}
              {useLive && (
                <section className="bg-slate-800 rounded-2xl border border-red-500/30 overflow-hidden shadow-xl animate-in slide-in-from-top duration-300">
                  <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center justify-between">
                    <h2 className="text-xs font-black text-red-500 uppercase flex items-center gap-2"><Activity className="w-4 h-4" /> Monitoramento Live</h2>
                    <div className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">AO VIVO</div>
                  </div>
                  <div className="p-5 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minuto</label>
                        <input type="number" value={live.minute} onChange={e => setLive({...live, minute: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white text-center" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center">Placar</label>
                        <div className="flex items-center gap-2">
                          <input type="number" value={live.scoreHome} onChange={e => setLive({...live, scoreHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-emerald-400 text-center" />
                          <span className="font-bold text-slate-600">x</span>
                          <input type="number" value={live.scoreAway} onChange={e => setLive({...live, scoreAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-blue-400 text-center" />
                        </div>
                      </div>
                    </div>

                    {/* ODDS SECTION */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Odds em Tempo Real</h3>
                        <button 
                          onClick={handleUpdateLiveOdds} 
                          disabled={loadingOdds}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all"
                        >
                          {loadingOdds ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          {loadingOdds ? 'Buscando...' : 'Consultar Odds'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Match Odds */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Match Odds (1X2)</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                              <span className="block text-[8px] text-slate-500 mb-0.5">Casa</span>
                              <span className="text-xs font-black text-emerald-400">{live.marketOdds?.home || '---'}</span>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                              <span className="block text-[8px] text-slate-500 mb-0.5">Empate</span>
                              <span className="text-xs font-black text-slate-300">{live.marketOdds?.draw || '---'}</span>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                              <span className="block text-[8px] text-slate-500 mb-0.5">Fora</span>
                              <span className="text-xs font-black text-blue-400">{live.marketOdds?.away || '---'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Over Odds */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Gols (Over)</p>
                          <div className="grid grid-cols-3 gap-2">
                            {(live.overOdds || [1, 2, 3]).map((o: any, idx) => (
                              <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                                <span className="block text-[8px] text-slate-500 mb-0.5 whitespace-nowrap">{typeof o === 'object' ? o.label : `Line ${idx+1}`}</span>
                                <span className="text-xs font-black text-amber-500">{typeof o === 'object' ? o.odd : '---'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-600 italic">Odds estimadas via IA baseadas no mercado asiático/europeu (Bet365/Betfair).</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-t border-slate-700/50 pt-4">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-emerald-500 uppercase text-center border-b border-emerald-500/20 pb-1">Mandante</p>
                        <div className="space-y-3">
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Posse %</label><input type="number" value={live.possessionHome} onChange={e => setLive({...live, possessionHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div>
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Ataques (Tot/Perig)</label><div className="flex gap-1"><input type="number" placeholder="Tot" value={live.totalAttacksHome} onChange={e => setLive({...live, totalAttacksHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /><input type="number" placeholder="Per" value={live.dangerousAttacksHome} onChange={e => setLive({...live, dangerousAttacksHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div></div>
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Chutes (Tot/Gol)</label><div className="flex gap-1"><input type="number" value={live.totalShotsHome} onChange={e => setLive({...live, totalShotsHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /><input type="number" value={live.shotsOnGoalHome} onChange={e => setLive({...live, shotsOnGoalHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-emerald-400 text-center" /></div></div>
                          <div className="grid grid-cols-2 gap-2">
                             <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Escant.</label><input type="number" value={live.cornersHome} onChange={e => setLive({...live, cornersHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div>
                             <div><label className="text-[9px] text-slate-500 uppercase block mb-1">xG</label><input type="number" step="0.1" value={live.xgHome} onChange={e => setLive({...live, xgHome: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-amber-500 text-center font-black" /></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4 border-l border-slate-700/50 pl-6">
                        <p className="text-[10px] font-black text-blue-500 uppercase text-center border-b border-blue-500/20 pb-1">Visitante</p>
                        <div className="space-y-3">
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Posse %</label><input type="number" value={live.possessionAway} onChange={e => setLive({...live, possessionAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div>
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Ataques (Tot/Perig)</label><div className="flex gap-1"><input type="number" placeholder="Tot" value={live.totalAttacksAway} onChange={e => setLive({...live, totalAttacksAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /><input type="number" placeholder="Per" value={live.dangerousAttacksAway} onChange={e => setLive({...live, dangerousAttacksAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div></div>
                          <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Chutes (Tot/Gol)</label><div className="flex gap-1"><input type="number" value={live.totalShotsAway} onChange={e => setLive({...live, totalShotsAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /><input type="number" value={live.shotsOnGoalAway} onChange={e => setLive({...live, shotsOnGoalAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-blue-400 text-center" /></div></div>
                          <div className="grid grid-cols-2 gap-2">
                             <div><label className="text-[9px] text-slate-500 uppercase block mb-1">Escant.</label><input type="number" value={live.cornersAway} onChange={e => setLive({...live, cornersAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white text-center" /></div>
                             <div><label className="text-[9px] text-slate-500 uppercase block mb-1">xG</label><input type="number" step="0.1" value={live.xgAway} onChange={e => setLive({...live, xgAway: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-amber-500 text-center font-black" /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {groundingSources.length > 0 && (
                <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 space-y-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Link2 className="w-3 h-3 text-blue-400" /> Fontes Web</h3>
                  <div className="flex flex-wrap gap-2">
                    {groundingSources.slice(0, 5).map((s, idx) => (
                      <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 hover:text-emerald-400 transition-all">
                        {s.title.substring(0, 15)}... <ExternalLink className="w-2 h-2" />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <button onClick={handleAnalyze} disabled={loading || !preLive.homeTeam.name} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-sm uppercase tracking-wider">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />} {useLive ? 'ANÁLISE HÍBRIDA (LIVE)' : 'ANÁLISE PRÉ-JOGO'}
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 flex-1 flex flex-col shadow-inner overflow-hidden">
                <div className="bg-slate-800/80 p-4 border-b border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-amber-500" /><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Diagnóstico de Valor Gemini 3</span></div>
                   {analysisResult && (
                     <button 
                       onClick={handleShare}
                       className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border border-slate-600 shadow-sm"
                     >
                       {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                       {copySuccess ? 'Copiado!' : 'Compartilhar Análise'}
                     </button>
                   )}
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  {analysisResult ? (
                    <div className="space-y-6">
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {analysisResult.split('\n').map((line, i) => (
                          <p key={i} className={line.startsWith('## ') ? 'text-emerald-400 text-lg font-bold mt-6 mb-2 border-b border-slate-800 pb-1' : 'mb-2'}>{line.replace('## ', '')}</p>
                        ))}
                      </div>
                      
                      <div className="bg-slate-800/80 p-6 rounded-2xl border border-emerald-500/30 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom duration-500">
                        <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /><h3 className="text-sm font-black text-white uppercase tracking-tighter">Registrar Sugestão na Banca?</h3></div>
                        <div className="flex gap-3 w-full max-w-sm">
                          <button onClick={handleConfirmEntry} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-95 shadow-lg"><ThumbsUp className="w-4 h-4" /> Sim</button>
                          <button onClick={() => setAnalysisResult(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-slate-400 transition-all active:scale-95 shadow-lg"><ThumbsDown className="w-4 h-4" /> Não</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                      <div className="p-8 bg-slate-800/20 rounded-full border border-slate-800"><Zap className="w-12 h-12" /></div>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Aguardando Parâmetros de Entrada...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="space-y-6">
             <h2 className="text-lg font-bold text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-500" /> Lab de Auditoria (+EV)</h2>
             {history.length === 0 ? (
               <div className="bg-slate-900 border border-slate-800 p-20 text-center rounded-2xl text-slate-600 font-medium">Nenhum estudo arquivado para auditoria.</div>
             ) : (
               history.map(item => (
                 <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
                   <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                     <span className="text-sm font-bold text-white uppercase tracking-tight">{item.data.preLive.homeTeam.name} vs {item.data.preLive.awayTeam.name}</span>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                        <button onClick={() => deleteAnalysis(item.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-slate-900/50 p-4 rounded-xl text-[11px] text-slate-400 h-64 overflow-y-auto border border-slate-800 scrollbar-thin">{item.prognosis}</div>
                     <div className="flex flex-col justify-center items-center bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700">
                       <p className="text-[10px] font-bold text-slate-500 uppercase mb-4 text-center">Informar Resultado Final</p>
                       <div className="flex gap-3 mb-4">
                         <input type="number" id={`h-${item.id}`} placeholder="C" className="w-12 bg-slate-800 border border-slate-700 rounded p-2 text-center font-bold text-white" />
                         <span className="self-center font-bold text-slate-600">x</span>
                         <input type="number" id={`a-${item.id}`} placeholder="F" className="w-12 bg-slate-800 border border-slate-700 rounded p-2 text-center font-bold text-white" />
                       </div>
                       <button onClick={() => {
                         const h = (document.getElementById(`h-${item.id}`) as HTMLInputElement).value;
                         const a = (document.getElementById(`a-${item.id}`) as HTMLInputElement).value;
                         if (h !== "" && a !== "") updateFinalScore(item.id, Number(h), Number(a));
                       }} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-xs font-bold transition-colors">Auditar Análise</button>
                     </div>
                   </div>
                   {item.postMatchReport && <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-100 italic font-medium">{item.postMatchReport}</div>}
                 </div>
               ))
             )}
          </div>
        )}

        {activeTab === 'bankroll' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col gap-2 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Banca Atual</span>
                <div className="text-2xl font-black text-white">R$ {bankSummary.currentBankroll.toLocaleString('pt-BR')}</div>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col gap-2 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Efetividade</span>
                <div className="text-2xl font-black text-emerald-400">{bankSummary.winRate.toFixed(1)}%</div>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col gap-2 shadow-lg relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${bankSummary.totalProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Profit Bruto</span>
                <div className={`text-2xl font-black ${bankSummary.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {bankSummary.totalProfit.toLocaleString('pt-BR')}</div>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col gap-2 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Yield (ROI)</span>
                <div className="text-2xl font-black text-amber-400">{bankSummary.roi.toFixed(1)}%</div>
              </div>
            </div>

            <section className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
              <div className="bg-slate-700/50 p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-bold text-white uppercase text-xs flex items-center gap-2 tracking-widest"><History className="w-5 h-5 text-blue-400" /> Movimentação de Banca</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Evento / Mercado</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">L/P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {bankEntries.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-600 text-xs italic font-medium">Nenhuma entrada registrada na banca.</td></tr>
                    ) : (
                      bankEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-700/20 transition-all">
                          <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{entry.date.split('-').reverse().join('/')}</td>
                          <td className="px-6 py-4">
                            <div className="text-[11px] font-bold text-white leading-tight mb-1">{entry.match}</div>
                            <div className="text-[9px] text-blue-400 font-black uppercase tracking-tighter">{entry.market}</div>
                          </td>
                          <td className="px-6 py-4">
                            {entry.result === 'PENDING' ? (
                              <div className="flex gap-2">
                                <button onClick={() => updateEntryResult(entry.id, 'GREEN')} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded border border-emerald-500/20 transition-colors shadow-sm"><Check className="w-3 h-3" /></button>
                                <button onClick={() => updateEntryResult(entry.id, 'RED')} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded border border-red-500/20 transition-colors shadow-sm"><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border flex items-center w-fit gap-1 ${entry.result === 'GREEN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                {entry.result === 'GREEN' ? <Check className="w-2 h-2" /> : <X className="w-2 h-2" />} {entry.result}
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-right text-[11px] font-black ${entry.profit >= 0 && entry.result !== 'PENDING' ? 'text-emerald-500' : entry.result === 'PENDING' ? 'text-slate-500' : 'text-red-500'}`}>
                            {entry.result === 'PENDING' ? '---' : `R$ ${entry.profit.toFixed(2)}`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
      
      {(loadingStats.home || loadingStats.away || loadingOdds) ? (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-800 border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-left duration-300">
           <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
           <span className="text-[10px] font-bold text-white uppercase tracking-widest">IA em Processamento Real-Time...</span>
        </div>
      ) : null}
    </div>
  );
};

export default App;
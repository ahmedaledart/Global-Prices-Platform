import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMarketData } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart2, PieChart, TrendingUp, FileSpreadsheet, FileText, FileCode, Image as ImageIcon, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';

export const AnalyticsCharts = () => {
  const { data: commoditiesData } = useMarketData();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'energy' | 'metals' | 'commodities'>('energy');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  const energyData = commoditiesData.filter(c => c.sector === 'energy');
  const metalsData = commoditiesData.filter(c => c.sector === 'metals');
  const basicCommoditiesData = commoditiesData.filter(c => c.sector === 'commodities');

  const currentData = activeTab === 'energy' ? energyData : activeTab === 'metals' ? metalsData : basicCommoditiesData;

  useEffect(() => {
    if (currentData.length > 0 && !currentData.some(c => c.symbol === selectedSymbol)) {
      setSelectedSymbol(currentData[0].symbol);
    }
  }, [activeTab, currentData]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedSymbol) return;
      try {
        const { data, error } = await supabase
          .from('commodity_price_history')
          .select('symbol, name_ar, name_en, price, recorded_at, created_at')
          .eq('symbol', selectedSymbol)
          .order('recorded_at', { ascending: false })
          .limit(12);
        
        if (data && !error) {
          setHistoryData(data.reverse());
        } else {
          setHistoryData([]);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };
    fetchHistory();
  }, [selectedSymbol]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const historyChartData = useMemo(() => {
    let rawData = historyData.map(item => ({
      date: item.recorded_at || item.created_at,
      dateLabel: new Date(item.recorded_at || item.created_at).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US'),
      price: Number(item.price || 0),
      symbol: item.symbol,
      name: language === 'ar' ? item.name_ar : item.name_en
    }));

    // Limit points based on screen size
    const limit = isMobile ? 6 : 12;
    if (rawData.length > limit) {
      rawData = rawData.slice(-limit);
    }
    return rawData;
  }, [historyData, language, isMobile]);

  const chartData = useMemo(() => {
    return currentData
      .map(item => ({
        name: language === 'ar' ? item.nameAr : item.nameEn,
        symbol: item.symbol,
        price: Number(item.price || 0),
        change: Number(item.changePercent || 0),
        changeValue: Number(item.changeAmount || 0),
        trend: item.trend
      }));
  }, [currentData, language]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 shadow-xl text-white text-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="font-bold text-[#D4AF37] mb-1">{data.name || data.symbol}</div>
          <div>{language === 'ar' ? 'التاريخ' : 'Date'}: {data.dateLabel}</div>
          <div>{language === 'ar' ? 'السعر' : 'Price'}: {Number(data.price).toFixed(2)}</div>
          <div>{language === 'ar' ? 'الرمز' : 'Symbol'}: {data.symbol}</div>
        </div>
      );
    }
    return null;
  };

  const getSummaryExportData = () => {
    return chartData.map(item => ({
      [t('commodity')]: item.name,
      [t('currentPrice')]: item.price,
      [t('changePercent')]: `${item.change}%`,
    }));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsComparison = XLSX.utils.json_to_sheet(historyChartData);
    XLSX.utils.book_append_sheet(wb, wsComparison, "Performance History");
    const wsSummary = XLSX.utils.json_to_sheet(getSummaryExportData());
    XLSX.utils.book_append_sheet(wb, wsSummary, "Sector Summary");
    XLSX.writeFile(wb, `${activeTab}_analytics.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(t('sectorSummary'), 14, 15);
    const summaryData = getSummaryExportData();
    const summaryColumn = Object.keys(summaryData[0] || {});
    const summaryRows = summaryData.map(item => Object.values(item));
    autoTable(doc, { head: [summaryColumn], body: summaryRows, startY: 20 });
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 20;
    doc.text(t('performanceComparison'), 14, finalY + 15);
    const tableColumn = Object.keys(historyChartData[0] || {});
    const tableRows = historyChartData.map(item => Object.values(item).map(val => typeof val === 'number' ? val.toFixed(2) : val));
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: finalY + 20 });
    doc.save(`${activeTab}_analytics.pdf`);
  };

  const exportToCSV = () => {
    const wsSummary = XLSX.utils.json_to_sheet(getSummaryExportData());
    XLSX.writeFile({ SheetNames: ["Summary"], Sheets: { "Summary": wsSummary } }, `${activeTab}_summary.csv`, { bookType: 'csv' });
    const wsComparison = XLSX.utils.json_to_sheet(historyChartData);
    XLSX.writeFile({ SheetNames: ["History"], Sheets: { "History": wsComparison } }, `${activeTab}_history.csv`, { bookType: 'csv' });
  };

  const exportToPNG = async () => {
    if (chartRef.current === null) return;
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#0A1128' });
      const link = document.createElement('a');
      link.download = `${activeTab}_chart.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  return (
    <section className="py-16 bg-[#121E3D] border-y border-[#1C2E5A]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
              <BarChart2 className="text-[#D4AF37]" />
              {t('analyticsTitle')}
            </h2>
            <p className="text-sm md:text-base text-gray-400">{t('analyticsSub')}</p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto bg-[#0A1128] p-1 rounded-lg border border-[#1C2E5A] gap-2">
            <div className="flex w-full md:w-auto bg-[#121E3D] rounded-md p-1">
              <button 
                onClick={() => setActiveTab('energy')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${activeTab === 'energy' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('energySector')}
              </button>
              <button 
                onClick={() => setActiveTab('metals')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${activeTab === 'metals' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('metalsSector')}
              </button>
              <button 
                onClick={() => setActiveTab('commodities')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md text-xs md:text-sm font-medium transition-all ${activeTab === 'commodities' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {language === 'ar' ? 'السلع' : 'Commodities'}
              </button>
            </div>
            <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0 justify-between sm:justify-start w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-[#121E3D] text-[#D4AF37] border border-[#1C2E5A] rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-[#D4AF37] appearance-none cursor-pointer pr-8"
                >
                  {currentData.map(item => (
                    <option key={item.symbol} value={item.symbol}>
                      {language === 'ar' ? item.nameAr : item.nameEn}
                    </option>
                  ))}
                </select>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none text-[#D4AF37]">
                  <Filter size={14} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={exportToExcel} className="p-2 text-[#10B981] hover:bg-[#1C2E5A] rounded-lg transition-colors" title={t('downloadExcel')}>
                  <FileSpreadsheet size={18} />
                </button>
                <button onClick={exportToCSV} className="p-2 text-[#3B82F6] hover:bg-[#1C2E5A] rounded-lg transition-colors" title={t('downloadCsv')}>
                  <FileCode size={18} />
                </button>
                <button onClick={exportToPNG} className="p-2 text-[#D4AF37] hover:bg-[#1C2E5A] rounded-lg transition-colors" title={t('downloadPng')}>
                  <ImageIcon size={18} />
                </button>
                <button onClick={exportToPDF} className="p-2 text-[#EF4444] hover:bg-[#1C2E5A] rounded-lg transition-colors" title={t('downloadPdf')}>
                  <FileText size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Comparison Chart */}
          <div ref={chartRef} className="lg:col-span-2 bg-[#0A1128] rounded-2xl p-4 md:p-6 border border-[#1C2E5A] shadow-xl">
            <h3 className="text-base md:text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#D4AF37]" />
              {t('performanceComparison')}
            </h3>
            <div className="w-full h-[280px] md:h-[360px] lg:h-[420px]" dir="ltr">
              {historyChartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm md:text-base text-center">
                  {language === 'ar' ? 'لا توجد بيانات تاريخية كافية لعرض الرسم البياني' : 'Not enough historical data to display the chart'}
                </div>
              ) : (
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="watermark"
                    className="absolute inset-0 m-auto w-32 md:w-48 opacity-5 pointer-events-none select-none"
                  />
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="0"
                        vertical={false}
                        stroke="#334155"
                        opacity={0.35}
                      />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: '#94A3B8', fontSize: isMobile ? 10 : 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontSize: isMobile ? 10 : 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="linear"
                        dataKey="price"
                        stroke="#F97316"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#F97316' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Market Summary Cards */}
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-[#1C2E5A] to-[#0A1128] rounded-2xl p-6 border border-[#2A4075] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full mix-blend-screen filter blur-3xl opacity-10"></div>
              <h3 className="text-lg font-bold text-white mb-4">{t('sectorSummary')}</h3>
              
              <div className="space-y-4 relative z-10 max-h-64 overflow-y-auto pr-2">
                {chartData.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between border-b border-[#2A4075]/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.change > 0 || item.trend === 'up' ? '#10B981' : item.change < 0 || item.trend === 'down' ? '#EF4444' : '#D4AF37' }}></div>
                      <span className="text-sm text-gray-300 truncate w-24 md:w-32">{item.name}</span>
                    </div>
                    <div className="text-left shrink-0" dir="ltr">
                      <div className="text-sm font-bold text-white">{(item.price || 0).toFixed(2)}</div>
                      <div className={`text-xs ${item.trend === 'up' || item.change > 0 ? 'text-[#10B981]' : item.trend === 'down' || item.change < 0 ? 'text-[#EF4444]' : 'text-[#D4AF37]'}`}>
                        {item.change > 0 || item.trend === 'up' ? '+' : ''}{(item.change || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0A1128] rounded-2xl p-6 border border-[#1C2E5A] shadow-xl flex-grow flex flex-col justify-center items-center text-center min-h-[150px]">
              <PieChart size={48} className="text-[#D4AF37] mb-4 opacity-50" />
              <h4 className="text-white font-bold mb-2">{t('detailedReport')}</h4>
              <p className="text-xs text-gray-400 mb-4">{t('detailedReportDesc')}</p>
              <button className="px-4 py-2 bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A1128] rounded-lg text-sm font-bold transition-colors w-full">
                {t('downloadReport')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

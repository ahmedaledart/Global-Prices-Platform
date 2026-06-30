import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMarketData } from '../context/MarketContext';
import { useLanguage } from '../context/LanguageContext';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart2, PieChart, TrendingUp, FileSpreadsheet, FileText, FileCode, Image as ImageIcon, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

export const AnalyticsCharts = () => {
  const { data: commoditiesData } = useMarketData();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'energy' | 'metals' | 'commodities'>('energy');
  const chartRef = useRef<HTMLDivElement>(null);
  const metricsDropdownRef = useRef<HTMLDivElement>(null);
  const [showMetricsDropdown, setShowMetricsDropdown] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({});

  const energyData = commoditiesData.filter(c => c.sector === 'energy');
  const metalsData = commoditiesData.filter(c => c.sector === 'metals');
  const basicCommoditiesData = commoditiesData.filter(c => c.sector === 'commodities');

  const currentData = activeTab === 'energy' ? energyData : activeTab === 'metals' ? metalsData : basicCommoditiesData;

  useEffect(() => {
    const initialMetrics: Record<string, boolean> = {};
    currentData.forEach(item => {
      initialMetrics[item.id] = true;
    });
    setVisibleMetrics(initialMetrics);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metricsDropdownRef.current && !metricsDropdownRef.current.contains(event.target as Node)) {
        setShowMetricsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMetric = (id: string) => {
    setVisibleMetrics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const chartData = useMemo(() => {
    return currentData
      .filter(item => visibleMetrics[item.id] !== false)
      .map(item => ({
        name: language === 'ar' ? item.nameAr : item.nameEn,
        symbol: item.symbol,
        price: Number(item.price || 0),
        change: Number(item.changePercent || 0),
        changeValue: Number(item.changeAmount || 0),
        trend: item.trend
      }));
  }, [currentData, language, visibleMetrics]);

  const colors = ['#D4AF37', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

  const getSummaryExportData = () => {
    return chartData.map(item => ({
      [t('commodity')]: item.name,
      [t('currentPrice')]: item.price,
      [t('changePercent')]: `${item.change}%`,
    }));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Add Comparison Data
    const wsComparison = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, wsComparison, "Performance History");
    
    // Add Summary Data
    const wsSummary = XLSX.utils.json_to_sheet(getSummaryExportData());
    XLSX.utils.book_append_sheet(wb, wsSummary, "Sector Summary");
    
    XLSX.writeFile(wb, `${activeTab}_analytics.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add Summary Table
    doc.text(t('sectorSummary'), 14, 15);
    const summaryData = getSummaryExportData();
    const summaryColumn = Object.keys(summaryData[0] || {});
    const summaryRows = summaryData.map(item => Object.values(item));
    
    autoTable(doc, {
      head: [summaryColumn],
      body: summaryRows,
      startY: 20,
    });
    
    // Add Comparison Table
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 20;
    doc.text(t('performanceComparison'), 14, finalY + 15);
    const tableColumn = Object.keys(chartData[0] || {});
    const tableRows = chartData.map(item => Object.values(item).map(val => typeof val === 'number' ? val.toFixed(2) : val));
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: finalY + 20,
    });
    
    doc.save(`${activeTab}_analytics.pdf`);
  };

  const exportToCSV = () => {
    // For CSV, we'll download two separate files as CSV doesn't support multiple sheets
    
    // 1. Summary CSV
    const wsSummary = XLSX.utils.json_to_sheet(getSummaryExportData());
    XLSX.writeFile({
      SheetNames: ["Summary"],
      Sheets: { "Summary": wsSummary }
    }, `${activeTab}_summary.csv`, { bookType: 'csv' });

    // 2. History CSV
    const wsComparison = XLSX.utils.json_to_sheet(chartData);
    XLSX.writeFile({
      SheetNames: ["History"],
      Sheets: { "History": wsComparison }
    }, `${activeTab}_history.csv`, { bookType: 'csv' });
  };

  const exportToPNG = async () => {
    if (chartRef.current === null) {
      return;
    }

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
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
              <BarChart2 className="text-[#D4AF37]" />
              {t('analyticsTitle')}
            </h2>
            <p className="text-sm text-gray-400">{t('analyticsSub')}</p>
          </div>

          <div className="flex flex-col sm:flex-row bg-[#0A1128] p-1 rounded-lg border border-[#1C2E5A] gap-2">
            <div className="flex bg-[#121E3D] rounded-md p-1">
              <button 
                onClick={() => setActiveTab('energy')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'energy' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('energySector')}
              </button>
              <button 
                onClick={() => setActiveTab('metals')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'metals' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {t('metalsSector')}
              </button>
              <button 
                onClick={() => setActiveTab('commodities')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'commodities' ? 'bg-[#1C2E5A] text-[#D4AF37] shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                {language === 'ar' ? 'السلع الأساسية' : 'Commodities'}
              </button>
            </div>
            <div className="flex items-center gap-2 px-2">
              <div className="relative" ref={metricsDropdownRef}>
                <button 
                  onClick={() => setShowMetricsDropdown(!showMetricsDropdown)}
                  className="p-2 text-[#D4AF37] hover:bg-[#1C2E5A] rounded-lg transition-colors flex items-center gap-2"
                  title={t('metrics') || 'Metrics'}
                >
                  <Filter size={18} />
                </button>
                {showMetricsDropdown && (
                  <div className={`absolute top-full mt-2 ${language === 'ar' ? 'left-0' : 'right-0'} bg-[#121E3D] border border-[#1C2E5A] rounded-lg shadow-xl p-3 z-50 min-w-[200px]`}>
                    <h4 className="text-white text-sm font-bold mb-2 border-b border-[#1C2E5A] pb-2">{t('metrics') || 'Metrics'}</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentData.map(item => (
                        <label key={item.id} className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                          <input 
                            type="checkbox" 
                            checked={visibleMetrics[item.id] !== false} 
                            onChange={() => toggleMetric(item.id)}
                            className="rounded border-[#1C2E5A] bg-[#0A1128] text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <span className="text-sm">{language === 'ar' ? item.nameAr : item.nameEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Comparison Chart */}
          <div ref={chartRef} className="lg:col-span-2 bg-[#0A1128] rounded-2xl p-6 border border-[#1C2E5A] shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#D4AF37]" />
              {t('performanceComparison')}
            </h3>
            <div className="w-full h-[360px]" dir="ltr">
              {chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {language === 'ar' ? 'لا توجد بيانات كافية لعرض الرسم البياني لهذا القطاع' : 'Not enough data to display chart for this sector'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C2E5A" vertical={false} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121E3D', borderColor: '#1C2E5A', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`${value}%`, language === 'ar' ? 'مقارنة الأداء نسبة التغير %' : 'Change %']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="change" name={language === 'ar' ? 'مقارنة الأداء نسبة التغير %' : 'Change %'} radius={[4, 4, 0, 0]}>
                      {
                        chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.change > 0 || entry.trend === 'up' ? '#10B981' : entry.change < 0 || entry.trend === 'down' ? '#EF4444' : '#D4AF37'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Market Summary Cards */}
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-[#1C2E5A] to-[#0A1128] rounded-2xl p-6 border border-[#2A4075] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full mix-blend-screen filter blur-3xl opacity-10"></div>
              <h3 className="text-lg font-bold text-white mb-4">{t('sectorSummary')}</h3>
              
              <div className="space-y-4 relative z-10 max-h-64 overflow-y-auto pr-2">
                {chartData.map((item, index) => (
                  <div key={item.symbol} className="flex items-center justify-between border-b border-[#2A4075]/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.change > 0 || item.trend === 'up' ? '#10B981' : item.change < 0 || item.trend === 'down' ? '#EF4444' : '#D4AF37' }}></div>
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-left" dir="ltr">
                      <div className="text-sm font-bold text-white">{(item.price || 0).toFixed(2)}</div>
                      <div className={`text-xs ${item.trend === 'up' || item.change > 0 ? 'text-[#10B981]' : item.trend === 'down' || item.change < 0 ? 'text-[#EF4444]' : 'text-[#D4AF37]'}`}>
                        {item.change > 0 || item.trend === 'up' ? '+' : ''}{(item.change || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0A1128] rounded-2xl p-6 border border-[#1C2E5A] shadow-xl flex-grow flex flex-col justify-center items-center text-center">
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

"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Bell, FileText, History, Settings, Shield, LogOut, Plus, Trash2, Check, 
  Edit, User, MapPin, Tag, ListFilter, Save, Database, Clock, Car, Info, 
  Home, UserCheck, AlertCircle, Briefcase, Layers, 
  CheckCircle2, CheckSquare, FileSpreadsheet, Megaphone, ClipboardCheck, UserCog, Share2, Lock, Eye, EyeOff, Users, ArrowRight, RefreshCw, AlertTriangle, Image as ImageIcon, Table as TableIcon, Calendar, Filter, UploadCloud, ChevronRight, Search, KeyRound, BarChart3, PieChart, TrendingUp, Download, Archive, ServerCrash, Unlock, GripVertical, XCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 1. 全域型別與常數
// ============================================================================
declare global {
  interface Window {
    supabase: any;
    XLSX: any;
    html2canvas: any;
    jspdf: any;
  }
}

const FAKE_DOMAIN = "@my-notes.com";
const PRIMARY_COLOR = "#4f093c"; 
const BG_WARM_BEIGE = "#FDFCF8";
const CARD_BG_COLOR = "#f0e6d5";

const INITIAL_FORM_DATA = {
  real_name: '', dharma_name: '', gender: '', registrant_type: '禪修班學員', registration_option: '新增',
  activity_location: '', activity_name: '', activity_option: '',
  selected_contents: [] as string[], 
  other_remarks: '', memo: '',
  identity: '參加法會', 
  volunteer_type: '一般義工-精舍設定組別', transportation: '',
  arrival_datetime: '', departure_datetime: '', volunteer_group: '', 
  start_date: '', end_date: '', accommodation_option: '不安單', 
  stay_start_date: '', stay_end_date: ''
};

// 用於管理資料列表的預設欄寬
const DEFAULT_COL_WIDTHS = {
  col1: 180, // 活動行程
  col2: 200, // 基本資料
  col3: 200, // 交通/住宿
  col4: 200, // 義工資訊
  col5: 150, // 備註
  col6: 120, // 狀態
};

interface FieldDefinition {
  id?: string;
  field_key: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  description: string;
}

const DEFAULT_FIELD_DEFINITIONS: FieldDefinition[] = [
  { field_key: 'real_name', field_label: '姓名', field_type: '文字', is_required: true, description: '真實姓名' },
  { field_key: 'dharma_name', field_label: '法名', field_type: '文字', is_required: false, description: '' },
  { field_key: 'gender', field_label: '性別', field_type: '文字', is_required: true, description: '男/女' },
  { field_key: 'registrant_type', field_label: '屬性', field_type: '文字', is_required: true, description: '學員身分' },
  { field_key: 'registration_option', field_label: '報名選項', field_type: '文字', is_required: true, description: '新增或異動' },
  { field_key: 'activity_location', field_label: '活動地點', field_type: '文字', is_required: true, description: '' },
  { field_key: 'activity_name', field_label: '活動名稱', field_type: '文字', is_required: true, description: '' },
  { field_key: 'activity_option', field_label: '活動行程', field_type: '文字', is_required: true, description: '' },
  { field_key: 'selected_contents', field_label: '勾選內容', field_type: '文字陣列', is_required: false, description: '' },
  { field_key: 'other_remarks', field_label: '自訂備註', field_type: '文字', is_required: false, description: '僅自訂行程出現' },
  { field_key: 'identity', field_label: '身分', field_type: '文字', is_required: true, description: '法會或義工' },
  { field_key: 'volunteer_type', field_label: '義工選項', field_type: '文字', is_required: false, description: '' },
  { field_key: 'transportation', field_label: '交通', field_type: '文字', is_required: false, description: '' },
  { field_key: 'arrival_datetime', field_label: '抵寺時間', field_type: '日期', is_required: false, description: '' },
  { field_key: 'departure_datetime', field_label: '離寺時間', field_type: '日期', is_required: false, description: '' },
  { field_key: 'volunteer_group', field_label: '義工組別', field_type: '文字', is_required: false, description: '' },
  { field_key: 'start_date', field_label: '發心開始', field_type: '日期', is_required: false, description: '' },
  { field_key: 'end_date', field_label: '發心結束', field_type: '日期', is_required: false, description: '' },
  { field_key: 'accommodation_option', field_label: '安單選項', field_type: '文字', is_required: false, description: '' },
  { field_key: 'stay_start_date', field_label: '安單開始', field_type: '日期', is_required: false, description: '' },
  { field_key: 'stay_end_date', field_label: '安單結束', field_type: '日期', is_required: false, description: '' },
  { field_key: 'memo', field_label: '其他備註', field_type: '文字', is_required: false, description: '固定顯示' },
];

interface ActivityHierarchy {
  id: string;
  location: string;
  activity: string | null;
  option: string | null;
  content: string | null;
  activity_end_date?: string | null;
  option_end_date?: string | null;
  activity_deadline?: string | null;
  option_deadline?: string | null;
}

interface Note {
  id: string;
  user_id: string;
  real_name: string;
  dharma_name?: string;
  gender: string;
  registrant_type: string;
  registration_option: string;
  activity_location: string;
  activity_name: string;
  activity_option: string;
  activity_id?: string;
  selected_contents: string[];
  other_remarks?: string;
  memo?: string;
  identity: string;
  volunteer_type?: string | null;
  transportation: string;
  arrival_datetime: string | null;
  departure_datetime: string | null;
  volunteer_group?: string | null;
  start_date: string | null;
  end_date: string | null;
  accommodation_option: string;
  stay_start_date?: string | null;
  stay_end_date?: string | null;
  is_deleted: boolean;
  audit_status: string;
  sign_name?: string;
  id_2?: string;
  created_at: string;
  saved_end_date?: string | null; 
  saved_deadline?: string | null;
}

interface Bulletin {
  id: string;
  content: string;
  created_at: string;
}

interface UserPermission {
  id: string;
  email: string;
  user_name: string;
  id_last4: string;
  is_admin: boolean;
  is_disabled: boolean;
  uid?: string;
  created_at?: string;
  memo?: string; 
}

interface ResetRequest {
  id: string;
  user_name: string;
  id_last4: string;
  uid?: string; 
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

// ============================================================================
// 2. 輔助函式
// ============================================================================

const encodeName = (name: string): string => {
  try { let hex = ''; for (let i = 0; i < name.length; i++) hex += ('0000' + name.charCodeAt(i).toString(16)).slice(-4); return hex; } catch { return name; }
};

const decodeName = (email: string): string => {
  try { const hex = email.split('@')[0]; let str = ''; for (let i = 0; i < hex.length; i += 4) str += String.fromCharCode(parseInt(hex.substr(i, 4), 16)); return str; } catch { return email?.split('@')[0] || ''; }
};

const getDisplayNameOnly = (email: string | undefined | null): string => {
  if (!email) return 'User';
  try {
    const hex = email.split('@')[0]; 
    let str = ''; 
    for (let i = 0; i < hex.length; i += 4) str += String.fromCharCode(parseInt(hex.substr(i, 4), 16)); 
    return str.length > 4 ? str.slice(0, -4) : str;
  } catch { return email.split('@')[0]; }
};

const getIdLast4FromEmail = (email: string | undefined | null): string => {
  if (!email) return '0000';
  try {
    const hex = email.split('@')[0]; 
    let str = ''; 
    for (let i = 0; i < hex.length; i += 4) str += String.fromCharCode(parseInt(hex.substr(i, 4), 16)); 
    return str.length > 4 ? str.slice(-4) : '0000';
  } catch { return '0000'; }
};

const formatDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) return '-';
  try {
    if (isoString.length === 10 && !isoString.includes('T') && !isoString.includes(' ')) {
        return isoString.replace(/-/g, '/');
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return isoString || '-'; }
};

const simplifyVolunteerType = (type: string | undefined | null) => {
  if (!type) return '';
  if (type.includes('一般義工')) return '一般義工';
  if (type.includes('長期義工')) return '長期義工';
  if (type.includes('佛巡')) return '佛巡';
  return type;
};

const renderBulletinContent = (content: string) => {
  if (!content) return null;
  const parts = content.split(/(\[img:.*?\])/);
  return parts.map((part, index) => {
    const match = part.match(/^\[img:(.*?)\]$/);
    if (match) {
      return <img key={index} src={match[1]} alt="公告圖片" className="max-w-full h-auto rounded-lg my-3 shadow-md border border-stone-200" />;
    }
    return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
  });
};

const getLocalTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getLocalTodayDateTime = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const safeRenderContents = (contents: any): string => {
    if (!contents) return '';
    if (Array.isArray(contents)) {
        return contents.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('、');
    }
    if (typeof contents === 'string') {
        if (contents.startsWith('[') && contents.endsWith(']')) {
            try {
                const parsed = JSON.parse(contents);
                if (Array.isArray(parsed)) return parsed.join('、');
            } catch (e) { return contents; }
        }
        return contents;
    }
    return JSON.stringify(contents);
};

const downloadPDF = async (elementId: string, title: string) => {
    if (!window.html2canvas || !window.jspdf) {
        try {
            await Promise.all([
                new Promise((resolve, reject) => {
                    if (window.html2canvas) return resolve(true);
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                }),
                new Promise((resolve, reject) => {
                    if (window.jspdf) return resolve(true);
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                })
            ]);
        } catch (e) {
            alert('無法載入 PDF 產生工具，請檢查網路。');
            return;
        }
    }

    const element = document.getElementById(elementId);
    if (!element) {
        alert('找不到圖表元件');
        return;
    }

    try {
        const titleDiv = document.createElement('div');
        titleDiv.innerText = title;
        Object.assign(titleDiv.style, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#4f093c', fontFamily: 'sans-serif' });
        
        element.insertBefore(titleDiv, element.firstChild);
        await new Promise(r => setTimeout(r, 100));

        const canvas = await window.html2canvas(element, { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        element.removeChild(titleDiv);

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const pageHeight = pdfHeight - 20;
        let heightLeft = (pdf.getImageProperties(imgData).height * pdfWidth) / pdf.getImageProperties(imgData).width;
        let position = 10; 
        let pageNum = 1;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, heightLeft);
        pdf.setFontSize(10);
        pdf.text(`Page ${pageNum}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });

        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
           pdf.addPage();
           pageNum++;
           const yPos = - (pageHeight * (pageNum - 1)) + 10; 
           pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, (pdf.getImageProperties(imgData).height * pdfWidth) / pdf.getImageProperties(imgData).width);
           pdf.text(`Page ${pageNum}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
           heightLeft -= pageHeight;
        }
        
        pdf.save(`${title}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
        console.error(err);
        alert('匯出 PDF 失敗');
    }
};

// ============================================================================
// 3. 子組件
// ============================================================================

const CustomLogo = ({ className }: { className?: string }) => (
  <img src="/logo.png" alt="Logo" className={`${className} rounded-full object-cover border-2 border-white/20 shadow-md`} />
);

// 修改：響應式標題組件 (手機版橫向分行)
const ResponsiveHeader = ({ title, children, color = "bg-[#4f093c]" }: { title: string, children?: React.ReactNode, color?: string }) => {
  return (
    <div className={`flex flex-col md:flex-row justify-between items-stretch rounded-2xl shadow-sm border border-stone-100 ${color} text-white mb-8 overflow-hidden min-h-[4rem]`}>
       {/* 標題區域：保持橫向，文字可換行 */}
       <div className="flex items-center justify-center md:justify-start p-4 md:px-6 bg-black/10 md:bg-transparent">
          <h3 className="font-bold text-xl md:text-2xl text-center md:text-left leading-tight break-words whitespace-pre-wrap">
             {title}
          </h3>
       </div>
       {/* 內容區域 (右側) */}
       <div className="flex-1 flex items-center justify-center md:justify-end p-4 md:px-6 overflow-x-auto">
          {children}
       </div>
    </div>
  );
};

// 修改：帶有清除按鈕的日期輸入框 (增加右側內距防止重疊)
const DateInputWithClear = ({ type = "datetime-local", value, onChange, min, className, ...props }: any) => (
  <div className="relative w-full">
    <input 
      type={type} 
      min={min} 
      className={`${className} pr-16`} // 增加內距，確保文字不會被 X 按鈕遮住
      value={value || ''} 
      onChange={onChange} 
      {...props}
    />
    {value && (
      <button 
        type="button"
        onClick={() => onChange({ target: { value: '' } })} 
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 transition-colors bg-white/80 p-1.5 rounded-full z-10"
        title="重置日期"
      >
        <XCircle className="w-5 h-5" />
      </button>
    )}
  </div>
);

const OverviewCard = ({ title, count, icon: Icon, color }: { title: string, count: number, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-5 break-inside-avoid">
        <div className={`p-4 rounded-full ${color} text-white`}><Icon className="w-8 h-8"/></div>
        <div><p className="text-base text-stone-400 font-bold">{title}</p><p className="text-4xl font-black text-slate-800">{count}</p></div>
    </div>
);

const IdentityRatioChart = ({ data }: { data: Record<string, { dharma_m: number, dharma_f: number, vol_m: number, vol_f: number }> }) => {
    
    const dharmaData = data['參加法會'] || { dharma_m: 0, dharma_f: 0, vol_m: 0, vol_f: 0 };
    const volData = data['發心義工'] || { dharma_m: 0, dharma_f: 0, vol_m: 0, vol_f: 0 };
    
    const totalDharma = (dharmaData.dharma_m + dharmaData.dharma_f);
    const totalVol = (volData.vol_m + volData.vol_f);
    const totalAll = totalDharma + totalVol;

    if (totalAll === 0) return <div className="p-6 bg-white rounded-3xl shadow-sm border border-stone-100 flex items-center justify-center text-stone-300 font-bold h-40 text-xl">尚無身分數據</div>;

    const dharmaPct = (totalDharma / totalAll) * 100;
    const volPct = (totalVol / totalAll) * 100;

    const getSubPct = (val: number, parentTotal: number) => parentTotal > 0 ? (val / parentTotal) * 100 : 0;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 break-inside-avoid">
            <h4 className="font-bold text-[#4f093c] text-2xl mb-8 flex items-center gap-2">
                <PieChart className="w-6 h-6"/> 身分比例結構圖
            </h4>
            
            <div className="flex w-full h-80 md:h-32 rounded-2xl overflow-hidden shadow-inner font-bold text-white relative text-lg">
                <div style={{ width: `${dharmaPct}%` }} className="h-full flex flex-col transition-all duration-500">
                    <div className="flex-1 bg-blue-600 flex items-center justify-center relative group">
                        <div className="z-10 drop-shadow-md text-center"><div>參加法會</div><div className="text-2xl">{totalDharma}人 ({dharmaPct.toFixed(1)}%)</div></div>
                        <div className="absolute inset-0 flex opacity-20 group-hover:opacity-30 transition-opacity">
                             <div style={{width: `${getSubPct(dharmaData.dharma_m, totalDharma)}%`}} className="bg-black h-full"></div>
                             <div style={{width: `${getSubPct(dharmaData.dharma_f, totalDharma)}%`}} className="bg-white h-full"></div>
                        </div>
                    </div>
                    <div className="h-3 flex">
                       <div style={{width: `${getSubPct(dharmaData.dharma_m, totalDharma)}%`}} className="bg-blue-800 h-full"></div>
                       <div style={{width: `${getSubPct(dharmaData.dharma_f, totalDharma)}%`}} className="bg-blue-300 h-full"></div>
                    </div>
                </div>
                <div style={{ width: `${volPct}%` }} className="h-full flex flex-col transition-all duration-500">
                    <div className="flex-1 bg-orange-500 flex items-center justify-center relative group">
                        <div className="z-10 drop-shadow-md text-center"><div>發心義工</div><div className="text-2xl">{totalVol}人 ({volPct.toFixed(1)}%)</div></div>
                        <div className="absolute inset-0 flex opacity-20 group-hover:opacity-30 transition-opacity">
                             <div style={{width: `${getSubPct(volData.vol_m, totalVol)}%`}} className="bg-black h-full"></div>
                             <div style={{width: `${getSubPct(volData.vol_f, totalVol)}%`}} className="bg-white h-full"></div>
                        </div>
                    </div>
                    <div className="h-3 flex">
                       <div style={{width: `${getSubPct(volData.vol_m, totalVol)}%`}} className="bg-orange-800 h-full"></div>
                       <div style={{width: `${getSubPct(volData.vol_f, totalVol)}%`}} className="bg-orange-200 h-full"></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-8">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-blue-700 font-bold border-b-2 border-blue-100 pb-2 text-lg"><span>參加法會</span><span className="text-2xl">{totalDharma}</span></div>
                    <div className="flex justify-between text-base text-stone-600 font-bold"><span>男眾: <span className="text-xl text-slate-800">{dharmaData.dharma_m}</span></span><span>女眾: <span className="text-xl text-slate-800">{dharmaData.dharma_f}</span></span></div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-orange-700 font-bold border-b-2 border-orange-100 pb-2 text-lg"><span>發心義工</span><span className="text-2xl">{totalVol}</span></div>
                    <div className="flex justify-between text-base text-stone-600 font-bold"><span>男眾: <span className="text-xl text-slate-800">{volData.vol_m}</span></span><span>女眾: <span className="text-xl text-slate-800">{volData.vol_f}</span></span></div>
                </div>
            </div>
        </div>
    );
};

const StatsBarChart = ({ title, data }: { title: string, data: Record<string, { dharma_m: number, dharma_f: number, vol_m: number, vol_f: number }> }) => {
  const keys = Object.keys(data).sort((a, b) => {
      const totalA = data[a].dharma_m + data[a].dharma_f + data[a].vol_m + data[a].vol_f;
      const totalB = data[b].dharma_m + data[b].dharma_f + data[b].vol_m + data[b].vol_f;
      return totalB - totalA;
  });

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 h-auto break-inside-avoid">
      <h4 className="font-bold text-[#4f093c] text-2xl mb-8 flex items-center gap-2">
        <BarChart3 className="w-6 h-6"/> {title}
      </h4>
      <div className="space-y-8">
        {keys.length === 0 ? (
           <div className="text-center text-stone-300 py-10 font-bold text-xl">無資料</div>
        ) : (
           keys.map(key => {
             const d = data[key];
             const total = d.dharma_m + d.dharma_f + d.vol_m + d.vol_f;
             if (total === 0) return null;
             
             const getPct = (val: number) => total > 0 ? (val / total) * 100 : 0;

             return (
               <div key={key} className="space-y-3 pb-6 border-b border-stone-100 last:border-0 last:pb-0 break-inside-avoid">
                 <div className="flex justify-between items-end pb-2">
                   <span className="font-bold text-slate-700 text-xl max-w-[70%] leading-normal whitespace-normal">{key || '未指定'}</span>
                   <span className="font-black text-[#4f093c] text-3xl whitespace-nowrap">{total} <span className="text-sm font-bold text-slate-400">人</span></span>
                 </div>
                 
                 <div className="h-6 w-full bg-stone-100 rounded-lg overflow-hidden flex shadow-inner">
                   {d.dharma_m > 0 && <div style={{ width: `${getPct(d.dharma_m)}%` }} className="bg-blue-600 h-full" />}
                   {d.dharma_f > 0 && <div style={{ width: `${getPct(d.dharma_f)}%` }} className="bg-blue-300 h-full" />}
                   {d.vol_m > 0 && <div style={{ width: `${getPct(d.vol_m)}%` }} className="bg-orange-500 h-full" />}
                   {d.vol_f > 0 && <div style={{ width: `${getPct(d.vol_f)}%` }} className="bg-orange-300 h-full" />}
                 </div>

                 <div className="grid grid-cols-4 gap-2 text-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex flex-col"><span className="text-blue-700 font-bold text-base">法會(男)</span><span className="text-slate-700 font-bold text-xl">{d.dharma_m}</span></div>
                    <div className="flex flex-col border-l border-stone-200"><span className="text-blue-400 font-bold text-base">法會(女)</span><span className="text-slate-700 font-bold text-xl">{d.dharma_f}</span></div>
                    <div className="flex flex-col border-l border-stone-200"><span className="text-orange-600 font-bold text-base">義工(男)</span><span className="text-slate-700 font-bold text-xl">{d.vol_m}</span></div>
                    <div className="flex flex-col border-l border-stone-200"><span className="text-orange-400 font-bold text-base">義工(女)</span><span className="text-slate-700 font-bold text-xl">{d.vol_f}</span></div>
                 </div>
               </div>
             );
           })
        )}
      </div>
    </div>
  );
};


// ============================================================================
// 4. 主元件 App (Main Component)
// ============================================================================
export default function App() {
  // ----------------------------------------------------------------------------
  // 1. Hooks & State
  // ----------------------------------------------------------------------------
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('bulletin');

  const [notes, setNotes] = useState<Note[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [hierarchyData, setHierarchyData] = useState<ActivityHierarchy[]>([]);
  const [allUsers, setAllUsers] = useState<UserPermission[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  
  const [fieldConfigs, setFieldConfigs] = useState<FieldDefinition[]>(DEFAULT_FIELD_DEFINITIONS);

  const [username, setUsername] = useState<string>('');
  const [idLast4, setIdLast4] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login'|'signup'|'forgot'>('login');
  
  const [showPwdModal, setShowPwdModal] = useState<boolean>(false);
  const [newPwdVal, setNewPwdVal] = useState<string>('');
  const [resetPwdResult, setResetPwdResult] = useState<{user: string, pwd: string}|null>(null);
  
  const [todayDate, setTodayDate] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [historyFilterLoc, setHistoryFilterLoc] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  
  // 資料頁籤的篩選器
  const [filterLoc, setFilterLoc] = useState<string>('');
  const [filterAct, setFilterAct] = useState<string>(''); 
  const [searchText, setSearchText] = useState<string>('');
  
  // 統計頁籤的篩選器
  const [statFilterLoc, setStatFilterLoc] = useState<string>('');
  const [statFilterAct, setStatFilterAct] = useState<string>('');
  const [statFilterOpt, setStatFilterOpt] = useState<string>('');
  const [statsViewType, setStatsViewType] = useState<'active' | 'completed'>('active');

  // 結案頁籤篩選器
  const [completedFilterMonth, setCompletedFilterMonth] = useState<string>('');
  const [completedFilterLocAct, setCompletedFilterLocAct] = useState<string>('');
  const [completedFilterOption, setCompletedFilterOption] = useState<string>('');
  const [completedSearch, setCompletedSearch] = useState<string>('');

  // 學員與審核頁籤的搜尋
  const [usersSearch, setUsersSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // 管理後台設定用
  const [newBulletin, setNewBulletin] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newActivity, setNewActivity] = useState<string>('');
  const [newOption, setNewOption] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  
  const [mgmtSelectedLoc, setMgmtSelectedLoc] = useState<string>('');
  const [mgmtSelectedAct, setMgmtSelectedAct] = useState<string>('');
  const [mgmtSelectedOpt, setMgmtSelectedOpt] = useState<string>('');
  const [showCompletedSettings, setShowCompletedSettings] = useState<boolean>(false);
  
  const [newUser, setNewUser] = useState({ name: '', id4: '', pwd: '' });

  // Column resizing state
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Effects
  useEffect(() => {
    setTodayDate(getLocalTodayDate());
    setCurrentDateTime(getLocalTodayDateTime());

    // Load saved column widths
    const savedWidths = localStorage.getItem('adminTableColWidths');
    if (savedWidths) {
      try {
        setColWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error("Failed to parse saved column widths", e);
      }
    }

    const loadSupabase = () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '';
        const key = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '';
        if (window.supabase && url && key) {
          try {
            const client = window.supabase.createClient(url, key);
            setSupabaseClient(client);
          } catch (err) { console.error("Supabase init error:", err); }
        }
        setLoading(false);
      };
      script.onerror = () => { setLoading(false); };
      document.body.appendChild(script);
    };
    loadSupabase();
  }, []);

  const fetchFieldConfigs = useCallback(async () => {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('field_definitions').select('*').order('field_key');
    if (data && data.length > 0) {
      const merged = DEFAULT_FIELD_DEFINITIONS.map(def => {
        const found = data.find((d: any) => d.field_key === def.field_key);
        return found ? { ...def, ...found } : def;
      });
      setFieldConfigs(merged);
    } else {
      await Promise.all(DEFAULT_FIELD_DEFINITIONS.map(def => supabaseClient.from('field_definitions').upsert(def, { onConflict: 'field_key' })));
    }
  }, [supabaseClient]);

  const fetchData = useCallback(async () => {
    if (!supabaseClient) return;
    try {
      const { data: bData } = await supabaseClient.from('bulletins').select('*').order('created_at', { ascending: false });
      if (bData) setBulletins(bData);
      const { data: hData } = await supabaseClient.from('activity_hierarchy').select('*');
      if (hData) setHierarchyData(hData);
      const { data: nData } = await supabaseClient.from('notes').select('*').order('created_at', { ascending: false });
      if (nData) setNotes(nData);
      const { data: uData } = await supabaseClient.from('user_permissions').select('*').order('created_at', { ascending: false });
      if (uData) setAllUsers(uData);
      const { data: rData } = await supabaseClient.from('reset_requests').select('*').order('created_at', { ascending: false });
      if (rData) setResetRequests(rData);
      await fetchFieldConfigs();
    } catch (err) { console.error(err); }
  }, [supabaseClient, fetchFieldConfigs]);

  useEffect(() => {
    if (user && supabaseClient) {
      fetchData();
      supabaseClient.from('user_permissions').select('is_admin').eq('uid', user.id).maybeSingle()
      .then(({ data }: any) => { if (data) setIsAdmin(data.is_admin === true); });
      
      const metaName = user.user_metadata?.user_name;
      const metaId4 = user.user_metadata?.id_last4;
      if (metaName && metaId4) {
           supabaseClient.from('user_permissions').select('id, id_last4').eq('uid', user.id).maybeSingle()
           .then(async ({ data: existing }: any) => {
               if (!existing || existing.id_last4 !== metaId4) {
                   if(existing) await supabaseClient.from('user_permissions').delete().eq('uid', user.id);
                   await supabaseClient.from('user_permissions').insert([{
                       uid: user.id, email: user.email, user_name: metaName, id_last4: metaId4,
                       is_admin: false, is_disabled: false, created_at: new Date().toISOString()
                   }]);
               }
           });
      }
      const channel = supabaseClient.channel('db-all-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, fetchData)
        .subscribe();
      return () => { supabaseClient.removeChannel(channel); };
    }
  }, [user, fetchData, supabaseClient]);

  // Column Resizing Logic
  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    resizingCol.current = colKey;
    startX.current = e.pageX;
    startWidth.current = colWidths[colKey as keyof typeof colWidths];
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizingCol.current) {
      const diff = e.pageX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      setColWidths(prev => ({
        ...prev,
        [resizingCol.current!]: newWidth
      }));
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    resizingCol.current = null;
    // Save to localStorage
    localStorage.setItem('adminTableColWidths', JSON.stringify(colWidths));
  };

  // ----------------------------------------------------------------------------
  // 3. Memos (Computations for Logic) - Defined BEFORE usage
  // ----------------------------------------------------------------------------
  const hierarchyStatus = useMemo(() => {
      const active: ActivityHierarchy[] = [];
      const completed: ActivityHierarchy[] = [];
      hierarchyData.forEach(h => {
          const endDate = h.option_end_date || h.activity_end_date;
          if (endDate && endDate < todayDate) completed.push(h);
          else active.push(h);
      });
      return { active, completed };
  }, [hierarchyData, todayDate]);

  const locations = useMemo(() => [...new Set(hierarchyStatus.active.map(h => h.location).filter(Boolean))].sort(), [hierarchyStatus.active]);
  const availableActivities = useMemo(() => [...new Set(hierarchyStatus.active.filter(h => h.location === formData.activity_location && h.activity).map(h => h.activity as string))].sort(), [hierarchyStatus.active, formData.activity_location]);
  const availableOptions = useMemo(() => [...new Set(hierarchyStatus.active.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option).map(h => h.option as string))].sort(), [hierarchyStatus.active, formData.activity_location, formData.activity_name]);
  const availableContents = useMemo(() => hierarchyStatus.active.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option === formData.activity_option && h.content).map(h => h.content as string).sort(), [hierarchyStatus.active, formData.activity_location, formData.activity_name, formData.activity_option]);
  
  const filteredTransportOptions = useMemo(() => {
    const all = ["大車-精舍統一行程", "小車-自訂抵離寺", "自行前往-自訂抵離寺"];
    if (formData.activity_option && formData.activity_option.includes('自訂行程')) {
        const customOptions = all.filter(o => !o.includes("大車"));
        customOptions.push("其他-自訂抵離寺");
        return customOptions;
    }
    return all;
  }, [formData.activity_option]);

  // UseEffect for Transport Auto-select (Needs filteredTransportOptions)
  useEffect(() => {
    const hasLargeBus = filteredTransportOptions.some(o => o.includes("大車"));
    setFormData(prev => ({ ...prev, transportation: hasLargeBus ? "大車-精舍統一行程" : "小車-自訂抵離寺" }));
  }, [filteredTransportOptions]);

  // UseEffect for Date Auto-fill
  useEffect(() => { 
      if (formData.arrival_datetime) {
          const fullDateTime = formData.arrival_datetime;
          const dateOnly = formData.arrival_datetime.split('T')[0];
          setFormData(p => ({ ...p, start_date: p.start_date || fullDateTime, stay_start_date: p.stay_start_date || dateOnly }));
      }
  }, [formData.arrival_datetime]);
  
  useEffect(() => { 
      if (formData.departure_datetime) {
          const fullDateTime = formData.departure_datetime;
          const dateOnly = formData.departure_datetime.split('T')[0];
          setFormData(p => ({ ...p, end_date: p.end_date || fullDateTime, stay_end_date: p.stay_end_date || dateOnly }));
      }
  }, [formData.departure_datetime]);

  // Admin UI Helpers Memos
  const currentActivityDates = useMemo(() => {
    if (!mgmtSelectedLoc || !mgmtSelectedAct) return { end: '', dead: '' };
    const found = hierarchyData.find(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && (h.activity_end_date || h.activity_deadline));
    return { end: found?.activity_end_date || '', dead: found?.activity_deadline || '' };
  }, [hierarchyData, mgmtSelectedLoc, mgmtSelectedAct]);

  const currentOptionDates = useMemo(() => {
    if (!mgmtSelectedLoc || !mgmtSelectedAct || !mgmtSelectedOpt) return { end: '', dead: '' };
    const found = hierarchyData.find(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option === mgmtSelectedOpt && (h.option_end_date || h.option_deadline));
    return { end: found?.option_end_date || '', dead: found?.option_deadline || '' };
  }, [hierarchyData, mgmtSelectedLoc, mgmtSelectedAct, mgmtSelectedOpt]);

  const fieldVisibility = useMemo(() => {
    const isJingshe = formData.activity_location === '精舍';
    const isZhongtai = formData.activity_location === '中台';
    const isVolunteer = formData.identity === '發心義工';
    const isBus = formData.transportation === '大車-精舍統一行程';
    const isOneDay = formData.activity_option.includes('當天來回');
    const needsAccommodation = formData.accommodation_option === '須安單';

    return {
      transportation: !isJingshe,
      volunteerGroup: isVolunteer,
      volunteerType: isZhongtai && isVolunteer,
      volunteerDates: !isJingshe && isVolunteer, 
      arrivalDeparture: !isJingshe && !isBus,    
      accommodation: !isJingshe && !isBus && !isOneDay,
      accommodationDates: (!isJingshe && !isBus && !isOneDay) && needsAccommodation 
    };
  }, [formData]);

  // ----------------------------------------------------------------------------
  // 4. Logic Callbacks
  // ----------------------------------------------------------------------------
  const getHierarchyDates = useCallback((loc: string, act: string, opt: string) => {
      const optionNode = hierarchyData.find(h => h.location === loc && h.activity === act && h.option === opt);
      const activityNode = hierarchyData.find(h => h.location === loc && h.activity === act && h.activity_end_date);
      return { endDate: optionNode?.option_end_date || activityNode?.activity_end_date || null, deadline: optionNode?.option_deadline || activityNode?.activity_deadline || null };
  }, [hierarchyData]);
  
  const getNoteStatus = useCallback((note: Note) => {
      let isEnded = false;
      if (note.saved_end_date) {
           isEnded = todayDate > note.saved_end_date;
      } else {
           const { endDate } = getHierarchyDates(note.activity_location, note.activity_name, note.activity_option);
           isEnded = endDate ? todayDate > endDate : false;
      }
      return { isEnded };
  }, [getHierarchyDates, todayDate]);

  const getRestrictionStatus = useCallback((loc: string, act: string, opt: string) => {
      const { endDate, deadline } = getHierarchyDates(loc, act, opt);
      const isEnded = endDate ? todayDate > endDate : false;
      const isDeadlined = deadline ? todayDate > deadline : false;
      return { isEnded, isDeadlined };
  }, [getHierarchyDates, todayDate]);

  // ----------------------------------------------------------------------------
  // 5. Form/UI Callbacks (Defined BEFORE Handlers)
  // ----------------------------------------------------------------------------
  const getCardStatus = useCallback((note: Note) => {
      if (note.is_deleted) return { text: '刪除', color: 'bg-red-500', isInactive: true };
      const { isEnded } = getNoteStatus(note); 
      if (isEnded) return { text: '已圓滿', color: 'bg-stone-400', isInactive: true };
      return { 
        text: note.registration_option, 
        color: note.registration_option === '新增' ? 'bg-emerald-600' : 'bg-amber-600',
        isInactive: false 
      };
  }, [getNoteStatus]);

  const getSubmitButtonStatus = useCallback(() => {
      const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, formData.activity_name, formData.activity_option);
      if (isEnded) return { disabled: true, text: '已圓滿 (無法報名)' };
      if (isDeadlined) {
          return isAdmin ? { disabled: false, text: '確認送出 (管理員權限)' } : { disabled: true, text: '已截止報名' };
      }
      return { disabled: false, text: '確認送出' };
  }, [formData, getRestrictionStatus, isAdmin]);

  const getCurrentDeadlineText = useCallback(() => {
      const { endDate, deadline } = getHierarchyDates(formData.activity_location, formData.activity_name, formData.activity_option);
      let text = '';
      if(deadline) text += ` 截止日:${deadline}`;
      if(endDate) text += ` 結束日:${endDate}`;
      return text;
  }, [formData, getHierarchyDates]);

  const validateForm = useCallback(() => {
    const status = getRestrictionStatus(formData.activity_location, formData.activity_name, formData.activity_option);
    if (status.isEnded) { alert("此行程已圓滿結束，無法報名"); return false; }
    if (status.isDeadlined && !isAdmin) { alert("此行程已截止報名"); return false; }

    for (const config of fieldConfigs) {
      if (config.is_required) {
        if (config.field_key === 'gender' && !formData.gender) { alert("請選擇性別"); return false; }
        if (config.field_key === 'transportation' && !fieldVisibility.transportation) continue;
        if (config.field_key === 'volunteer_group' && !fieldVisibility.volunteerGroup) continue;
        if (config.field_key === 'volunteer_type' && !fieldVisibility.volunteerType) continue;
        
        if (['start_date', 'end_date'].includes(config.field_key)) {
            if (fieldVisibility.volunteerDates && !formData[config.field_key as keyof typeof formData]) { alert(`請填寫：${config.field_label}`); return false; }
            continue;
        }
        if (['arrival_datetime', 'departure_datetime'].includes(config.field_key)) {
            if (fieldVisibility.arrivalDeparture && !formData[config.field_key as keyof typeof formData]) { alert(`請填寫：${config.field_label}`); return false; }
            continue;
        }
        if (['stay_start_date', 'stay_end_date'].includes(config.field_key)) {
            if (fieldVisibility.accommodationDates && !formData[config.field_key as keyof typeof formData]) { alert(`請填寫：${config.field_label}`); return false; }
            continue;
        }
        if ((config.field_key.includes('stay') || config.field_key.includes('accommodation')) && !fieldVisibility.accommodation) continue;
        
        const val = formData[config.field_key as keyof typeof formData];
        if (!val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
           alert(`請檢查必填項目：${config.field_label}`);
           return false;
        }
      }
    }
    return true;
  }, [formData, fieldConfigs, fieldVisibility, getRestrictionStatus, isAdmin]);

  const renderActivityOptions = () => {
      return availableActivities.map(a => {
         const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, a, '');
         let label = '(可報名)';
         if (isEnded) label = '(已圓滿)';
         else if (isDeadlined) label = isAdmin ? '(已截止-管理員可報)' : '(已截止)';
         const isDisabled = isEnded || (isDeadlined && !isAdmin);
         return <option key={a} value={a} disabled={isDisabled}>{a} {label}</option>;
      });
  };

  const renderOptionOptions = () => {
      return availableOptions.map(o => {
         const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, formData.activity_name, o);
         let label = '(可報名)';
         if (isEnded) label = '(已圓滿)';
         else if (isDeadlined) label = isAdmin ? '(已截止-管理員可報)' : '(已截止)';
         const isDisabled = isEnded || (isDeadlined && !isAdmin);
         return <option key={o} value={o} disabled={isDisabled}>{o} {label}</option>;
      });
  };

  // ----------------------------------------------------------------------------
  // 6. Event Handlers
  // ----------------------------------------------------------------------------

  const handleAuthAction = async () => {
    if (!username || !idLast4) return alert('請輸入姓名與 ID 後四碼');
    if (!supabaseClient) return alert('系統未連線至資料庫');
    
    setLoading(true);
    const email = encodeName(username + idLast4) + FAKE_DOMAIN;

    try {
        if (authMode === 'login') {
            if (!password) { setLoading(false); return alert('請輸入密碼'); }
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setUser(data.user);
            setFormData(prev => ({ ...prev, real_name: username }));

        } else if (authMode === 'signup') {
            if (!password) { setLoading(false); return alert('請設定密碼'); }
            // Fixed: Use username and idLast4 directly
            if(!confirm(`確認註冊資料：\n姓名：${username}\nID後4碼：${idLast4}\n\n請確認無誤後送出。`)) { setLoading(false); return; }
            
            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { user_name: username, id_last4: idLast4, full_name: username } }
            });
            if (error) throw error;
            if (data.user) {
                alert(`註冊成功！系統將自動建立資料。`);
                if (data.session) {
                    setUser(data.user);
                    setFormData(prev => ({ ...prev, real_name: username }));
                } else { alert('請檢查信箱並點擊驗證連結。'); }
            }
        } else if (authMode === 'forgot') {
            const { data: uData, error: fetchErr } = await supabaseClient
                .from('user_permissions')
                .select('uid')
                .eq('user_name', username)
                .eq('id_last4', idLast4)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            if (!uData || !uData.uid) {
                alert('找不到相符的使用者，請確認姓名與ID後四碼是否正確。');
                setLoading(false);
                return;
            }

            const { error } = await supabaseClient.from('reset_requests').insert([{
                user_name: username, 
                id_last4: idLast4, 
                uid: uData.uid, 
                status: 'pending', 
                created_at: new Date().toISOString()
            }]);
            
            if (error) throw error;
            alert('重設申請已送出。');
            setAuthMode('login');
        }
    } catch (err: any) { alert('操作失敗：' + err.message); }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    setUser(null); setIsAdmin(false); setActiveTab('bulletin');
  };

  const handleChangePassword = async () => {
      if (!newPwdVal || newPwdVal.length < 6) return alert("密碼至少需要 6 個字元");
      setLoading(true);
      const { error } = await supabaseClient.auth.updateUser({ password: newPwdVal });
      if (error) {
          alert("修改失敗：" + error.message);
      } else {
          alert("密碼修改成功！下次請使用新密碼登入。");
          setShowPwdModal(false);
          setNewPwdVal('');
      }
      setLoading(false);
  };

  const handleAddBulletin = async () => {
    if (!newBulletin || !supabaseClient) return;
    await supabaseClient.from('bulletins').insert([{ content: newBulletin, created_at: new Date().toISOString() }]);
    setNewBulletin('');
    fetchData();
  };

  const handleDeleteBulletin = async (id: string) => {
    if (!supabaseClient) return;
    if (confirm('刪除?')) await supabaseClient.from('bulletins').delete().eq('id', id);
    fetchData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setNewBulletin(prev => prev + `\n[img:${reader.result}]`); };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  const addLocation = async () => { if(!newLocation || !supabaseClient) return; const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: newLocation, activity: null, option: null, content: null }]); if (error) alert("新增失敗：" + error.message); else { setNewLocation(''); fetchData(); } };
  const addActivity = async () => { if(!newActivity || !mgmtSelectedLoc || !supabaseClient) return; const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: newActivity, option: null, content: null }]); if (error) alert("新增失敗：" + error.message); else { setNewActivity(''); fetchData(); } };
  const addOption = async () => { if(!newOption || !mgmtSelectedAct || !supabaseClient) return; const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: mgmtSelectedAct, option: newOption, content: null }]); if (error) alert("新增失敗：" + error.message); else { setNewOption(''); fetchData(); } };
  const addContent = async () => { if(!newContent || !mgmtSelectedOpt || !supabaseClient) return; const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: mgmtSelectedAct, option: mgmtSelectedOpt, content: newContent }]); if (error) alert("新增失敗：" + error.message); else { setNewContent(''); fetchData(); } };

  const handleDeleteLocation = async (loc: string) => { if (!supabaseClient) return; if (confirm(`確定刪除地點「${loc}」及其所有下層資料？`)) { await supabaseClient.from('activity_hierarchy').delete().eq('location', loc); fetchData(); setMgmtSelectedLoc(''); } };
  const handleDeleteActivity = async (act: string) => { if (!supabaseClient) return; if (confirm(`確定刪除活動「${act}」及其所有下層資料？`)) { await supabaseClient.from('activity_hierarchy').delete().eq('location', mgmtSelectedLoc).eq('activity', act); fetchData(); setMgmtSelectedAct(''); } };
  const handleDeleteOption = async (opt: string) => { if (!supabaseClient) return; if (confirm(`確定刪除行程「${opt}」及其所有下層資料？`)) { await supabaseClient.from('activity_hierarchy').delete().eq('location', mgmtSelectedLoc).eq('activity', mgmtSelectedAct).eq('option', opt); fetchData(); setMgmtSelectedOpt(''); } };
  const handleDeleteContent = async (id: string) => { if (!supabaseClient) return; if (confirm('確定刪除此內容？')) { await supabaseClient.from('activity_hierarchy').delete().eq('id', id); fetchData(); } };
  
  const handleExport = async () => {
    if (!window.XLSX) {
        try { await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); } catch (error) { alert('無法載入 Excel 匯出套件。'); return; }
    }
    const exportData = filteredAdminNotes.map(n => {
        const extractDateStr = (val: string | null | undefined) => { const formatted = formatDateTime(val); if (formatted === '-' || !formatted) return ''; return formatted.split(' ')[0]; };
        const extractTimeStr = (val: string | null | undefined) => { const formatted = formatDateTime(val); if (formatted === '-' || !formatted) return ''; const parts = formatted.split(' '); return parts.length > 1 ? parts[1] : ''; };
        return {
            "地點": n.activity_location || '', "活動": n.activity_name || '', "行程": n.activity_option || '', 
            "勾選內容": safeRenderContents(n.selected_contents),
            "姓名": n.real_name || '', "法名": n.dharma_name || '', "性別": n.gender || '', "屬性": n.registrant_type || '',
            "身分": n.identity || '', "交通": n.transportation || '',
            "抵達日期": extractDateStr(n.arrival_datetime), "抵達時間": extractTimeStr(n.arrival_datetime),
            "離開日期": extractDateStr(n.departure_datetime), "離開時間": extractTimeStr(n.departure_datetime),
            "義工選項": simplifyVolunteerType(n.volunteer_type), "義工組別": n.volunteer_group || '',
            "發心始日期": extractDateStr(n.start_date), "發心始時間": extractTimeStr(n.start_date),
            "發心終日期": extractDateStr(n.end_date), "發心終時間": extractTimeStr(n.end_date),
            "安單選項": n.accommodation_option || '', "安單起日": n.stay_start_date || '', "安單迄日": n.stay_end_date || '',
            "自訂備註": String(n.other_remarks || ''), "備註": String(n.memo || ''), "選項": n.registration_option || '',
            "狀態": n.is_deleted ? '已刪除' : '正常', "填表人": n.sign_name || '', "填表時間": n.created_at?.replace('T', ' ').slice(0, 16) || ''
        };
    });
    const worksheet = window.XLSX.utils.json_to_sheet(exportData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "報名資料");
    window.XLSX.writeFile(workbook, `學員登記表_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => { if (!supabaseClient) return; await supabaseClient.from('user_permissions').update({ is_disabled: !currentStatus }).eq('uid', uid); fetchData(); };
  const handleToggleAdmin = async (uid: string, currentStatus: boolean) => { if (!supabaseClient) return; const { error } = await supabaseClient.from('user_permissions').update({ is_admin: !currentStatus }).eq('uid', uid); if (error) alert("更新失敗：" + error.message); else fetchData(); };

  const handleUpdateUserMemo = async (uid: string, memo: string) => {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from('user_permissions').update({ memo }).eq('uid', uid);
      if (error) alert("備註更新失敗：" + error.message);
      else {
          // Optimistic update
          setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, memo } : u));
      }
  };

  const handleResetAction = async (req: ResetRequest, action: 'approve' | 'reject') => {
    if (!supabaseClient) return;
    if (action === 'approve') {
        if (!req.uid) return alert("此申請缺少 UID，無法處理密碼重設。");
        const tempPwd = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '';
            const serviceKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY : '';
            if (!serviceKey) throw new Error("前端未配置 NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY，無法跨權限修改。");
            const adminClient = window.supabase.createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
            const { error: updateErr } = await adminClient.auth.admin.updateUserById(req.uid, { password: tempPwd });
            if (updateErr) throw updateErr;
            await supabaseClient.from('reset_requests').update({ status: 'completed' }).eq('id', req.id);
            setResetPwdResult({ user: req.user_name, pwd: tempPwd });
        } catch (e: any) { alert(`密碼重設失敗！\n錯誤原因：${e.message}\n\n提醒：前端需配置 Service Role Key 才能跨權限修改他人密碼。`); return; }
    } else { await supabaseClient.from('reset_requests').update({ status: 'rejected' }).eq('id', req.id); }
    fetchData();
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.id4 || !newUser.pwd) { alert('請輸入完整資料 (姓名、ID、密碼)'); return; }
    const email = encodeName(newUser.name + newUser.id4) + FAKE_DOMAIN;
    const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '';
    const key = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '';
    if (!url || !key) { alert('環境變數遺失'); return; }
    const tempClient = window.supabase.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    try {
        const { data, error } = await tempClient.auth.signUp({ email, password: newUser.pwd, options: { data: { user_name: newUser.name, id_last4: newUser.id4 } } });
        if (error) throw error;
        if (data.user) {
            const { error: permError } = await supabaseClient.from('user_permissions').upsert([{ uid: data.user.id, email: email, user_name: newUser.name, id_last4: newUser.id4, is_admin: false, is_disabled: false, created_at: new Date().toISOString() }], { onConflict: 'email' });
            if (permError) { console.error("Permissions sync error:", permError); alert(`Auth 建立成功，但權限表寫入失敗: ${permError.message}`); } 
            else { alert('使用者建立成功！'); setNewUser({name:'', id4:'', pwd:''}); fetchData(); }
        }
    } catch (err: any) { alert('建立失敗: ' + err.message); }
  };

  const handleUpdateActivityDate = async (field: 'activity_end_date' | 'activity_deadline', val: string) => { 
      if (!supabaseClient || !mgmtSelectedLoc || !mgmtSelectedAct) return; 
      const { error } = await supabaseClient.from('activity_hierarchy').update({ [field]: val }).eq('location', mgmtSelectedLoc).eq('activity', mgmtSelectedAct); 
      if(error) console.error(error); 
      else fetchData(); 
  };
  const handleUpdateOptionDate = async (field: 'option_end_date' | 'option_deadline', val: string) => { 
      if (!supabaseClient || !mgmtSelectedLoc || !mgmtSelectedAct || !mgmtSelectedOpt) return; 
      const { error } = await supabaseClient.from('activity_hierarchy').update({ [field]: val }).eq('location', mgmtSelectedLoc).eq('activity', mgmtSelectedAct).eq('option', mgmtSelectedOpt); 
      if(error) console.error(error); 
      else fetchData(); 
  };
  const handlePublishSettings = () => { alert("設定已發佈！前台表單選項已更新。"); fetchData(); };
  const handleUpdateFieldConfig = async (key: string, field: string, value: any) => { if (!supabaseClient) return; setFieldConfigs(prev => prev.map(f => f.field_key === key ? { ...f, [field]: value } : f)); const current = fieldConfigs.find(f => f.field_key === key); if (current) { await supabaseClient.from('field_definitions').upsert({ ...current, [field]: value }, { onConflict: 'field_key' }); } };
  
  const handleToggleDeleteNote = async (id: string, status: boolean) => {
    if (!supabaseClient) return;
    await supabaseClient.from('notes').update({ is_deleted: !status }).eq('id', id);
    fetchData();
  };

  const handleSubmitNote = async () => {
    if (!validateForm()) return;
    const signName = user?.user_metadata?.user_name || username;
    const id2 = user?.user_metadata?.id_last4 || idLast4;
    let finalData = { ...formData };

    if (!fieldVisibility.transportation) finalData.transportation = '';
    if (!fieldVisibility.volunteerGroup) finalData.volunteer_group = '';
    if (!fieldVisibility.volunteerType) finalData.volunteer_type = '';
    if (!fieldVisibility.volunteerDates) { finalData.start_date = ''; finalData.end_date = ''; }
    if (!fieldVisibility.arrivalDeparture) { finalData.arrival_datetime = ''; finalData.departure_datetime = ''; }
    if (!fieldVisibility.accommodation) { finalData.accommodation_option = ''; finalData.stay_start_date = ''; finalData.stay_end_date = ''; } 
    else if (!fieldVisibility.accommodationDates) { finalData.stay_start_date = ''; finalData.stay_end_date = ''; }

    const exactNode = hierarchyData.find(h => h.location === finalData.activity_location && h.activity === finalData.activity_name && h.option === finalData.activity_option);
    const { endDate, deadline } = getHierarchyDates(finalData.activity_location, finalData.activity_name, finalData.activity_option);
    const safeDateToISO = (val: string | null | undefined) => { if (!val || val.trim() === '') return null; try { if (val.endsWith('Z')) return val; const d = new Date(val); if (!isNaN(d.getTime())) return d.toISOString(); } catch (e) {} return val; };
    const sanitizeDate = (dateStr: string | null | undefined) => (dateStr && dateStr.trim() !== '') ? dateStr : null;

    const payload = { 
        ...finalData, 
        user_id: user?.id, 
        audit_status: '免審核',
        is_deleted: false, 
        created_at: new Date().toISOString(),
        start_date: safeDateToISO(finalData.start_date),
        end_date: safeDateToISO(finalData.end_date),
        stay_start_date: sanitizeDate(finalData.stay_start_date),
        stay_end_date: sanitizeDate(finalData.stay_end_date),
        arrival_datetime: safeDateToISO(finalData.arrival_datetime),
        departure_datetime: safeDateToISO(finalData.departure_datetime),
        sign_name: signName, id_2: id2,
        activity_id: exactNode?.id || null, saved_end_date: endDate, saved_deadline: deadline
    };

    if (!supabaseClient) return alert('系統未連線');
    const { audit_status, ...finalPayload } = payload as any;
    const { error } = await supabaseClient.from('notes').insert([finalPayload]);
    if (error) { console.error("Submit error:", error); alert('提交失敗: ' + error.message); } 
    else { alert('已送出申請'); setFormData(INITIAL_FORM_DATA); await fetchData(); setActiveTab('history'); }
  };

  // ----------------------------------------------------------------------------
  // 7. More Memos & Render Variables (Must be after Handlers/Helpers)
  // ----------------------------------------------------------------------------
  const availableCompletedMonths = useMemo(() => {
      const dates = new Set<string>();
      hierarchyStatus.completed.forEach(h => {
          const date = h.option_end_date || h.activity_end_date;
          if (date) dates.add(date.substring(0, 7)); // YYYY-MM
      });
      return [...dates].sort().reverse();
  }, [hierarchyStatus.completed]);

  const availableCompletedLocActs = useMemo(() => {
      if (!completedFilterMonth) return [];
      const locActs = new Set<string>();
      hierarchyStatus.completed.forEach(h => {
          const date = h.option_end_date || h.activity_end_date;
          if (date && date.startsWith(completedFilterMonth)) {
              locActs.add(`${h.location} | ${h.activity}`);
          }
      });
      return [...locActs].sort();
  }, [hierarchyStatus.completed, completedFilterMonth]);

  const completedOptionChoices = useMemo(() => {
     if (!completedFilterMonth || !completedFilterLocAct) return [];
     const [loc, act] = completedFilterLocAct.split(' | ');
     const filtered = hierarchyStatus.completed.filter(h => {
         const date = h.option_end_date || h.activity_end_date;
         return date && date.startsWith(completedFilterMonth) && h.location === loc && h.activity === act;
     });
     
     const options = new Set<string>();
     filtered.forEach(item => {
        options.add(item.option || '(無行程)');
     });
     return [...options].sort();
  }, [hierarchyStatus.completed, completedFilterMonth, completedFilterLocAct]);

  // 重構: 結案總表邏輯 - 合併相同的 Loc|Act|Opt 並計算內容
  const selectedCompletedHierarchy = useMemo(() => {
     if (!completedFilterMonth) return [];
     
     // 1. 篩選符合月份的階層資料
     let rawFiltered = hierarchyStatus.completed.filter(h => {
         const date = h.option_end_date || h.activity_end_date;
         return date && date.startsWith(completedFilterMonth);
     });

     if (completedFilterLocAct) {
         const [loc, act] = completedFilterLocAct.split(' | ');
         rawFiltered = rawFiltered.filter(h => h.location === loc && h.activity === act);
     }
     
     if (completedFilterOption) {
        rawFiltered = rawFiltered.filter(h => (h.option || '(無行程)') === completedFilterOption);
     }

     // 2. 建立合併對應表
     const mergedMap = new Map();

     rawFiltered.forEach(node => {
         const key = `${node.location}|${node.activity}|${node.option || '(無行程)'}`;
         if (!mergedMap.has(key)) {
             mergedMap.set(key, {
                 node: node, // 代表性的節點
                 dates: { dead: node.option_deadline || node.activity_deadline, end: node.option_end_date || node.activity_end_date }
             });
         }
     });

     // 3. 針對每個唯一的行程計算統計
     const result = [];
     
     for (const [key, item] of mergedMap) {
         const { node, dates } = item;
         
         // 找出所有符合此 Key 的報名資料
         const targetNotes = notes.filter(n => {
             if (n.is_deleted) return false;
             
             // 確保報名資料符合月份
             let nEndDate = n.saved_end_date;
             if (!nEndDate) {
                 // 這裡需要寬鬆比較，因為系統 null 和報名 "" 應視為相同
                 const hNode = hierarchyData.find(h => 
                     h.location === n.activity_location && 
                     h.activity === n.activity_name && 
                     (h.option || '') === (n.activity_option || '')
                 );
                 nEndDate = hNode?.option_end_date || hNode?.activity_end_date;
             }
             if (!nEndDate || !nEndDate.startsWith(completedFilterMonth)) return false;

             const nOpt = n.activity_option || '(無行程)';
             const nKey = `${n.activity_location}|${n.activity_name}|${nOpt}`;
             return nKey === key;
         });

         const total = targetNotes.length;
         const vol = targetNotes.filter(n => n.identity === '發心義工').length;
         const dharma = targetNotes.filter(n => n.identity === '參加法會').length;

         // 計算內容統計
         const contentCountMap: Record<string, number> = {};
         targetNotes.forEach(n => {
             const raw = n.selected_contents as any;
             let contents: string[] = [];
             if (Array.isArray(raw)) contents = raw.map((s: any) => String(s).replace(/[\[\]"]/g, '').trim()).filter(Boolean);
             else if (typeof raw === 'string') { 
                let s = raw.trim(); 
                if (s !== '[]' && s !== '{}' && s !== 'null' && s !== '""') { 
                    s = s.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, ''); 
                    contents = s.split(',').map((item: string) => item.replace(/^"|"$/g, '').replace(/^'|'$/g, '').replace(/[\[\]"]/g, '').trim()).filter(Boolean); 
                } 
             }
             contents.forEach(c => {
                 contentCountMap[c] = (contentCountMap[c] || 0) + 1;
             });
         });
         let contentStatsStr = Object.entries(contentCountMap)
            .map(([k, v]) => `${k}(${v})`)
            .join(', ');
         
         if (!contentStatsStr) contentStatsStr = '-';

         result.push({
             node,
             dates,
             counts: { total, vol, dharma },
             contentStats: contentStatsStr
         });
     }

     return result.sort((a, b) => {
         const locComp = a.node.location.localeCompare(b.node.location);
         if (locComp !== 0) return locComp;
         const actComp = (a.node.activity || '').localeCompare(b.node.activity || '');
         if (actComp !== 0) return actComp;
         return (a.node.option || '').localeCompare(b.node.option || '');
     });
  }, [hierarchyStatus.completed, completedFilterMonth, completedFilterLocAct, completedFilterOption, notes, hierarchyData]);

  const selectedCompletedNotes = useMemo(() => {
      if (!completedFilterMonth) return [];
      
      let targetNotes = notes.filter(n => {
          if (n.is_deleted) return false;
          
          let endDate = n.saved_end_date;
          if (!endDate) {
               const hNode = hierarchyData.find(h => 
                   h.location === n.activity_location && 
                   h.activity === n.activity_name && 
                   (h.option || '') === (n.activity_option || '')
               );
               endDate = hNode?.option_end_date || hNode?.activity_end_date;
          }
          if (!endDate || !endDate.startsWith(completedFilterMonth)) return false;

          if (completedFilterLocAct) {
              const [loc, act] = completedFilterLocAct.split(' | ');
              if (n.activity_location !== loc || n.activity_name !== act) return false;
          }

          if (completedFilterOption) {
              if ((n.activity_option || '(無行程)') !== completedFilterOption) return false;
          }

          if (completedSearch) {
              const s = completedSearch.toLowerCase();
              return (n.real_name && n.real_name.toLowerCase().includes(s)) ||
                     (n.dharma_name && n.dharma_name.toLowerCase().includes(s)) ||
                     (n.other_remarks && n.other_remarks.toLowerCase().includes(s));
          }

          return true;
      });

      return targetNotes.sort((a, b) => String(a.activity_option || '').localeCompare(String(b.activity_option || '')));
  }, [notes, completedFilterMonth, completedFilterLocAct, completedFilterOption, completedSearch, hierarchyData]);

  // SETTINGS MEMOS with TOGGLE Logic
  const settingsSourceData = useMemo(() => {
      if (showCompletedSettings) return hierarchyData;
      return hierarchyStatus.active;
  }, [showCompletedSettings, hierarchyData, hierarchyStatus.active]);

  const adminActivities = useMemo(() => [...new Set(settingsSourceData.filter(h => h.location === mgmtSelectedLoc && h.activity).map(h => h.activity as string))].sort(), [settingsSourceData, mgmtSelectedLoc]);
  const adminOptions = useMemo(() => [...new Set(settingsSourceData.filter(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option).map(h => h.option as string))].sort(), [settingsSourceData, mgmtSelectedLoc, mgmtSelectedAct]);
  const adminContents = useMemo(() => settingsSourceData.filter(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option === mgmtSelectedOpt && h.content), [settingsSourceData, mgmtSelectedLoc, mgmtSelectedAct, mgmtSelectedOpt]);

  const filterActivityOptions = useMemo(() => {
    let source = hierarchyData;
    if (filterLoc) source = source.filter(h => h.location === filterLoc);
    return [...new Set(source.map(h => h.activity).filter((a): a is string => !!a))].sort();
  }, [hierarchyData, filterLoc]);

  const statActivityOptions = useMemo(() => {
    let source = hierarchyStatus.active; 
    if (statFilterLoc) source = source.filter(h => h.location === statFilterLoc);
    return [...new Set(source.map(h => h.activity).filter((a): a is string => !!a))].sort();
  }, [hierarchyStatus.active, statFilterLoc]);

  const statOptionOptions = useMemo(() => {
    let source = hierarchyStatus.active;
    if (statFilterLoc) source = source.filter(h => h.location === statFilterLoc);
    if (statFilterAct) source = source.filter(h => h.activity === statFilterAct);
    return [...new Set(source.map(h => h.option).filter((a): a is string => !!a))].sort();
  }, [hierarchyStatus.active, statFilterLoc, statFilterAct]);

  const filteredAdminNotes = useMemo(() => {
    return notes.filter(n => {
        const { isEnded } = getNoteStatus(n); 
        // Admin Data 只顯示進行中 (未圓滿)
        if (isEnded) return false;
        
        if (filterLoc && n.activity_location !== filterLoc) return false;
        if (filterAct && n.activity_name !== filterAct) return false; 
        if (searchText) { const search = searchText.toLowerCase(); return ( String(n.real_name || '').toLowerCase().includes(search) || String(n.dharma_name || '').toLowerCase().includes(search) || String(n.other_remarks || '').toLowerCase().includes(search) ); }
        return true;
    }).sort((a, b) => {
        // 1. 刪除排最後 (False < True)
        if (a.is_deleted !== b.is_deleted) return a.is_deleted ? 1 : -1;
        
        // 2. 地點活動 (Location + Activity)
        const locActA = (a.activity_location || '') + (a.activity_name || '');
        const locActB = (b.activity_location || '') + (b.activity_name || '');
        if (locActA !== locActB) return locActA.localeCompare(locActB);
        
        // 3. 行程 (Option)
        if (a.activity_option !== b.activity_option) return (a.activity_option || '').localeCompare(b.activity_option || '');
        
        // 4. 交通 (Transportation)
        if (a.transportation !== b.transportation) return (a.transportation || '').localeCompare(b.transportation || '');
        
        // 5. 姓名 (Name)
        return (a.real_name || '').localeCompare(b.real_name || '');
    });
  }, [notes, filterLoc, filterAct, searchText, getNoteStatus]); 

  const duplicateMap = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAdminNotes.forEach(n => { if (!n.is_deleted) { const key = `${n.activity_location}|${n.activity_name}|${n.activity_option}|${n.real_name}`; counts[key] = (counts[key] || 0) + 1; } });
    return counts;
  }, [filteredAdminNotes]);

  const sortedHistoryNotes = useMemo(() => {
      let filtered = notes.filter(n => n.user_id === user?.id);
      if (historyFilterLoc) filtered = filtered.filter(n => n.activity_location === historyFilterLoc);
      if (historySearch) {
          const s = historySearch.toLowerCase();
          filtered = filtered.filter(n => 
              (n.real_name && n.real_name.toLowerCase().includes(s)) ||
              (n.activity_name && n.activity_name.toLowerCase().includes(s))
          );
      }
      return filtered.sort((a, b) => {
          const getStatusWeight = (n: Note) => {
              if (n.is_deleted) return 2;
              const { isEnded } = getNoteStatus(n);
              if (isEnded) return 1;
              return 0;
          };
          const weightA = getStatusWeight(a);
          const weightB = getStatusWeight(b);
          if (weightA !== weightB) return weightA - weightB;
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
      });
  }, [notes, user, historyFilterLoc, historySearch, getNoteStatus]);

  const filteredUsers = useMemo(() => {
      if (!usersSearch) return allUsers;
      const s = usersSearch.toLowerCase();
      return allUsers.filter(u => 
          (u.user_name && u.user_name.toLowerCase().includes(s)) ||
          (u.id_last4 && u.id_last4.includes(s))
      );
  }, [allUsers, usersSearch]);

  const filteredAudits = useMemo(() => {
      if (!auditSearch) return resetRequests;
      const s = auditSearch.toLowerCase();
      return resetRequests.filter(r => 
          (r.user_name && r.user_name.toLowerCase().includes(s)) ||
          (r.id_last4 && r.id_last4.includes(s))
      );
  }, [resetRequests, auditSearch]);

  const statisticsData = useMemo(() => {
    const baseData = notes.filter(n => !n.is_deleted);
    const filtered = baseData.filter(n => {
        const { isEnded } = getNoteStatus(n);
        if (statsViewType === 'active' && isEnded) return false;
        if (statsViewType === 'completed' && !isEnded) return false;
        if (statFilterLoc && n.activity_location !== statFilterLoc) return false;
        if (statFilterAct && n.activity_name !== statFilterAct) return false;
        if (statFilterOpt && n.activity_option !== statFilterOpt) return false;
        return true;
    });

    const aggregate = (groupBy: (n: Note) => string) => {
        const result: Record<string, { dharma_m: number, dharma_f: number, vol_m: number, vol_f: number }> = {};
        filtered.forEach(n => {
            const key = groupBy(n) || '未指定';
            if (!result[key]) result[key] = { dharma_m: 0, dharma_f: 0, vol_m: 0, vol_f: 0 };
            const isDharma = n.identity === '參加法會';
            const isMale = n.gender === '男';
            if (isDharma && isMale) result[key].dharma_m++; else if (isDharma && !isMale) result[key].dharma_f++; else if (!isDharma && isMale) result[key].vol_m++; else if (!isDharma && !isMale) result[key].vol_f++;
        });
        return result;
    };

    const contentStats: Record<string, { dharma_m: number, dharma_f: number, vol_m: number, vol_f: number }> = {};
    filtered.forEach(n => {
        let contents: string[] = [];
        const raw = n.selected_contents as any;
        if (Array.isArray(raw)) contents = raw.map((s: any) => String(s).replace(/[\[\]"]/g, '').trim()).filter(Boolean);
        else if (typeof raw === 'string') { let s = raw.trim(); if (s !== '[]' && s !== '{}' && s !== 'null' && s !== '""') { s = s.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, ''); contents = s.split(',').map((item: string) => item.replace(/^"|"$/g, '').replace(/^'|'$/g, '').replace(/[\[\]"]/g, '').trim()).filter(Boolean); } }
        
        contents.forEach(c => {
             if (!contentStats[c]) contentStats[c] = { dharma_m: 0, dharma_f: 0, vol_m: 0, vol_f: 0 };
             const isDharma = n.identity === '參加法會';
             const isMale = n.gender === '男';
             if (isDharma && isMale) contentStats[c].dharma_m++; else if (isDharma && !isMale) contentStats[c].dharma_f++; else if (!isDharma && isMale) contentStats[c].vol_m++; else if (!isDharma && !isMale) contentStats[c].vol_f++;
        });
    });

    return {
        byLocationActivity: aggregate(n => `${n.activity_location}-${n.activity_name}`),
        byOption: aggregate(n => n.activity_option),
        byIdentity: aggregate(n => n.identity === '參加法會' ? '參加法會' : (n.identity === '發心義工' ? '發心義工' : n.identity)),
        byTransport: aggregate(n => n.transportation),
        byContent: contentStats
    };
  }, [notes, statFilterLoc, statFilterAct, statFilterOpt, statsViewType, getNoteStatus]);

  const statsOverview = useMemo(() => {
      let total = 0; let dharma = 0; let vol = 0;
      const baseData = notes.filter(n => !n.is_deleted);
      const filtered = baseData.filter(n => {
          const { isEnded } = getNoteStatus(n);
          if (statsViewType === 'active' && isEnded) return false;
          if (statsViewType === 'completed' && !isEnded) return false;
          if (statFilterLoc && n.activity_location !== statFilterLoc) return false;
          if (statFilterAct && n.activity_name !== statFilterAct) return false;
          if (statFilterOpt && n.activity_option !== statFilterOpt) return false;
          return true;
      });
      filtered.forEach(n => { total++; if (n.identity === '參加法會') dharma++; if (n.identity === '發心義工') vol++; });
      return { total, dharma, vol };
  }, [notes, statFilterLoc, statFilterAct, statFilterOpt, statsViewType, getNoteStatus]);

  // 8. Final Render Variables
  const submitStatus = getSubmitButtonStatus();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-[#4f093c] text-4xl animate-pulse" style={{ backgroundColor: BG_WARM_BEIGE, colorScheme: 'light' }}>
        學員登記系統 加載中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans text-slate-900" style={{ backgroundColor: BG_WARM_BEIGE, colorScheme: 'light' }}>
        <div className="p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#E8E2D1] flex flex-col gap-6" style={{ backgroundColor: CARD_BG_COLOR }}>
          <div className="text-center">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner overflow-hidden border-4 border-[#F2ECE4]">
                <CustomLogo className="w-16 h-16" />
             </div>
             <h2 className="text-xl font-bold text-[#4f093c] mb-2">學員登記系統</h2>
             <p className="text-sm text-slate-400 font-bold">{authMode === 'login' ? '會員登入' : authMode === 'signup' ? '註冊新帳號' : '密碼重設申請'}</p>
          </div>
          
          {!supabaseClient && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-start gap-2">
               <ServerCrash className="w-5 h-5 shrink-0 mt-0.5" />
               <div>
                  無法連結資料庫<br/>
                  <span className="text-xs font-normal text-red-500">請檢查環境變數或網路設定。</span>
               </div>
            </div>
          )}
          
          <div className="space-y-4">
             <div>
               <label className="text-sm font-bold text-[#4f093c] ml-1">姓名</label>
               <input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white text-slate-800" value={username} onChange={e=>setUsername(e.target.value)} />
             </div>
             <div>
               <label className="text-sm font-bold text-[#4f093c] ml-1">ID後四碼</label>
               <input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white text-slate-800" placeholder="如：1234" maxLength={4} value={idLast4} onChange={e=>setIdLast4(e.target.value)} />
             </div>
             {authMode !== 'forgot' && (
               <div>
                 <label className="text-sm font-bold text-[#4f093c] ml-1">密碼</label>
                 <input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white text-slate-800" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
               </div>
             )}
          </div>

          <button onClick={handleAuthAction} className="w-full bg-[#4f093c] hover:bg-[#3d072e] text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
             {authMode === 'login' ? '登入系統' : authMode === 'signup' ? '立即註冊' : '送出申請'} <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-200/50 mt-2">
             {authMode === 'login' ? (
               <>
                 <button onClick={()=>setAuthMode('signup')} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">沒有帳號？註冊</button>
                 <button onClick={()=>setAuthMode('forgot')} className="text-sm font-bold text-orange-600 hover:text-orange-800 transition-colors">忘記密碼？</button>
               </>
             ) : (
               <button onClick={()=>setAuthMode('login')} className="w-full text-center text-sm font-bold text-blue-600 hover:text-blue-800">返回登入</button>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 font-sans text-xl" style={{ backgroundColor: BG_WARM_BEIGE, colorScheme: 'light' }}>
      
      {/* Top Header */}
      <div className="bg-[#4f093c] sticky top-0 z-50 shadow-md border-b border-white/10 px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0">
         <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                  <CustomLogo className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-xl text-white tracking-wide truncate">嗨～ {getDisplayNameOnly(user?.email)}</span>
            </div>
            {isAdmin && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold border border-amber-200 flex-shrink-0">管理者</span>}
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
           <button onClick={() => setShowPwdModal(true)} className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors backdrop-blur-sm flex items-center gap-2">
             <KeyRound className="w-4 h-4" /> 修改密碼
           </button>
           <button onClick={handleLogout} className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors backdrop-blur-sm flex items-center gap-2">
             <LogOut className="w-4 h-4" /> 登出
           </button>
         </div>
      </div>

      {/* Main Tab Menu */}
      <div className="sticky top-[64px] z-40 bg-[#4f093c] shadow-lg pt-2 pb-4 px-4 mb-8">
        <div className="flex p-1 bg-white/10 rounded-2xl mx-auto max-w-5xl backdrop-blur-sm overflow-x-auto">
           {[{ id: 'bulletin', icon: <Bell className="w-5 h-5"/>, label: '公告' }, 
             { id: 'form', icon: <Edit className="w-5 h-5"/>, label: '登記' }, 
             { id: 'history', icon: <History className="w-5 h-5"/>, label: '紀錄' }, 
             { id: 'users', icon: <Users className="w-5 h-5"/>, label: '學員', admin: true }, 
             { id: 'audit', icon: <ClipboardCheck className="w-5 h-5"/>, label: '審核', admin: true }, 
             { id: 'admin_data', icon: <FileSpreadsheet className="w-5 h-5"/>, label: '資料', admin: true }, 
             { id: 'statistics', icon: <BarChart3 className="w-5 h-5"/>, label: '統計', admin: true },
             { id: 'admin_settings', icon: <Settings className="w-5 h-5"/>, label: '設定', admin: true },
             { id: 'completed_cases', icon: <Archive className="w-5 h-5"/>, label: '結案', admin: true }
            ].map((tab) => (
             (!tab.admin || isAdmin) && (
               <button 
                 key={tab.id} 
                 onClick={() => setActiveTab(tab.id)} 
                 className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-[#4f093c] shadow-lg scale-105' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
               >
                 {tab.icon}{tab.label}
               </button>
             )
           ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[1600px] mx-auto p-2 md:p-6 lg:p-10">
        
        {/* Bulletin Tab */}
        {activeTab === 'bulletin' && (
          <div className="space-y-8 animate-in fade-in">
             {isAdmin && (
               <div className={`p-6 rounded-3xl shadow-sm border border-stone-100 mb-8`} style={{ backgroundColor: CARD_BG_COLOR }}>
                  <h4 className="font-bold text-[#4f093c] mb-4 flex items-center gap-2 text-3xl"><Megaphone className="w-8 h-8"/> 公告發布</h4>
                  <div className="flex gap-3 items-start">
                     <textarea className="flex-1 p-3 border border-stone-200 rounded-xl text-lg bg-white outline-none focus:ring-2 focus:ring-[#4f093c]/20" rows={2} placeholder="輸入公告內容..." value={newBulletin} onChange={e=>setNewBulletin(e.target.value)} />
                     <div className="flex flex-col gap-2">
                        <input type="file" ref={fileInputRef} accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
                        <button onClick={handleSelectImage} className="bg-stone-100 text-stone-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-200 flex items-center justify-center gap-1"><ImageIcon className="w-4 h-4"/> 圖片</button>
                        <button onClick={handleAddBulletin} className="bg-[#4f093c] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-[#3d072e] flex items-center justify-center gap-1 shadow-md shadow-[#4f093c]/20">發布</button>
                     </div>
                  </div>
               </div>
             )}
             {bulletins.map(b => (
                <div key={b.id} className={`p-8 rounded-[32px] shadow-sm border border-stone-100 hover:shadow-md transition-shadow relative overflow-hidden group`} style={{ backgroundColor: CARD_BG_COLOR }}>
                   <div className="absolute top-0 left-0 w-2 h-full bg-[#4f093c]"></div>
                   <div className="text-2xl font-bold text-slate-800 leading-relaxed pl-4">{renderBulletinContent(b.content)}</div>
                   <div className="mt-6 text-sm text-stone-400 font-mono flex items-center gap-2 pl-4"><Clock className="w-4 h-4"/> {formatDateTime(b.created_at)}</div>
                   {isAdmin && (
                     <button onClick={()=>handleDeleteBulletin(b.id)} className="absolute top-6 right-6 text-white bg-red-500 hover:bg-red-600 p-2 rounded-lg shadow-md transition-colors">
                       <Trash2 className="w-5 h-5"/>
                     </button>
                   )}
                </div>
             ))}
          </div>
        )}

        {/* Form Tab */}
        {activeTab === 'form' && (
          <div className={`p-8 md:p-12 rounded-[40px] shadow-lg border border-stone-100 animate-in slide-in-from-bottom-4`} style={{ backgroundColor: CARD_BG_COLOR }}>
             {submitStatus.disabled && (
                 <div className={`mb-8 p-4 border-l-4 font-bold rounded-r-xl flex items-center gap-3 ${submitStatus.text.includes('已圓滿') ? 'bg-stone-100 border-stone-500 text-stone-600' : 'bg-red-50 border-red-500 text-red-700'}`}>
                     <AlertTriangle className="w-5 h-5"/> {submitStatus.text}
                 </div>
             )}

             <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                     <div className="md:col-span-3 space-y-1">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">姓名*</label>
                       <input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.real_name || ''} onChange={e=>setFormData({...formData, real_name: e.target.value})} />
                     </div>
                     <div className="md:col-span-2 space-y-1">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">法名</label>
                       <input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.dharma_name || ''} onChange={e=>setFormData({...formData, dharma_name: e.target.value})} />
                     </div>
                     <div className="md:col-span-2 space-y-1">
                        <label className="text-sm font-bold text-[#4f093c] ml-1">性別*</label>
                        <select className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.gender || ''} onChange={e=>setFormData({...formData, gender: e.target.value})}>
                          <option value="">請選擇</option>
                          <option value="男">男</option>
                          <option value="女">女</option>
                        </select>
                     </div>
                     <div className="md:col-span-2 space-y-1">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">報名選項*</label>
                       <select className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.registration_option || ''} onChange={e=>setFormData({...formData, registration_option: e.target.value})}>
                         <option value="新增">新增</option>
                         <option value="異動">異動</option>
                       </select>
                     </div>
                     <div className="md:col-span-3 space-y-1">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">屬性*</label>
                       <select className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.registrant_type || ''} onChange={e=>setFormData({...formData, registrant_type: e.target.value})}>
                         <option value="禪修班學員">禪修班學員</option>
                         <option value="上過課學員">上過課學員</option>
                         <option value="學員家人">學員家人</option>
                       </select>
                     </div>
                 </div>
                 
                 {formData.registrant_type === '學員家人' && (
                   <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2">
                     <Info className="w-4 h-4"/> 請至知客室填寫親眷表
                   </div>
                 )}
                 
                 {getCurrentDeadlineText() && (
                   <div className="text-xs text-red-500 font-mono font-bold text-left mb-[-10px]">{getCurrentDeadlineText()}</div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#4f093c] ml-1">1. 地點*</label>
                          <select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.activity_location || ''} onChange={e=>setFormData({...formData, activity_location: e.target.value, activity_name: '', activity_option: '', selected_contents: []})}>
                            <option value="">請選擇地點</option>
                            {locations.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#4f093c] ml-1">2. 活動*</label>
                          <select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" disabled={!formData.activity_location} value={formData.activity_name || ''} onChange={e=>setFormData({...formData, activity_name: e.target.value, activity_option: '', selected_contents: []})}>
                            <option value="">請選擇活動</option>
                            {renderActivityOptions()}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#4f093c] ml-1">3. 行程</label>
                          <select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" disabled={!formData.activity_name} value={formData.activity_option || ''} onChange={e=>setFormData({...formData, activity_option: e.target.value, selected_contents: []})}>
                            <option value="">請選擇行程</option>
                            {renderOptionOptions()}
                          </select>
                        </div>
                 </div>
                 
                 {formData.activity_option.includes('自訂') && (
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-[#4f093c] ml-1">自訂備註*</label>
                     <textarea rows={2} className="w-full p-3 text-lg border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-200 bg-white" value={formData.other_remarks || ''} onChange={e=>setFormData({...formData, other_remarks: e.target.value})} />
                   </div>
                 )}

                 {availableContents.length > 0 && (
                   <div className="p-4 bg-white/50 rounded-xl border border-stone-200">
                     <div className="flex flex-wrap gap-2">
                       {availableContents.map(c => (
                         <button 
                           key={c} 
                           type="button" 
                           onClick={() => setFormData(p => ({ ...p, selected_contents: p.selected_contents.includes(c) ? p.selected_contents.filter(i => i !== c) : [...p.selected_contents, c] }))} 
                           className={`px-4 py-1 rounded-lg font-bold text-sm border transition-all ${formData.selected_contents.includes(c) ? 'bg-[#4f093c] text-white border-[#4f093c]' : 'bg-white text-stone-600 border-stone-300 hover:border-[#4f093c]'}`}
                         >
                           {c}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#4f093c] ml-1">身分*</label>
                          <select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl bg-white" value={formData.identity || ''} onChange={e=>setFormData({...formData, identity: e.target.value})}>
                            <option value="">請選擇</option>
                            <option value="參加法會">參加法會</option>
                            <option value="發心義工">發心義工</option>
                          </select>
                        </div>
                        {fieldVisibility.transportation && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-[#4f093c] ml-1">交通*</label>
                            <select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl bg-white" value={formData.transportation || ''} onChange={e=>setFormData({...formData, transportation: e.target.value})}>
                              <option value="">請選擇</option>
                              {filteredTransportOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        )}
                 </div>

                 {fieldVisibility.arrivalDeparture && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">抵寺時間*</label>
                       <DateInputWithClear 
                         type="datetime-local" 
                         min={currentDateTime} 
                         className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white" 
                         value={formData.arrival_datetime || ''} 
                         onChange={(e: any) => setFormData({...formData, arrival_datetime: e.target.value})} 
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">離寺時間*</label>
                       <DateInputWithClear 
                         type="datetime-local" 
                         min={formData.arrival_datetime || currentDateTime} 
                         className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white" 
                         value={formData.departure_datetime || ''} 
                         onChange={(e: any) => setFormData({...formData, departure_datetime: e.target.value})} 
                       />
                     </div>
                   </div>
                 )}
                 
                 {fieldVisibility.volunteerGroup && (
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-[#4f093c] ml-1">義工組別*</label>
                     <input className="w-full p-3 text-lg border border-stone-200 rounded-xl bg-white" value={formData.volunteer_group || ''} onChange={e=>setFormData({...formData, volunteer_group: e.target.value})} />
                   </div>
                 )}
                 
                 {fieldVisibility.volunteerType && (
                   <div className="space-y-2">
                     <label className="text-sm font-bold text-[#4f093c] ml-1">義工選項*</label>
                     <select className="w-full p-3 text-lg border border-stone-200 rounded-xl bg-white" value={formData.volunteer_type || ''} onChange={e=>setFormData({...formData, volunteer_type: e.target.value})}>
                       <option value="">請選擇</option>
                       <option value="一般義工-精舍設定組別">一般義工-精舍設定組別</option>
                       <option value="長期義工-請至平台報名">長期義工-請至平台報名</option>
                       <option value="佛巡-請至平台報名">佛巡-請至平台報名</option>
                     </select>
                   </div>
                 )}
                 
                 {fieldVisibility.volunteerDates && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">發心開始*</label>
                       <DateInputWithClear 
                         type="datetime-local" 
                         min={currentDateTime} 
                         className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-[#4f093c]/20 outline-none shadow-sm" 
                         value={formData.start_date || ''} 
                         onChange={(e: any) => setFormData({...formData, start_date: e.target.value})} 
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-bold text-[#4f093c] ml-1">發心結束*</label>
                       <DateInputWithClear 
                         type="datetime-local" 
                         min={formData.start_date || currentDateTime} 
                         className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-[#4f093c]/20 outline-none shadow-sm" 
                         value={formData.end_date || ''} 
                         onChange={(e: any) => setFormData({...formData, end_date: e.target.value})} 
                       />
                     </div>
                   </div>
                 )}

                 {fieldVisibility.accommodation && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-[#4f093c]">安單選項</label>
                          <select className="w-full p-3 text-lg border rounded-xl bg-white" value={formData.accommodation_option || ''} onChange={e=>setFormData({...formData, accommodation_option: e.target.value})}>
                            <option value="不安單">不安單</option>
                            <option value="須安單">須安單</option>
                          </select>
                        </div>
                        {fieldVisibility.accommodationDates && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DateInputWithClear 
                              type="date" 
                              min={todayDate} 
                              className="w-full p-2 border rounded-lg bg-white" 
                              value={formData.stay_start_date || ''} 
                              onChange={(e: any) => setFormData({...formData, stay_start_date: e.target.value})} 
                            />
                            <DateInputWithClear 
                              type="date" 
                              min={formData.stay_start_date || todayDate} 
                              className="w-full p-2 border rounded-lg bg-white" 
                              value={formData.stay_end_date || ''} 
                              onChange={(e: any) => setFormData({...formData, stay_end_date: e.target.value})} 
                            />
                          </div>
                        )}
                    </div>
                 )}
                 
                 {/* 其他備註 */}
                 <div className="pt-4 border-t border-stone-100">
                    <label className="text-sm font-bold text-[#4f093c] ml-1 mb-2 block">其他備註</label>
                    <textarea rows={2} className="w-full p-3 text-lg border border-stone-200 rounded-xl bg-white" placeholder="其他備註..." value={formData.memo || ''} onChange={e=>setFormData({...formData, memo: e.target.value})} />
                 </div>

                 <button onClick={handleSubmitNote} disabled={loading || submitStatus.disabled} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-lg transition-transform active:scale-[0.99] ${submitStatus.disabled ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-[#4f093c] text-white hover:bg-[#3d072e] shadow-[#4f093c]/20'}`}>
                   {submitStatus.text}
                 </button>
             </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in">
             <ResponsiveHeader title="歷史紀錄">
                 <div className="flex items-center gap-2">
                    <div className="relative">
                      <input type="text" placeholder="搜尋..." className="p-2 pl-8 border-none rounded-xl text-base font-bold text-stone-600 outline-none w-40 focus:w-60 transition-all bg-white/90 focus:bg-white" value={historySearch} onChange={e=>setHistorySearch(e.target.value)} />
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"/>
                    </div>
                    <Filter className="w-4 h-4 text-white/80 hidden md:block"/>
                    <select className="p-2 pl-4 pr-8 border-none bg-white/20 rounded-xl text-base font-bold text-white outline-none cursor-pointer hover:bg-white/30 transition-colors [&>option]:text-stone-600" value={historyFilterLoc} onChange={e=>setHistoryFilterLoc(e.target.value)}>
                       <option value="">全部地點</option>
                       {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                 </div>
             </ResponsiveHeader>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* 歷史卡片內容與之前相同 */}
               {sortedHistoryNotes.map(n => {
                 const status = getCardStatus(n);
                 const isInactive = status.isInactive;
                 const rawContents: any = n.selected_contents;
                 const safeContents = safeRenderContents(rawContents);
                 const hasContents = safeContents.length > 0;
                 const hasRemarks = typeof n.other_remarks === 'string' && n.other_remarks.trim().length > 0 && n.other_remarks !== 'null';
                 const hasMemo = typeof n.memo === 'string' && n.memo.trim().length > 0 && n.memo !== 'null';

                 return (
                   <div key={n.id} className={`rounded-[24px] shadow-sm border overflow-hidden ${isInactive ? 'bg-stone-50 border-stone-200' : 'hover:shadow-md transition-all border-stone-100'}`} style={{ backgroundColor: isInactive ? '#f5f5f4' : CARD_BG_COLOR }}>
                      <div className="relative p-6 pb-0">
                          <div className="flex items-center gap-2 mb-3">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${status.color}`}>{status.text}</span>
                              <h3 className={`text-xl font-bold ${isInactive ? 'text-stone-400' : 'text-slate-800'}`}>
                                {n.activity_location} <span className="text-stone-300 mx-1">|</span> {n.activity_name}
                              </h3>
                          </div>
                          
                          {/* 姓名/法名/性別 */}
                          <div className={`mb-2 ${isInactive ? 'text-stone-400' : 'text-slate-800'}`}>
                              <span className="text-xl font-bold">{n.real_name}</span>
                              <span className="text-base font-bold opacity-70 ml-2">
                                  {n.dharma_name ? ` / ${n.dharma_name}` : ' / (無)'} <span className="mx-1 text-stone-400">/</span> {n.gender}
                              </span>
                          </div>

                          {/* 身分/屬性 */}
                          <div className={`mb-4 flex items-center gap-2 ${isInactive ? 'text-stone-400' : 'text-slate-800'}`}>
                              <span className={`text-sm font-bold ${isInactive ? 'text-stone-400' : 'text-[#7A2E40]'}`}>
                                {n.identity === '參加法會' ? '法會' : (n.identity === '發心義工' ? '義工' : n.identity)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${isInactive ? 'bg-stone-200/50 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>{n.registrant_type}</span>
                          </div>
                          
                          <div className={`space-y-3 ${isInactive ? 'opacity-70 pointer-events-none' : ''}`}>
                             <div className={`text-sm font-bold border-l-[3px] pl-2 ${isInactive ? 'text-stone-400 border-stone-300' : 'text-blue-600 border-blue-600'}`}>
                                 {n.activity_option}
                             </div>
                             {(hasContents || hasRemarks) && (
                                <div className={`rounded-lg p-3 space-y-1 ${isInactive ? 'bg-stone-100/50 border border-stone-200' : 'bg-orange-50 border border-orange-100'}`}>
                                    {hasContents && (
                                        <div className={`text-sm font-bold flex items-start gap-1 ${isInactive ? 'text-stone-400' : 'text-orange-800'}`}>
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5 ${isInactive ? 'bg-stone-200 text-stone-500' : 'bg-white/60 text-orange-600'}`}>內容</span> 
                                            <span>{safeContents}</span>
                                        </div>
                                    )}
                                    {hasRemarks && (
                                        <div className={`text-sm font-bold flex items-start gap-1 ${isInactive ? 'text-stone-400' : 'text-orange-800'}`}>
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5 ${isInactive ? 'bg-stone-200 text-stone-500' : 'bg-white/60 text-orange-600'}`}>備註</span>
                                            <span>{String(n.other_remarks)}</span>
                                        </div>
                                    )}
                                </div>
                             )}
                             <div className="text-sm pt-2 border-t border-stone-100 grid grid-cols-1 gap-1">
                                {n.transportation && <p className={isInactive ? 'text-stone-400' : 'text-stone-600'}><span className="font-bold opacity-70">交通：</span> {n.transportation}</p>}
                                {(n.arrival_datetime || n.departure_datetime) && (
                                    <div className={`text-xs p-2 rounded font-mono ${isInactive ? 'bg-stone-100 text-stone-400' : 'bg-blue-50/50 text-blue-800'}`}>
                                        <div>抵：{n.arrival_datetime ? formatDateTime(n.arrival_datetime) : '-'}</div>
                                        <div>離：{n.departure_datetime ? formatDateTime(n.departure_datetime) : '-'}</div>
                                    </div>
                                )}
                                {n.identity === '發心義工' && (
                                    <p className={isInactive ? 'text-stone-400' : 'text-stone-600'}>
                                        <span className="font-bold opacity-70">組別：</span> 
                                        {simplifyVolunteerType(n.volunteer_type)}{n.volunteer_group ? ` - ${n.volunteer_group}` : ''}
                                    </p>
                                )}
                                {(n.start_date || n.end_date) && (
                                    <div className={`text-xs p-2 rounded font-mono ${isInactive ? 'bg-stone-100 text-stone-400' : 'bg-blue-50/50 text-blue-800'}`}>
                                        <div className="font-bold opacity-50 mb-1">發心時間：</div>
                                        <div>起：{n.start_date ? formatDateTime(n.start_date) : '-'}</div>
                                        <div>迄：{n.end_date ? formatDateTime(n.end_date) : '-'}</div>
                                    </div>
                                )}
                                <p className={`mt-1 ${isInactive ? 'text-stone-400' : 'text-stone-600'}`}><span className="font-bold opacity-70">安單：</span> {n.accommodation_option || '不安單'} {n.accommodation_option === '須安單' ? `(${n.stay_start_date} ~ ${n.stay_end_date})` : ''}</p>
                                {n.memo && <div className={`mt-2 text-xs italic ${isInactive ? 'text-stone-300' : 'text-stone-400'}`}>其他備註: {String(n.memo)}</div>}
                             </div>
                             <div className="pt-2 flex justify-between items-end">
                                <div className={`text-xs font-mono ${isInactive ? 'text-stone-300' : 'text-stone-400'}`}>{n.created_at ? n.created_at.slice(0, 16).replace('T', ' ') : ''}</div>
                                {!isInactive && (
                                   <label className="flex items-center gap-2 cursor-pointer select-none text-red-400 hover:text-red-600 transition-colors bg-white px-3 py-1 rounded-full shadow-sm border border-stone-100">
                                     <input type="checkbox" className="w-4 h-4 rounded accent-red-500" checked={n.is_deleted} onChange={() => handleToggleDeleteNote(n.id, n.is_deleted)} />
                                     <span className="font-bold text-xs">刪除</span>
                                   </label>
                                )}
                             </div>
                          </div>
                      </div>
                   </div>
                 );
               })}
               {sortedHistoryNotes.length === 0 && (
                 <div className={`col-span-full py-20 text-center text-stone-400 rounded-[32px] border border-stone-100 flex flex-col items-center gap-4`} style={{ backgroundColor: CARD_BG_COLOR }}>
                   <FileSpreadsheet className="w-12 h-12 opacity-20"/>
                   暫無紀錄
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && isAdmin && (
          <div className={`p-8 rounded-[32px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
            <ResponsiveHeader title="報名統計(進行中)">
                <div className="flex gap-2 items-center overflow-x-auto">
                    <select className="p-2 bg-white border-none rounded-xl text-base font-bold text-stone-600 outline-none min-w-[8rem]" value={statFilterLoc} onChange={e => { setStatFilterLoc(e.target.value); setStatFilterAct(''); }}>
                        <option value="">所有地點</option>
                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select className="p-2 bg-white border-none rounded-xl text-base font-bold text-stone-600 outline-none min-w-[8rem] max-w-[10rem] truncate" value={statFilterAct} onChange={e => setStatFilterAct(e.target.value)} disabled={!statFilterLoc}>
                        <option value="">{statFilterLoc ? '所有活動' : '請先選地點'}</option>
                        {statActivityOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select className="p-2 bg-white border-none rounded-xl text-base font-bold text-stone-600 outline-none min-w-[8rem] max-w-[10rem] truncate" value={statFilterOpt} onChange={e => setStatFilterOpt(e.target.value)} disabled={!statFilterAct}>
                        <option value="">{statFilterAct ? '所有行程' : '請先選活動'}</option>
                        {statOptionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button 
                        onClick={() => downloadPDF('stats-content-area', `${statFilterLoc || '所有地點'} - ${statFilterAct || '所有活動'} 統計表`)}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors shadow-sm ml-2 shrink-0"
                    >
                        <Download className="w-4 h-4"/> PDF
                    </button>
                </div>
            </ResponsiveHeader>

            <div id="stats-content-area">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <OverviewCard title="總報名人數" count={statsOverview.total} icon={Users} color="bg-[#4f093c]" />
                    <OverviewCard title="參加法會" count={statsOverview.dharma} icon={UserCheck} color="bg-blue-600" />
                    <OverviewCard title="發心義工" count={statsOverview.vol} icon={Briefcase} color="bg-orange-500" />
                </div>

                <div className="mb-10">
                    <IdentityRatioChart data={statisticsData.byIdentity} />
                </div>

                <div className="space-y-10">
                   <div><StatsBarChart title="各場人數 (地點活動)" data={statisticsData.byLocationActivity} /></div>
                   <div><StatsBarChart title="各行程人數 (行程)" data={statisticsData.byOption} /></div>
                   <div><StatsBarChart title="交通方式人數" data={statisticsData.byTransport} /></div>
                   <div><StatsBarChart title="勾選內容統計" data={statisticsData.byContent} /></div>
                </div>
            </div>
          </div>
        )}

        {/* Admin Data Tab */}
        {activeTab === 'admin_data' && isAdmin && (
          <div className={`p-8 rounded-[32px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
            <ResponsiveHeader title="資料總覽(進行中)">
                <div className="flex gap-2 items-center overflow-x-auto">
                    <select className="p-2 bg-white border-none rounded-xl text-base font-bold text-stone-600 outline-none min-w-[8rem]" value={filterLoc} onChange={e => { setFilterLoc(e.target.value); setFilterAct(''); }}><option value="">所有地點</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                    <select className="p-2 bg-white border-none rounded-xl text-base font-bold text-stone-600 outline-none min-w-[8rem] max-w-[10rem] truncate" value={filterAct} onChange={e => setFilterAct(e.target.value)} disabled={!filterLoc}><option value="">{filterLoc ? '所有活動' : '請先選地點'}</option>{filterActivityOptions.map(a => <option key={a} value={a}>{a}</option>)}</select>
                    <div className="relative min-w-[10rem]">
                        <input type="text" placeholder="搜尋..." className="p-2 pl-8 border-none rounded-xl text-base font-bold text-stone-600 outline-none w-full" value={searchText} onChange={e=>setSearchText(e.target.value)} />
                        <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"/>
                    </div>
                    <button onClick={handleExport} className="bg-emerald-600 text-white px-3 py-2 rounded-xl flex items-center gap-1 text-sm font-bold hover:bg-emerald-700 shadow-md shrink-0">匯出</button>
                </div>
            </ResponsiveHeader>
            
            {/* Table (Resizable Columns) */}
            <div className="overflow-x-auto rounded-2xl border border-stone-100">
              <table className="w-full text-left text-sm bg-white table-fixed" style={{ minWidth: '1200px' }}>
                <thead className="bg-[#4f093c] text-white font-bold">
                  <tr>
                      {[
                        { key: 'col1', label: '活動行程' },
                        { key: 'col2', label: '基本資料' },
                        { key: 'col3', label: '交通/住宿' },
                        { key: 'col4', label: '義工資訊' },
                        { key: 'col5', label: '備註' },
                        { key: 'col6', label: '狀態' }
                      ].map((col) => (
                        <th 
                          key={col.key} 
                          className="p-4 relative group select-none" 
                          style={{ width: colWidths[col.key as keyof typeof colWidths] }}
                        >
                          {col.label}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 group-hover:bg-white/10 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => startResize(e, col.key)}
                          >
                            <GripVertical className="w-3 h-3 text-white/50" />
                          </div>
                        </th>
                      ))}
                      <th className="p-4 text-center w-[80px] min-w-[80px] sticky right-0 bg-[#4f093c] z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">刪除</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {filteredAdminNotes.map(n => {
                      const { isEnded } = getNoteStatus(n); 
                      if (isEnded) return null;

                      const safeContents = safeRenderContents(n.selected_contents);
                      const hasContents = safeContents.length > 0;
                      const hasRemarks = typeof n.other_remarks === 'string' && n.other_remarks.trim().length > 0 && n.other_remarks !== 'null';
                      const hasMemo = typeof n.memo === 'string' && n.memo.trim().length > 0 && n.memo !== 'null';
                      const mergedRemarks = [];
                      if (hasContents) mergedRemarks.push(safeContents);
                      if (hasRemarks) mergedRemarks.push(n.other_remarks);

                      let statusBadge; 
                      let rowStyleObj = {};
                      let subTextStyle = "text-stone-600"; 
                      let boldStyle = "font-bold text-xl text-slate-800"; 
                      
                      if(n.is_deleted) { 
                        statusBadge = <span className="px-2 py-0.5 rounded text-xs font-bold w-fit bg-red-100 text-red-700">已刪除</span>; 
                        subTextStyle = "text-stone-400"; 
                        boldStyle = "font-bold text-xl text-stone-400"; 
                      } else { 
                        statusBadge = <span className={`px-2 py-0.5 rounded text-xs font-bold w-fit ${n.registration_option === '新增' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{n.registration_option}</span>;
                        rowStyleObj = { backgroundColor: CARD_BG_COLOR };
                      } 

                      const dupKey = `${n.activity_location}|${n.activity_name}|${n.activity_option}|${n.real_name}`;
                      const isDuplicate = !n.is_deleted && (duplicateMap[dupKey] || 0) > 1;

                      return (
                      <tr key={n.id} className={n.is_deleted ? "bg-stone-100 border-b border-white" : "hover:brightness-95 transition-all border-b border-white"} style={rowStyleObj}>
                        <td className="p-4 align-top overflow-hidden break-words">
                          <div className={boldStyle}>{n.activity_location}</div>
                          <div className={boldStyle}>{n.activity_name}</div>
                          <div className={`mt-1 text-sm font-bold ${n.is_deleted ? 'text-stone-400' : 'text-blue-600'}`}>{n.activity_option}</div>
                        </td>
                        <td className="p-4 align-top overflow-hidden break-words">
                          <div className={boldStyle}>{n.real_name}</div>
                          <div className={`text-sm font-bold mt-1 ${subTextStyle}`}>{n.dharma_name ? ` / ${n.dharma_name}` : ' / (無)'} / {n.gender}</div>
                          <div className={subTextStyle}>{n.registrant_type}</div>
                          <div className={`${n.is_deleted ? 'text-stone-400' : 'text-[#4f093c]'} font-bold`}>{n.identity}</div>
                        </td>
                        <td className={`p-4 align-top overflow-hidden break-words ${subTextStyle}`}>
                          <div className={`${n.is_deleted ? 'text-stone-400' : 'text-slate-700'} font-bold`}>{n.transportation}</div>
                          {(n.arrival_datetime || n.departure_datetime) && (
                            <div className="text-xs mt-1 whitespace-nowrap">
                              <div>抵: {n.arrival_datetime ? formatDateTime(n.arrival_datetime) : '-'}</div>
                              <div>離: {n.departure_datetime ? formatDateTime(n.departure_datetime) : '-'}</div>
                            </div>
                          )}
                          <div className="mt-2 border-t pt-1 border-stone-200/50">
                            <div>{n.accommodation_option}</div>
                            {n.accommodation_option === '須安單' && <div className="text-xs">{n.stay_start_date}~{n.stay_end_date}</div>}
                          </div>
                        </td>
                        <td className={`p-4 align-top overflow-hidden break-words ${subTextStyle}`}>
                          {n.identity === '發心義工' ? (
                            <>
                              <div className={`${n.is_deleted ? 'text-stone-400' : 'text-slate-700'} font-bold`}>
                                {simplifyVolunteerType(n.volunteer_type)}{n.volunteer_group ? ` - ${n.volunteer_group}` : ''}
                              </div>
                              {(n.start_date || n.end_date) && (
                                <div className="text-xs mt-1 whitespace-nowrap">
                                  <div>起: {n.start_date ? formatDateTime(n.start_date) : '-'}</div>
                                  <div>迄: {n.end_date ? formatDateTime(n.end_date) : '-'}</div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="opacity-50">-</span>
                          )}
                        </td>
                        <td className="p-4 align-top w-40 max-w-[10rem]">
                          <div className="flex flex-col gap-1 break-words whitespace-normal leading-tight">
                            {mergedRemarks.join(' / ')}
                            {hasMemo && <div className={`${subTextStyle} mt-2 pt-2 border-t border-stone-200/50 border-dashed`}>{String(n.memo)}</div>}
                          </div>
                        </td>
                        <td className="p-4 align-top overflow-hidden break-words">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                                {statusBadge}
                                {isDuplicate && <span className="text-red-600 text-xs font-bold bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200 w-fit">重複</span>}
                            </div>
                            <div className="text-xs text-stone-500 mt-2 space-y-1">
                              <div className="font-bold">報名者: {n.sign_name}</div>
                              <div className="opacity-70">{formatDateTime(n.created_at)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-top text-center overflow-hidden sticky right-0 bg-inherit shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-stone-300 text-red-600 focus:ring-red-600 cursor-pointer"
                                checked={n.is_deleted} 
                                onChange={() => handleToggleDeleteNote(n.id, n.is_deleted)} 
                            />
                        </td>
                      </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Completed Cases Tab */}
        {activeTab === 'completed_cases' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
             <div className={`p-10 rounded-[40px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
                 <ResponsiveHeader title="已圓滿活動">
                     <div className="flex flex-wrap gap-2 items-center">
                         <select className="p-2 border-none rounded-xl text-base font-bold text-stone-600 outline-none bg-white shadow-sm" value={completedFilterMonth} onChange={(e) => { setCompletedFilterMonth(e.target.value); setCompletedFilterLocAct(''); setCompletedFilterOption(''); }}>
                             <option value="">請選擇年月...</option>
                             {availableCompletedMonths.map(m => <option key={m} value={m}>{m}</option>)}
                         </select>
                         <select className="p-2 border-none rounded-xl text-base font-bold text-stone-600 outline-none bg-white shadow-sm max-w-[12rem] truncate" value={completedFilterLocAct} onChange={(e) => { setCompletedFilterLocAct(e.target.value); setCompletedFilterOption(''); }} disabled={!completedFilterMonth}>
                             <option value="">請選擇活動...</option>
                             {availableCompletedLocActs.map(la => <option key={la} value={la}>{la}</option>)}
                         </select>
                         <select className="p-2 border-none rounded-xl text-base font-bold text-stone-600 outline-none bg-white shadow-sm max-w-[10rem] truncate" value={completedFilterOption} onChange={(e) => setCompletedFilterOption(e.target.value)} disabled={!completedFilterLocAct}>
                             <option value="">全部行程</option>
                             {completedOptionChoices.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                         </select>
                     </div>
                 </ResponsiveHeader>

                 {/* Summary Table */}
                 <div className="bg-white rounded-3xl p-6 border border-stone-200 mb-10 overflow-hidden" id="completed-summary-table">
                     <div className="flex justify-between items-center mb-4 pl-2 border-l-4 border-[#4f093c]">
                         <h4 className="font-bold text-[#4f093c] text-xl">活動行程總表</h4>
                         <button onClick={() => downloadPDF('completed-summary-table', '活動行程總表')} className="bg-stone-100 text-stone-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-200 shadow-sm flex items-center gap-1 transition-colors">
                             <Download className="w-4 h-4"/> 匯出 (PDF)
                         </button>
                     </div>
                     {selectedCompletedHierarchy.length > 0 ? (
                         <div className="overflow-x-auto rounded-xl border border-stone-100">
                             <table className="w-full text-left text-sm" style={{ minWidth: '900px' }}>
                                 <thead className="bg-[#4f093c] text-white font-bold">
                                     <tr>
                                         <th className="p-4 w-[180px] whitespace-nowrap">地點 / 活動</th>
                                         <th className="p-4 whitespace-nowrap">行程</th>
                                         <th className="p-4 w-[150px] whitespace-nowrap">截止 / 結束日期</th>
                                         <th className="p-4 whitespace-nowrap">內容統計</th>
                                         <th className="p-4 text-center whitespace-nowrap">總人數</th>
                                         <th className="p-4 text-center whitespace-nowrap">義工</th>
                                         <th className="p-4 text-center whitespace-nowrap">法會</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {selectedCompletedHierarchy.map((item, idx) => (
                                         <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-stone-100'} hover:bg-stone-200 transition-colors`}>
                                             <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                                                 <div>{item.node.location}</div>
                                                 <div className="text-xs text-stone-500 mt-1">{item.node.activity}</div>
                                             </td>
                                             <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{item.node.option || '(無行程)'}</td>
                                             <td className="p-4 font-mono text-stone-500 text-xs whitespace-nowrap">
                                                 <div className="text-red-400">截止: {item.dates.dead || '-'}</div>
                                                 <div className="text-emerald-600 font-bold mt-1">結束: {item.dates.end}</div>
                                             </td>
                                             <td className="p-4 text-stone-600 text-xs font-bold whitespace-nowrap">{item.contentStats || '-'}</td>
                                             <td className="p-4 text-center font-bold text-lg text-slate-800 whitespace-nowrap">{item.counts.total}</td>
                                             <td className="p-4 text-center font-bold text-orange-600 whitespace-nowrap">{item.counts.vol}</td>
                                             <td className="p-4 text-center font-bold text-blue-600 whitespace-nowrap">{item.counts.dharma}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     ) : (
                         <div className="text-center py-10 text-stone-400 font-bold">請選擇上方篩選條件以檢視資料</div>
                     )}
                 </div>

                 {/* Detail Data Table */}
                 {selectedCompletedHierarchy.length > 0 && (
                     <div className="bg-white rounded-3xl p-6 border border-stone-200" id="completed-detail-table">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pl-2 border-l-4 border-[#4f093c] gap-4">
                             <h4 className="font-bold text-[#4f093c] text-xl break-words whitespace-pre-wrap">詳細報名資料列表</h4>
                             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                 <div className="relative flex-1 md:flex-none">
                                     <input type="text" placeholder="搜尋姓名/法名..." className="p-2 pl-8 border border-stone-200 rounded-lg text-sm font-bold text-stone-600 outline-none w-full md:w-48 focus:w-60 transition-all" value={completedSearch} onChange={e=>setCompletedSearch(e.target.value)} />
                                     <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"/>
                                 </div>
                                 <button onClick={() => downloadPDF('completed-detail-table', '詳細報名資料列表')} className="bg-stone-100 text-stone-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-200 shadow-sm flex items-center gap-1 transition-colors">
                                     <Download className="w-4 h-4"/> <span className="hidden md:inline">匯出 (PDF)</span><span className="md:hidden">PDF</span>
                                 </button>
                                 <button onClick={() => handleExport()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1">
                                     <FileSpreadsheet className="w-4 h-4"/> <span className="hidden md:inline">匯出 (Excel)</span><span className="md:hidden">Excel</span>
                                 </button>
                             </div>
                         </div>
                         
                         <div className="overflow-x-auto rounded-xl border border-stone-100">
                             <table className="w-full text-left text-sm table-fixed" style={{ minWidth: '1200px' }}>
                                 <thead className="bg-[#4f093c] text-white font-bold">
                                     <tr>
                                         <th className="p-3 w-[150px]">地點 / 活動</th>
                                         <th className="p-3 w-[120px]">行程</th>
                                         <th className="p-3 w-[180px]">姓名資料</th>
                                         <th className="p-3 w-[180px]">交通住宿</th>
                                         <th className="p-3 w-[180px]">義工資訊</th>
                                         <th className="p-3 w-[150px]">備註</th>
                                         <th className="p-3 w-[120px]">填表資訊</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-stone-100">
                                     {selectedCompletedNotes.map(n => {
                                         const rawContents: any = n.selected_contents;
                                         const safeContents = safeRenderContents(rawContents);
                                         
                                         return (
                                             <tr key={n.id} className="hover:bg-stone-50 transition-colors">
                                                 <td className="p-3 align-top font-bold text-slate-700">
                                                     <div>{n.activity_location}</div>
                                                     <div className="text-xs text-stone-500 mt-1">{n.activity_name}</div>
                                                 </td>
                                                 <td className="p-3 align-top font-bold text-blue-600">{n.activity_option}</td>
                                                 <td className="p-3 align-top">
                                                     <div className="font-bold text-slate-800 text-base">{n.real_name}</div>
                                                     <div className="text-stone-500 text-xs mt-1">{n.dharma_name ? `${n.dharma_name} / ` : ''}{n.gender} / {n.registrant_type}</div>
                                                     <div className="text-[#4f093c] font-bold text-xs mt-1">{n.identity}</div>
                                                 </td>
                                                 <td className="p-3 align-top text-xs text-stone-600">
                                                     <div className="font-bold">{n.transportation}</div>
                                                     {(n.arrival_datetime || n.departure_datetime) && <div className="mt-1">抵: {formatDateTime(n.arrival_datetime)?.split(' ')[1]}<br/>離: {formatDateTime(n.departure_datetime)?.split(' ')[1]}</div>}
                                                     <div className="mt-1 border-t border-stone-100 pt-1">{n.accommodation_option}</div>
                                                 </td>
                                                 <td className="p-3 align-top text-xs text-stone-600">
                                                     {n.identity === '發心義工' ? (
                                                         <>
                                                             <div className="font-bold">{simplifyVolunteerType(n.volunteer_type)}</div>
                                                             <div>{n.volunteer_group}</div>
                                                             {(n.start_date || n.end_date) && <div className="mt-1 text-stone-400">起: {formatDateTime(n.start_date)?.split(' ')[0]}<br/>迄: {formatDateTime(n.end_date)?.split(' ')[0]}</div>}
                                                         </>
                                                     ) : '-'}
                                                 </td>
                                                 <td className="p-3 align-top text-xs text-stone-600">
                                                     {safeContents.length > 0 && <div className="mb-1 text-orange-600 font-bold">{safeContents}</div>}
                                                     {n.other_remarks && <div className="mb-1">自訂: {String(n.other_remarks)}</div>}
                                                     {n.memo && <div className="italic text-stone-400">備註: {String(n.memo)}</div>}
                                                 </td>
                                                 <td className="p-3 align-top text-xs text-stone-400">
                                                     <div>{n.sign_name}</div>
                                                     <div>{formatDateTime(n.created_at)?.split(' ')[0]}</div>
                                                     <div className={`mt-1 font-bold ${n.registration_option === '新增' ? 'text-emerald-500' : 'text-amber-500'}`}>{n.registration_option}</div>
                                                 </td>
                                             </tr>
                                         );
                                     })}
                                     {selectedCompletedNotes.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-stone-400">此條件下無報名資料</td></tr>}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 )}
             </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
             <div className={`p-8 rounded-[32px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
                <ResponsiveHeader title="新增使用者">
                    <div className="relative">
                      <input type="text" placeholder="搜尋姓名/ID..." className="p-2 pl-8 border-none rounded-xl text-base font-bold text-stone-600 outline-none w-48 focus:w-64 transition-all bg-white shadow-sm" value={usersSearch} onChange={e=>setUsersSearch(e.target.value)} />
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"/>
                    </div>
                </ResponsiveHeader>
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                  <input className="flex-1 p-3 border rounded-xl text-lg" placeholder="姓名" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
                  <input className="w-32 p-3 border rounded-xl text-lg" placeholder="ID後4碼" value={newUser.id4} onChange={e=>setNewUser({...newUser, id4: e.target.value})} />
                  <input className="w-40 p-3 border rounded-xl text-lg" placeholder="密碼" value={newUser.pwd} onChange={e=>setNewUser({...newUser, pwd: e.target.value})} />
                  <button onClick={handleCreateUser} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-md shadow-blue-200">新增</button>
                </div>
             </div>
             
             <div className={`rounded-[32px] shadow-sm border border-stone-100 overflow-hidden`} style={{ backgroundColor: CARD_BG_COLOR }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-left" style={{ minWidth: '800px' }}>
                      <thead className="bg-[#4f093c] text-white font-bold border-b border-[#4f093c]">
                        <tr>
                          <th className="p-5">姓名</th>
                          <th className="p-5">ID後4碼</th>
                          <th className="p-5">備註</th>
                          <th className="p-5">是否為管理員</th>
                          <th className="p-5">是否刪除</th>
                          <th className="p-5">報名筆數</th>
                          <th className="p-5 text-right">是否停用</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredUsers.map(u => { 
                          const count = notes.filter(n => n.user_id === u.uid).length; 
                          return (
                            <tr key={u.id} className="hover:bg-stone-50/50">
                              <td className="p-5 font-bold text-[#4f093c]">{u.user_name}</td>
                              <td className="p-5 font-mono text-stone-400">{u.id_last4}</td>
                              <td className="p-5">
                                 <input 
                                    className="bg-transparent border-b border-dashed border-stone-300 focus:border-[#4f093c] outline-none text-stone-600 text-base w-full" 
                                    placeholder="新增備註..."
                                    defaultValue={u.memo || ''}
                                    onBlur={(e) => handleUpdateUserMemo(u.uid!, e.target.value)}
                                 />
                              </td>
                              <td className="p-5"><input type="checkbox" checked={u.is_admin} onChange={() => handleToggleAdmin(u.uid!, u.is_admin)} className="w-5 h-5 rounded border-stone-300 text-[#4f093c] focus:ring-[#4f093c]" /></td>
                              <td className="p-5"><span className={`px-2 py-1 rounded text-xs font-bold ${u.is_disabled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{u.is_disabled ? '已停用' : '正常'}</span></td>
                              <td className="p-5 font-bold text-stone-600 pl-8">{count}</td>
                              <td className="p-5 text-right"><input type="checkbox" checked={u.is_disabled} onChange={() => handleToggleUserStatus(u.uid!, u.is_disabled)} className="w-5 h-5 rounded border-stone-300 text-red-600 focus:ring-red-600" /></td>
                            </tr>
                          ); 
                        })}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-stone-400">找不到符合的使用者</td></tr>
                        )}
                      </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className={`p-8 rounded-[32px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
              <ResponsiveHeader title="審核中心">
                  <div className="relative">
                      <input type="text" placeholder="搜尋申請人..." className="p-2 pl-8 border-none rounded-xl text-base font-bold text-stone-600 outline-none w-48 focus:w-64 transition-all bg-white shadow-sm" value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} />
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400"/>
                  </div>
              </ResponsiveHeader>
              <p className="text-sm text-stone-500 mb-8">處理用戶的密碼重設申請</p>
              <div className="overflow-x-auto rounded-2xl border border-stone-100">
                <table className="w-full text-left text-sm bg-white" style={{ minWidth: '800px' }}>
                  <thead className="bg-[#4f093c] text-white font-bold">
                    <tr>
                      <th className="p-4">申請人姓名</th>
                      <th className="p-4">ID後4碼</th>
                      <th className="p-4">學員備註</th>
                      <th className="p-4">申請時間</th>
                      <th className="p-4">狀態</th>
                      <th className="p-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredAudits.map(r => {
                      const userMemo = allUsers.find(u => u.uid === r.uid)?.memo || '-';
                      return (
                      <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 font-bold text-lg text-slate-800">{r.user_name}</td>
                        <td className="p-4 font-mono text-stone-600">{r.id_last4}</td>
                        <td className="p-4 text-stone-500 italic">{userMemo}</td>
                        <td className="p-4 text-stone-500 font-mono text-xs">{formatDateTime(r.created_at)}</td>
                        <td className="p-4">
                           {r.status === 'pending' ? (<span className="text-amber-600 bg-amber-100 px-2 py-1 rounded text-xs font-bold">待審核</span>) : r.status === 'completed' ? (<span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded text-xs font-bold">已批准</span>) : (<span className="text-stone-600 bg-stone-200 px-2 py-1 rounded text-xs font-bold">已拒絕</span>)}
                        </td>
                        <td className="p-4 flex gap-2 justify-end">
                          {r.status === 'pending' && (
                            <>
                              <button onClick={()=>handleResetAction(r, 'approve')} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors">批准</button>
                              <button onClick={()=>handleResetAction(r, 'reject')} className="px-4 py-2 bg-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-300 transition-colors">拒絕</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )})}
                    {filteredAudits.length === 0 && (<tr><td colSpan={6} className="p-12 text-center text-stone-400 font-bold bg-white">目前無相關申請紀錄</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Admin Settings Tab (Reverted - Removed Completed List) */}
        {activeTab === 'admin_settings' && isAdmin && (
           <div className={`p-10 rounded-[40px] shadow-sm border border-stone-100`} style={{ backgroundColor: CARD_BG_COLOR }}>
              <ResponsiveHeader title="1、報名行程設定">
                 <button onClick={handlePublishSettings} className="bg-white text-[#4f093c] px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-stone-100 flex items-center gap-2 transition-all shrink-0">
                    <UploadCloud className="w-4 h-4" /> 發佈
                 </button>
              </ResponsiveHeader>
              
              <div className="mb-8">
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowCompletedSettings(!showCompletedSettings)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${showCompletedSettings ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white/20 text-[#4f093c] border-white/30 hover:bg-white/30'}`}
                    >
                        {showCompletedSettings ? <Unlock className="w-3 h-3"/> : <Lock className="w-3 h-3"/>}
                        {showCompletedSettings ? '已顯示圓滿行程 (可修改日期)' : '僅顯示進行中行程 (點此修改已圓滿日期)'}
                    </button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-3 h-auto lg:h-[600px]">
                 {/* Column 1: Location */}
                 <div className="flex flex-col bg-white/50 rounded-3xl border border-stone-100 overflow-hidden min-h-[500px] lg:min-h-0">
                    <div className="p-3 border-b border-[#4f093c] bg-[#4f093c] text-white"><h4 className="font-bold flex items-center gap-2">地點</h4></div>
                    
                    {/* 新增輸入框 (移至最上方) - p-2 */}
                    <div className="p-2 flex gap-2 border-b border-stone-100"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新地點..." value={newLocation} onChange={e=>setNewLocation(e.target.value)} /><button onClick={addLocation} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] shrink-0"><Plus/></button></div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {locations.map(l => (
                            <div key={l} onClick={()=>setMgmtSelectedLoc(l)} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${mgmtSelectedLoc === l ? 'bg-[#4f093c] text-white shadow-md' : 'hover:bg-stone-100 text-stone-600'}`}>
                                <span className="font-bold">{l}</span>
                                <button onClick={(e)=>{e.stopPropagation(); handleDeleteLocation(l)}} className="opacity-50 hover:opacity-100 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Column 2: Activity */}
                 <div className="flex flex-col bg-white/50 rounded-3xl border border-stone-100 overflow-hidden min-h-[500px] lg:min-h-0">
                    <div className="p-3 border-b border-[#4f093c] bg-[#4f093c] text-white"><h4 className="font-bold flex items-center gap-2">活動</h4></div>
                    
                    {/* 新增輸入框 (移至最上方) - p-2 */}
                    <div className="p-2 flex gap-2 border-b border-stone-100"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新活動..." disabled={!mgmtSelectedLoc} value={newActivity} onChange={e=>setNewActivity(e.target.value)} /><button onClick={addActivity} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50 shrink-0"><Plus/></button></div>

                    {/* Date Settings for Activity - slightly reduced padding */}
                    <div className="px-3 pt-3 pb-2 space-y-3 bg-white border-b border-stone-100">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-red-600 uppercase tracking-wider">截止報名</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedAct} value={currentActivityDates.dead || ''} onChange={(e) => handleUpdateActivityDate('activity_deadline', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-red-600 uppercase tracking-wider">圓滿結束</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedAct} value={currentActivityDates.end || ''} onChange={(e) => handleUpdateActivityDate('activity_end_date', e.target.value)} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {adminActivities.map(a => (
                            <div key={a} onClick={()=>setMgmtSelectedAct(a)} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${mgmtSelectedAct === a ? 'bg-[#4f093c] text-white shadow-md' : 'hover:bg-stone-100 text-stone-600'}`}>
                                <span className="font-bold text-sm">{a}</span>
                                <button onClick={(e)=>{e.stopPropagation(); handleDeleteActivity(a)}} className="opacity-50 hover:opacity-100 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Column 3: Option */}
                 <div className="flex flex-col bg-white/50 rounded-3xl border border-stone-100 overflow-hidden min-h-[500px] lg:min-h-0">
                    <div className="p-3 border-b border-[#4f093c] bg-[#4f093c] text-white"><h4 className="font-bold flex items-center gap-2">行程</h4></div>
                    
                    {/* 新增輸入框 - p-2 */}
                    <div className="p-2 flex gap-2 border-b border-stone-100"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新行程..." disabled={!mgmtSelectedAct} value={newOption} onChange={e=>setNewOption(e.target.value)} /><button onClick={addOption} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50 shrink-0"><Plus/></button></div>

                    {/* Date Settings for Option */}
                    <div className="px-3 pt-3 pb-2 space-y-3 bg-white border-b border-stone-100">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-red-600 uppercase tracking-wider">截止報名</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedOpt || !!currentActivityDates.dead} value={currentActivityDates.dead || currentOptionDates.dead || ''} onChange={(e) => handleUpdateOptionDate('option_deadline', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-red-600 uppercase tracking-wider">圓滿結束</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedOpt || !!currentActivityDates.end} value={currentActivityDates.end || currentOptionDates.end || ''} onChange={(e) => handleUpdateOptionDate('option_end_date', e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {adminOptions.map(o => (
                            <div key={o} onClick={()=>setMgmtSelectedOpt(o)} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${mgmtSelectedOpt === o ? 'bg-[#4f093c] text-white shadow-md' : 'hover:bg-stone-100 text-stone-600'}`}>
                                <span className="font-bold text-sm">{o}</span>
                                <button onClick={(e)=>{e.stopPropagation(); handleDeleteOption(o)}} className="opacity-50 hover:opacity-100 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Column 4: Content */}
                 <div className="flex flex-col bg-white/50 rounded-3xl border border-stone-100 overflow-hidden min-h-[500px] lg:min-h-0">
                    <div className="p-3 border-b border-[#4f093c] bg-[#4f093c] text-white"><h4 className="font-bold flex items-center gap-2">內容</h4></div>
                    
                    {/* 新增輸入框 - p-2 */}
                    <div className="p-2 flex gap-2 border-b border-stone-100"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新內容..." disabled={!mgmtSelectedOpt} value={newContent} onChange={e=>setNewContent(e.target.value)} /><button onClick={addContent} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50 shrink-0"><Plus/></button></div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {adminContents.map(c => (
                            <div key={c.id} className="p-3 bg-white rounded-xl shadow-sm border border-stone-100 flex justify-between items-center">
                                <span className="font-bold text-sm text-stone-600">{c.content}</span>
                                <button onClick={()=>handleDeleteContent(c.id)} className="text-stone-300 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
              
              <div className="mt-20">
                 <ResponsiveHeader title="2、欄位管理">
                    <div className="flex gap-2">
                        <button onClick={handlePublishSettings} className="bg-white text-[#4f093c] px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-stone-100 flex items-center gap-2 transition-all shrink-0">
                          <UploadCloud className="w-4 h-4" /> 發佈
                        </button>
                    </div>
                 </ResponsiveHeader>
                 <div className="overflow-x-auto rounded-[40px] border border-stone-100 shadow-sm">
                    <table className="w-full text-left text-sm bg-white" style={{ minWidth: '800px' }}>
                       <thead className="bg-[#4f093c] text-white font-bold border-b border-stone-200">
                          <tr>
                            <th className="p-6">欄位名稱 (Key)</th>
                            <th className="p-6">顯示標籤 (Label)</th>
                            <th className="p-6">類型 (Type)</th>
                            <th className="p-6">必填設定</th>
                            <th className="p-6">備註說明</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[#F2ECE4] text-slate-600 font-bold text-base">
                          {fieldConfigs.map((col) => (
                            <tr key={col.field_key} className="hover:bg-[#FAF9F6] transition-colors">
                              <td className="p-6 font-mono text-[#4f093c]">{col.field_key}</td>
                              <td className="p-6">{col.field_label}</td>
                              <td className="p-6 font-mono text-slate-400">{col.field_type}</td>
                              <td className="p-6">
                                <label className="flex items-center cursor-pointer">
                                  <input type="checkbox" checked={col.is_required} onChange={(e) => handleUpdateFieldConfig(col.field_key, 'is_required', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#4f093c] focus:ring-[#4f093c]" />
                                  <span className="ml-2 text-sm">{col.is_required ? '必填' : '選填'}</span>
                                </label>
                              </td>
                              <td className="p-6">
                                <input type="text" value={col.description || ''} onChange={(e) => handleUpdateFieldConfig(col.field_key, 'description', e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="備註..." />
                              </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* 修改密碼 Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#E8E2D1] flex flex-col gap-6 animate-in zoom-in-95 duration-200">
               <h3 className="text-xl font-bold text-[#4f093c] flex items-center gap-2">
                 <KeyRound className="w-6 h-6 text-amber-600"/> 修改當前密碼
               </h3>
               <div className="space-y-1">
                 <label className="text-sm font-bold text-gray-500 ml-1">請輸入新密碼 (至少6碼)</label>
                 <input 
                    type="password" 
                    placeholder="新密碼..." 
                    className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-gray-50"
                    value={newPwdVal}
                    onChange={e => setNewPwdVal(e.target.value)}
                 />
               </div>
               <div className="flex gap-3 mt-2">
                  <button onClick={handleChangePassword} disabled={loading} className="flex-1 bg-[#4f093c] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#3d072e] transition-all">
                    確認修改
                  </button>
                  <button onClick={() => { setShowPwdModal(false); setNewPwdVal(''); }} className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all">
                    取消
                  </button>
               </div>
            </div>
        </div>
      )}

      {/* 重設密碼成功通知 Modal */}
      {resetPwdResult && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#E8E2D1] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                   <CheckCircle2 className="w-8 h-8"/>
               </div>
               <h3 className="text-2xl font-bold text-[#4f093c]">密碼重設成功</h3>
               <p className="text-stone-500 text-center text-sm">
                 已成功為 <span className="font-bold text-slate-800">{resetPwdResult.user}</span> 重設密碼。<br/>請通知使用者使用以下新密碼登入：
               </p>
               <div className="bg-stone-100 px-6 py-4 rounded-xl w-full text-center border border-stone-200 shadow-inner">
                   <span className="text-4xl font-black text-blue-600 tracking-widest">{resetPwdResult.pwd}</span>
               </div>
               <button onClick={() => setResetPwdResult(null)} className="w-full mt-4 bg-[#4f093c] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#3d072e] transition-all">
                 關閉視窗
               </button>
            </div>
        </div>
      )}
    </div>
  );
}
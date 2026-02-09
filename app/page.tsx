"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Bell, FileText, History, Settings, Shield, LogOut, Plus, Trash2, Check, 
  Edit, User, MapPin, Tag, ListFilter, Save, Database, Clock, Car, Info, 
  Home, UserCheck, AlertCircle, Briefcase, Layers, 
  CheckCircle2, CheckSquare, FileSpreadsheet, Megaphone, ClipboardCheck, UserCog, Share2, Lock, Eye, EyeOff, Users, ArrowRight, RefreshCw, AlertTriangle, Image as ImageIcon, Table as TableIcon, Calendar, Filter, UploadCloud, ChevronRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

/**
 * 系統版本：v73.0 (介面視覺優化版)
 * 修正說明：
 * 1. [UI] 全面優化版面設計：採用卡片式佈局、更柔和的配色與間距。
 * 2. [UI] 設定頁：將層級管理改為固定高度的滾動區塊，視覺更整潔。
 * 3. [UI] 登記頁：增加區塊標題 (個人資料、活動資訊、後勤)，填寫引導更清晰。
 * 4. [System] 完整保留 v72.0 的所有邏輯 (權限截止、日期同步、防呆驗證)。
 */

// --- 主色系設定 ---
const PRIMARY_COLOR = "#4f093c"; 
const BG_COLOR = "#F9F8F6";
const CARD_BG = "white";

// --- 內嵌 Logo ---
const CustomLogo = ({ className }: { className?: string }) => (
  <img src="/logo.png" alt="Logo" className={`${className} rounded-full object-cover border-2 border-white shadow-sm`} />
);

// --- 型別定義 ---
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
  registrant_type: string;
  registration_option: string;
  activity_location: string;
  activity_name: string;
  activity_option: string;
  selected_contents: string[];
  other_remarks?: string;
  memo?: string;
  identity: string;
  volunteer_type?: string;
  transportation: string;
  arrival_datetime: string | null;
  departure_datetime: string | null;
  volunteer_group?: string;
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
}

interface ResetRequest {
  id: string;
  user_name: string;
  id_last4: string;
  uid?: string; 
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

// 欄位定義
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

declare global {
  interface Window {
    supabase: any;
  }
}

const FAKE_DOMAIN = "@my-notes.com";

// --- 輔助函式 ---
const encodeName = (name: string): string => {
  try { let hex = ''; for (let i = 0; i < name.length; i++) hex += ('0000' + name.charCodeAt(i).toString(16)).slice(-4); return hex; } catch { return name; }
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
    const d = new Date(isoString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return isoString || '-'; }
};

const renderBulletinContent = (content: string) => {
  const parts = content.split(/(\[img:.*?\])/);
  return parts.map((part, index) => {
    const match = part.match(/^\[img:(.*?)\]$/);
    if (match) {
      return <img key={index} src={match[1]} alt="公告圖片" className="max-w-full h-auto rounded-lg my-3 shadow-md border border-stone-200" />;
    }
    return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
  });
};

const INITIAL_FORM_DATA = {
  real_name: '', dharma_name: '', registrant_type: '目前上禪修班學員', registration_option: '新增',
  activity_location: '', activity_name: '', activity_option: '',
  selected_contents: [] as string[], 
  other_remarks: '', memo: '',
  identity: '參加法會', 
  volunteer_type: '一般義工-由精舍安排組別', transportation: '',
  arrival_datetime: '', departure_datetime: '', volunteer_group: '', 
  start_date: '', end_date: '', accommodation_option: '不安單', 
  stay_start_date: '', stay_end_date: ''
};

const getLocalTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTodayDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function App() {
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMock, setIsMock] = useState<boolean>(true);
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
  
  const [todayDate, setTodayDate] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [historyFilterLoc, setHistoryFilterLoc] = useState<string>('');
  const [filterLoc, setFilterLoc] = useState<string>('');
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [newBulletin, setNewBulletin] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newActivity, setNewActivity] = useState<string>('');
  const [newOption, setNewOption] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  
  const [mgmtSelectedLoc, setMgmtSelectedLoc] = useState<string>('');
  const [mgmtSelectedAct, setMgmtSelectedAct] = useState<string>('');
  const [mgmtSelectedOpt, setMgmtSelectedOpt] = useState<string>('');
  
  const [newUser, setNewUser] = useState({ name: '', id4: '', pwd: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTodayDate(getLocalTodayDate());
    setCurrentDateTime(getLocalTodayDateTime());

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
            setIsMock(false);
          } catch (err) { setIsMock(true); }
        } else { setIsMock(true); }
        setLoading(false);
      };
      script.onerror = () => { setIsMock(true); setLoading(false); };
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
    if (isMock) { 
      setBulletins([{ id: '1', content: "🎉 歡迎使用 (展示模式)", created_at: new Date().toISOString() }]);
      setHierarchyData([{ id: '1', location: "中台", activity: "禪修", option: "一般", content: null }]);
      return; 
    }
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
    } catch (err) { }
  }, [supabaseClient, isMock, fetchFieldConfigs]);

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

  const handleAuthAction = async () => {
    if (!username || !idLast4) return alert('請輸入姓名與 ID 後四碼');
    if (!supabaseClient && !isMock) return alert('系統未連線至資料庫');
    setLoading(true);
    const email = encodeName(username + idLast4) + FAKE_DOMAIN;
    const finalIdLast4 = idLast4.trim();
    const finalUsername = username.trim();

    try {
        if (authMode === 'login') {
            if (!password) { setLoading(false); return alert('請輸入密碼'); }
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setUser(data.user);
            setFormData(prev => ({ ...prev, real_name: username }));
        } else if (authMode === 'signup') {
            if (!password) { setLoading(false); return alert('請設定密碼'); }
            if(!confirm(`確認註冊資料：\n姓名：${finalUsername}\nID後4碼：${finalIdLast4}\n\n請確認無誤後送出。`)) { setLoading(false); return; }
            
            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { user_name: finalUsername, id_last4: finalIdLast4, full_name: finalUsername } }
            });
            if (error) throw error;
            if (data.user) {
                alert(`註冊成功！系統將自動建立資料。`);
                if (data.session) {
                    setUser(data.user);
                    setFormData(prev => ({ ...prev, real_name: finalUsername }));
                } else { alert('請檢查信箱並點擊驗證連結。'); }
            }
        } else if (authMode === 'forgot') {
            const { error } = await supabaseClient.from('reset_requests').insert([{
                user_name: finalUsername, id_last4: finalIdLast4, status: 'pending', created_at: new Date().toISOString()
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

  const locations = useMemo(() => [...new Set(hierarchyData.map(h => h.location).filter(Boolean))].sort(), [hierarchyData]);
  const availableActivities = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === formData.activity_location && h.activity).map(h => h.activity as string))].sort(), [hierarchyData, formData.activity_location]);
  const availableOptions = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option).map(h => h.option as string))].sort(), [hierarchyData, formData.activity_location, formData.activity_name]);
  const availableContents = useMemo(() => hierarchyData.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option === formData.activity_option && h.content).map(h => h.content as string).sort(), [hierarchyData, formData.activity_location, formData.activity_name, formData.activity_option]);

  // 管理後台專用聯動
  const adminActivities = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === mgmtSelectedLoc && h.activity).map(h => h.activity as string))].sort(), [hierarchyData, mgmtSelectedLoc]);
  const adminOptions = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option).map(h => h.option as string))].sort(), [hierarchyData, mgmtSelectedLoc, mgmtSelectedAct]);
  const adminContents = useMemo(() => hierarchyData.filter(h => h.location === mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option === mgmtSelectedOpt && h.content), [hierarchyData, mgmtSelectedLoc, mgmtSelectedAct, mgmtSelectedOpt]);

  const filteredTransportOptions = useMemo(() => {
    const all = ["大車-精舍統一行程", "小車-自訂抵離寺", "自行前往-自訂抵離寺"];
    if (formData.activity_option && formData.activity_option.includes('自訂行程')) {
        const customOptions = all.filter(o => !o.includes("大車"));
        customOptions.push("其他-自訂抵離寺");
        return customOptions;
    }
    return all;
  }, [formData.activity_option]);

  useEffect(() => {
    const hasLargeBus = filteredTransportOptions.some(o => o.includes("大車"));
    setFormData(prev => ({ ...prev, transportation: hasLargeBus ? "大車-精舍統一行程" : "小車-自訂抵離寺" }));
  }, [filteredTransportOptions]);

  // 日期同步邏輯
  useEffect(() => { 
      if (formData.arrival_datetime) {
          const fullDateTime = formData.arrival_datetime;
          const dateOnly = formData.arrival_datetime.split('T')[0];
          setFormData(p => ({ 
              ...p, 
              start_date: p.start_date ? p.start_date : fullDateTime,
              stay_start_date: p.stay_start_date ? p.stay_start_date : dateOnly 
          }));
      }
  }, [formData.arrival_datetime]);
  
  useEffect(() => { 
      if (formData.departure_datetime) {
          const fullDateTime = formData.departure_datetime;
          const dateOnly = formData.departure_datetime.split('T')[0];
          setFormData(p => ({ 
              ...p, 
              end_date: p.end_date ? p.end_date : fullDateTime,
              stay_end_date: p.stay_end_date ? p.stay_end_date : dateOnly 
          }));
      }
  }, [formData.departure_datetime]);

  // 欄位顯示邏輯
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

  const getFieldConfig = (key: string) => fieldConfigs.find(f => f.field_key === key) || { is_required: false, field_label: key };

  // 取得目前活動或行程的結束/截止日期
  const getHierarchyDates = (loc: string, act: string, opt: string) => {
      const optionNode = hierarchyData.find(h => h.location === loc && h.activity === act && h.option === opt);
      const activityNode = hierarchyData.find(h => h.location === loc && h.activity === act && h.activity_end_date);
      
      const endDate = optionNode?.option_end_date || activityNode?.activity_end_date || null;
      const deadline = optionNode?.option_deadline || activityNode?.activity_deadline || null;
      
      return { endDate, deadline };
  };

  // 檢查是否報名截止或已圓滿
  const getRestrictionStatus = useCallback((loc: string, act: string, opt: string) => {
      const { endDate, deadline } = getHierarchyDates(loc, act, opt);
      
      const isEnded = endDate ? todayDate > endDate : false;
      const isDeadlined = deadline ? todayDate > deadline : false;
      
      return { isEnded, isDeadlined };
  }, [hierarchyData, todayDate]);

  const isCurrentSelectionExpired = useMemo(() => {
      const status = getRestrictionStatus(formData.activity_location, formData.activity_name, formData.activity_option);
      if (status.isEnded) return true;
      if (status.isDeadlined) return !isAdmin;
      return false;
  }, [formData, getRestrictionStatus, isAdmin]);

  // 驗證邏輯
  const validateForm = () => {
    const status = getRestrictionStatus(formData.activity_location, formData.activity_name, formData.activity_option);
    if (status.isEnded) { alert("此行程已圓滿結束，無法報名"); return false; }
    if (status.isDeadlined && !isAdmin) { alert("此行程已截止報名"); return false; }

    for (const config of fieldConfigs) {
      if (config.is_required) {
        if (config.field_key === 'transportation' && !fieldVisibility.transportation) continue;
        if (config.field_key === 'volunteer_group' && !fieldVisibility.volunteerGroup) continue;
        if (config.field_key === 'volunteer_type' && !fieldVisibility.volunteerType) continue;
        
        if (['start_date', 'end_date'].includes(config.field_key) && !fieldVisibility.volunteerDates) continue;
        if (['arrival_datetime', 'departure_datetime'].includes(config.field_key) && !fieldVisibility.arrivalDeparture) continue;
        if (['stay_start_date', 'stay_end_date'].includes(config.field_key) && !fieldVisibility.accommodationDates) continue;
        
        const val = formData[config.field_key as keyof typeof formData];
        if (!val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
           alert(`請檢查必填項目：${config.field_label}`);
           return false;
        }
      }
      
      // 強制檢查可見的日期欄位
      if (fieldVisibility.volunteerDates && ['start_date', 'end_date'].includes(config.field_key) && !formData[config.field_key as keyof typeof formData]) {
          alert(`請填寫：${config.field_label}`); return false;
      }
      if (fieldVisibility.arrivalDeparture && ['arrival_datetime', 'departure_datetime'].includes(config.field_key) && !formData[config.field_key as keyof typeof formData]) {
          alert(`請填寫：${config.field_label}`); return false;
      }
      if (fieldVisibility.accommodationDates && ['stay_start_date', 'stay_end_date'].includes(config.field_key) && !formData[config.field_key as keyof typeof formData]) {
          alert(`請填寫：${config.field_label}`); return false;
      }
    }
    return true;
  };

  const sanitizeDate = (dateStr: string | null | undefined) => (dateStr && dateStr.trim() !== '') ? dateStr : null;

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
    if (!fieldVisibility.accommodation) { 
        finalData.accommodation_option = ''; 
        finalData.stay_start_date = ''; 
        finalData.stay_end_date = ''; 
    } else if (!fieldVisibility.accommodationDates) {
        finalData.stay_start_date = '';
        finalData.stay_end_date = '';
    }

    const payload = { 
        ...finalData, 
        user_id: user?.id, 
        audit_status: '免審核',
        is_deleted: false, 
        created_at: new Date().toISOString(),
        start_date: sanitizeDate(finalData.start_date),
        end_date: sanitizeDate(finalData.end_date),
        stay_start_date: sanitizeDate(finalData.stay_start_date),
        stay_end_date: sanitizeDate(finalData.stay_end_date),
        arrival_datetime: sanitizeDate(finalData.arrival_datetime),
        departure_datetime: sanitizeDate(finalData.departure_datetime),
        sign_name: signName, 
        id_2: id2            
    };

    if (!supabaseClient) return alert('系統未連線');
    
    const { audit_status, ...finalPayload } = payload as any;

    const { error } = await supabaseClient.from('notes').insert([finalPayload]);
    if (error) { 
        console.error("Submit error:", error);
        alert('提交失敗: ' + error.message); 
    } else { 
        alert('已送出申請'); 
        setFormData(INITIAL_FORM_DATA); 
        await fetchData();
        setActiveTab('history'); 
    }
  };

  const handleToggleDeleteNote = async (id: string, status: boolean) => {
    if (!supabaseClient) return;
    await supabaseClient.from('notes').update({ is_deleted: !status }).eq('id', id);
    fetchData();
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
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setNewBulletin(prev => prev + `\n[img:${base64}]`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  const addLocation = async () => {
    if(!newLocation || !supabaseClient) return;
    const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: newLocation, activity: null, option: null, content: null }]);
    if (error) alert("新增失敗：" + error.message); else { setNewLocation(''); fetchData(); }
  };
  const addActivity = async () => {
    if(!newActivity || !mgmtSelectedLoc || !supabaseClient) return;
    const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: newActivity, option: null, content: null }]);
    if (error) alert("新增失敗：" + error.message); else { setNewActivity(''); fetchData(); }
  };
  const addOption = async () => {
    if(!newOption || !mgmtSelectedAct || !supabaseClient) return;
    const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: mgmtSelectedAct, option: newOption, content: null }]);
    if (error) alert("新增失敗：" + error.message); else { setNewOption(''); fetchData(); }
  };
  const addContent = async () => {
    if(!newContent || !mgmtSelectedOpt || !supabaseClient) return;
    const { error } = await supabaseClient.from('activity_hierarchy').insert([{ location: mgmtSelectedLoc, activity: mgmtSelectedAct, option: mgmtSelectedOpt, content: newContent }]);
    if (error) alert("新增失敗：" + error.message); else { setNewContent(''); fetchData(); }
  };

  const handleDeleteLocation = async (loc: string) => {
    if (!supabaseClient) return;
    if (confirm(`確定刪除地點「${loc}」及其所有下層資料？`)) {
       await supabaseClient.from('activity_hierarchy').delete().eq('location', loc);
       fetchData();
       setMgmtSelectedLoc('');
    }
  };

  const handleDeleteActivity = async (act: string) => {
    if (!supabaseClient) return;
    if (confirm(`確定刪除活動「${act}」及其所有下層資料？`)) {
       await supabaseClient.from('activity_hierarchy').delete().eq('location', mgmtSelectedLoc).eq('activity', act);
       fetchData();
       setMgmtSelectedAct('');
    }
  };

  const handleDeleteOption = async (opt: string) => {
    if (!supabaseClient) return;
    if (confirm(`確定刪除行程「${opt}」及其所有下層資料？`)) {
       await supabaseClient.from('activity_hierarchy').delete().eq('location', mgmtSelectedLoc).eq('activity', mgmtSelectedAct).eq('option', opt);
       fetchData();
       setMgmtSelectedOpt('');
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!supabaseClient) return;
    if (confirm('確定刪除此內容？')) {
       await supabaseClient.from('activity_hierarchy').delete().eq('id', id);
       fetchData();
    }
  };
  
  const handleExport = () => {
    const headers = "姓名,地點,活動,行程,勾選內容,身分,交通,時間";
    const rows = notes.map(n => `"${n.real_name}","${n.activity_location}","${n.activity_name}","${n.activity_option}","${n.selected_contents?.join(';') || ''}","${n.identity}","${n.transportation}","${n.created_at}"`);
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `學員登記表.csv`;
    link.click();
  };

  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
    if (!supabaseClient) return;
    await supabaseClient.from('user_permissions').update({ is_disabled: !currentStatus }).eq('uid', uid);
    fetchData();
  };

  const handleToggleAdmin = async (uid: string, currentStatus: boolean) => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('user_permissions').update({ is_admin: !currentStatus }).eq('uid', uid);
    if (error) alert("更新失敗：" + error.message); else fetchData();
  };

  const handleResetAction = async (id: string, action: 'approve' | 'reject') => {
    if (!supabaseClient) return;
    const status = action === 'approve' ? 'completed' : 'rejected';
    await supabaseClient.from('reset_requests').update({ status }).eq('id', id);
    if (action === 'approve') alert("已批准。請手動通知用戶新密碼。");
    fetchData();
  };

  const handleCreateUser = async () => {
    if (isMock) {
       setAllUsers(p => [{ id: String(Date.now()), email: 'new@test.com', user_name: newUser.name, id_last4: newUser.id4, is_admin: false, is_disabled: false }, ...p]);
       setNewUser({name:'', id4:'', pwd:''});
       return;
    }
    alert('需串接後端 Supabase Admin API 來建立 Auth 用戶');
  };

  // 在 Admin 設定頁使用的功能 (更新日期設定)
  const handleUpdateActivityDate = async (field: 'activity_end_date' | 'activity_deadline', val: string) => {
    if (!supabaseClient || !mgmtSelectedLoc || !mgmtSelectedAct) return;
    const { error } = await supabaseClient.from('activity_hierarchy')
        .update({ [field]: val })
        .eq('location', mgmtSelectedLoc)
        .eq('activity', mgmtSelectedAct);
    if(error) console.error(error);
  };

  const handleUpdateOptionDate = async (field: 'option_end_date' | 'option_deadline', val: string) => {
    if (!supabaseClient || !mgmtSelectedLoc || !mgmtSelectedAct || !mgmtSelectedOpt) return;
    const { error } = await supabaseClient.from('activity_hierarchy')
        .update({ [field]: val })
        .eq('location', mgmtSelectedLoc)
        .eq('activity', mgmtSelectedAct)
        .eq('option', mgmtSelectedOpt);
    if(error) console.error(error);
  };

  const handlePublishSettings = () => {
      alert("設定已發佈！前台表單選項已更新。");
      fetchData();
  };

  const handleUpdateFieldConfig = async (key: string, field: string, value: any) => {
    if (!supabaseClient) return;
    setFieldConfigs(prev => prev.map(f => f.field_key === key ? { ...f, [field]: value } : f));
    const current = fieldConfigs.find(f => f.field_key === key);
    if (current) {
        await supabaseClient.from('field_definitions').upsert({
            ...current,
            [field]: value
        }, { onConflict: 'field_key' });
    }
  };

  // 排序邏輯
  const sortedHistoryNotes = useMemo(() => {
      let filtered = notes.filter(n => n.user_id === user?.id);
      if (historyFilterLoc) filtered = filtered.filter(n => n.activity_location === historyFilterLoc);
      
      return filtered.sort((a, b) => {
          const statusA = getRestrictionStatus(a.activity_location, a.activity_name, a.activity_option);
          const statusB = getRestrictionStatus(b.activity_location, b.activity_name, b.activity_option);

          const aIsExpired = statusA.isEnded;
          const bIsExpired = statusB.isEnded;

          const aIsDeleted = a.is_deleted;
          const bIsDeleted = b.is_deleted;
          
          if (aIsDeleted !== bIsDeleted) return aIsDeleted ? 1 : -1;
          if (aIsExpired !== bIsExpired) return aIsExpired ? 1 : -1;
          
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
      });
  }, [notes, user, historyFilterLoc, todayDate, hierarchyData]);

  // 輔助函式：判斷卡片狀態
  const getCardStatus = (note: Note) => {
      if (note.is_deleted) return { text: '刪除', color: 'bg-red-500', isInactive: true };
      
      const { isEnded } = getRestrictionStatus(note.activity_location, note.activity_name, note.activity_option);
      
      if (isEnded) {
          return { text: '已圓滿', color: 'bg-stone-400', isInactive: true };
      }
      
      return { 
        text: note.registration_option, 
        color: note.registration_option === '新增' ? 'bg-emerald-600' : 'bg-amber-600',
        isInactive: false 
      };
  };

  // 取得目前選中活動的日期設定
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

  // 修改：活動與行程下拉選單的顯示邏輯 (加上狀態)
  const renderActivityOptions = () => {
      return availableActivities.map(a => {
         const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, a, '');
         let label = '(可報名)';
         if (isEnded) label = '(已圓滿)';
         else if (isDeadlined) {
             label = isAdmin ? '(已截止-管理員可報)' : '(已截止)';
         }
         
         const isDisabled = isEnded || (isDeadlined && !isAdmin);
         return <option key={a} value={a} disabled={isDisabled}>{a} {label}</option>;
      });
  };

  const renderOptionOptions = () => {
      return availableOptions.map(o => {
         const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, formData.activity_name, o);
         let label = '(可報名)';
         if (isEnded) label = '(已圓滿)';
         else if (isDeadlined) {
             label = isAdmin ? '(已截止-管理員可報)' : '(已截止)';
         }
         
         const isDisabled = isEnded || (isDeadlined && !isAdmin);
         return <option key={o} value={o} disabled={isDisabled}>{o} {label}</option>;
      });
  };

  const filteredAdminNotes = useMemo(() => {
    return notes.filter(n => (!filterLoc || n.activity_location === filterLoc));
  }, [notes, filterLoc]);

  // 按鈕顯示邏輯
  const getSubmitButtonStatus = () => {
      const { isEnded, isDeadlined } = getRestrictionStatus(formData.activity_location, formData.activity_name, formData.activity_option);
      if (isEnded) return { disabled: true, text: '已圓滿 (無法報名)' };
      if (isDeadlined) {
          return isAdmin ? { disabled: false, text: '確認送出 (管理員權限)' } : { disabled: true, text: '已截止報名' };
      }
      return { disabled: false, text: '確認送出' };
  };
  
  const submitStatus = getSubmitButtonStatus();

  if (loading) return <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center font-black text-[#4f093c] text-4xl animate-pulse">學員登記系統 加載中...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#E8E2D1] flex flex-col gap-6">
          <div className="text-center">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner overflow-hidden border-4 border-[#F2ECE4]">
                <CustomLogo className="w-16 h-16" />
             </div>
             <h2 className="text-xl font-bold text-[#4f093c] mb-2">學員登記系統</h2>
             <p className="text-sm text-slate-400 font-bold">{authMode === 'login' ? '會員登入' : authMode === 'signup' ? '註冊新帳號' : '密碼重設申請'}</p>
          </div>
          
          <div className="space-y-4">
             <div><label className="text-xs font-bold text-slate-400 ml-1">姓名</label><input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20" value={username} onChange={e=>setUsername(e.target.value)} /></div>
             <div><label className="text-xs font-bold text-slate-400 ml-1">ID後四碼</label><input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20" placeholder="如：1234" maxLength={4} value={idLast4} onChange={e=>setIdLast4(e.target.value)} /></div>
             {authMode !== 'forgot' && (<div><label className="text-xs font-bold text-slate-400 ml-1">密碼</label><input className="w-full p-2 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>)}
          </div>

          <button onClick={handleAuthAction} className="w-full bg-[#4f093c] hover:bg-[#3d072e] text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
             {authMode === 'login' ? '登入系統' : authMode === 'signup' ? '立即註冊' : '送出申請'} <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="flex justify-between text-xs text-slate-400 font-bold px-1 pt-2 border-t border-slate-100">
             {authMode === 'login' ? (<><button onClick={()=>setAuthMode('signup')} className="hover:text-[#4f093c]">沒有帳號？註冊</button><button onClick={()=>setAuthMode('forgot')} className="hover:text-[#4f093c]">忘記密碼？</button></>) : (<button onClick={()=>setAuthMode('login')} className="w-full text-center hover:text-[#4f093c]">返回登入</button>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-slate-800 font-sans text-xl">
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-stone-200 px-8 py-3 flex justify-between items-center">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm"><CustomLogo className="w-full h-full object-cover" /></div>
            <span className="font-bold text-xl text-[#4f093c] tracking-wide">嗨～ {getDisplayNameOnly(user?.email)}</span>
            {isAdmin && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold border border-amber-200">管理者</span>}
         </div>
         <button onClick={handleLogout} className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-5 py-2 rounded-xl font-bold text-sm transition-colors">登出</button>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex p-1 bg-stone-200/50 rounded-2xl mx-auto max-w-4xl mb-10 shadow-inner">
           {[{ id: 'bulletin', icon: <Bell className="w-5 h-5"/>, label: '公告' }, { id: 'form', icon: <Edit className="w-5 h-5"/>, label: '登記' }, { id: 'history', icon: <History className="w-5 h-5"/>, label: '紀錄' }, { id: 'users', icon: <Users className="w-5 h-5"/>, label: '用戶', admin: true }, { id: 'audit', icon: <ClipboardCheck className="w-5 h-5"/>, label: '審核', admin: true }, { id: 'admin_data', icon: <FileSpreadsheet className="w-5 h-5"/>, label: '資料', admin: true }, { id: 'admin_settings', icon: <Settings className="w-5 h-5"/>, label: '設定', admin: true }].map((tab) => (
             (!tab.admin || isAdmin) && <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${activeTab === tab.id ? 'bg-white text-[#4f093c] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{tab.icon}{tab.label}</button>
           ))}
        </div>

        {activeTab === 'bulletin' && (
          <div className="space-y-8 animate-in fade-in">
             {isAdmin && (
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 mb-8">
                  <h4 className="font-bold text-[#4f093c] mb-4 flex items-center gap-2 text-lg"><Megaphone className="w-5 h-5"/> 公告發布</h4>
                  <div className="flex gap-3 items-start">
                     <textarea className="flex-1 p-3 border border-stone-200 rounded-xl text-lg bg-stone-50 outline-none focus:ring-2 focus:ring-[#4f093c]/20" rows={2} placeholder="輸入公告內容..." value={newBulletin} onChange={e=>setNewBulletin(e.target.value)} />
                     <div className="flex flex-col gap-2">
                        <input type="file" ref={fileInputRef} accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
                        <button onClick={handleSelectImage} className="bg-stone-100 text-stone-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-200 flex items-center justify-center gap-1"><ImageIcon className="w-4 h-4"/> 圖片</button>
                        <button onClick={handleAddBulletin} className="bg-[#4f093c] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-[#3d072e] flex items-center justify-center gap-1 shadow-md shadow-[#4f093c]/20">發布</button>
                     </div>
                  </div>
               </div>
             )}
             {bulletins.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-2 h-full bg-[#4f093c]"></div>
                   <div className="text-2xl font-bold text-slate-800 leading-relaxed pl-4">{renderBulletinContent(b.content)}</div>
                   <div className="mt-6 text-sm text-stone-400 font-mono flex items-center gap-2 pl-4"><Clock className="w-4 h-4"/> {formatDateTime(b.created_at)}</div>
                   {isAdmin && <button onClick={()=>handleDeleteBulletin(b.id)} className="absolute top-6 right-6 text-stone-300 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5"/></button>}
                </div>
             ))}
          </div>
        )}

        {activeTab === 'form' && (
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-lg border border-stone-100 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-3 border-b border-stone-100 pb-6 mb-8">
                <div className="w-12 h-12 bg-[#4f093c]/10 rounded-2xl flex items-center justify-center text-[#4f093c]"><Edit className="w-6 h-6" /></div>
                <h3 className="text-2xl font-bold text-slate-800">發心登記表</h3>
             </div>
             
             {submitStatus.disabled && (
                 <div className={`mb-8 p-4 border-l-4 font-bold rounded-r-xl flex items-center gap-3 ${submitStatus.text.includes('已圓滿') ? 'bg-stone-100 border-stone-500 text-stone-600' : 'bg-red-50 border-red-500 text-red-700'}`}>
                     <AlertTriangle className="w-5 h-5"/> {submitStatus.text}
                 </div>
             )}

             <div className="space-y-10">
                 {/* Section 1: 個人資料 */}
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold text-[#4f093c] tracking-widest uppercase border-b border-stone-100 pb-2 mb-4">基本資料</h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-4 space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">姓名*</label><input className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-stone-50/50" value={formData.real_name} onChange={e=>setFormData({...formData, real_name: e.target.value})} /></div>
                        <div className="md:col-span-4 space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">法名</label><input className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-stone-50/50" value={formData.dharma_name} onChange={e=>setFormData({...formData, dharma_name: e.target.value})} /></div>
                        <div className="md:col-span-4 space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">報名選項*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-stone-50/50" value={formData.registration_option} onChange={e=>setFormData({...formData, registration_option: e.target.value})}><option value="新增">新增</option><option value="異動">異動</option></select></div>
                        <div className="md:col-span-12 space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">屬性*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-stone-50/50" value={formData.registrant_type} onChange={e=>setFormData({...formData, registrant_type: e.target.value})}><option value="目前上禪修班學員">目前上禪修班學員</option><option value="曾經上禪修班學員">曾經上禪修班學員</option><option value="學員家人">學員家人</option></select></div>
                    </div>
                 </div>

                 {/* Section 2: 活動資訊 */}
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold text-[#4f093c] tracking-widest uppercase border-b border-stone-100 pb-2 mb-4">活動資訊</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">1. 地點*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" value={formData.activity_location} onChange={e=>setFormData({...formData, activity_location: e.target.value, activity_name: '', activity_option: '', selected_contents: []})}><option value="">請選擇地點</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">2. 活動*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" disabled={!formData.activity_location} value={formData.activity_name} onChange={e=>setFormData({...formData, activity_name: e.target.value, activity_option: '', selected_contents: []})}><option value="">請選擇活動</option>{renderActivityOptions()}</select></div>
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">3. 行程*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#4f093c]/20 bg-white" disabled={!formData.activity_name} value={formData.activity_option} onChange={e=>setFormData({...formData, activity_option: e.target.value, selected_contents: []})}><option value="">請選擇行程</option>{renderOptionOptions()}</select></div>
                    </div>
                    
                    {availableContents.length > 0 && <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200"><label className="text-sm font-bold text-slate-500 block mb-3">4. 行程內容複選</label><div className="flex flex-wrap gap-3">{availableContents.map(c => <button key={c} type="button" onClick={() => setFormData(p => ({ ...p, selected_contents: p.selected_contents.includes(c) ? p.selected_contents.filter(i => i !== c) : [...p.selected_contents, c] }))} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-all ${formData.selected_contents.includes(c) ? 'bg-[#4f093c] text-white border-[#4f093c]' : 'bg-white text-stone-600 border-stone-300 hover:border-[#4f093c]'}`}>{c}</button>)}</div></div>}
                    
                    {formData.activity_option.includes('自訂') && <div className="space-y-2"><label className="text-sm font-bold text-orange-600 ml-1">自訂備註*</label><textarea rows={2} className="w-full p-3 text-lg border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-200 bg-orange-50/30" value={formData.other_remarks} onChange={e=>setFormData({...formData, other_remarks: e.target.value})} /></div>}
                 </div>

                 {/* Section 3: 後勤資訊 */}
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold text-[#4f093c] tracking-widest uppercase border-b border-stone-100 pb-2 mb-4">後勤資訊</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">身分*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl bg-white" value={formData.identity} onChange={e=>setFormData({...formData, identity: e.target.value})}><option value="">請選擇</option><option value="參加法會">參加法會</option><option value="發心義工">發心義工</option></select></div>
                        {fieldVisibility.transportation && <div className="space-y-2"><label className="text-sm font-bold text-slate-500 ml-1">交通*</label><select className="w-full p-3 text-lg font-bold border border-stone-200 rounded-xl bg-white" value={formData.transportation} onChange={e=>setFormData({...formData, transportation: e.target.value})}><option value="">請選擇</option>{filteredTransportOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>}
                    </div>

                    {fieldVisibility.arrivalDeparture && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100"><div className="space-y-2"><label className="text-sm font-bold text-blue-800 ml-1">抵寺時間*</label><input type="datetime-local" min={currentDateTime} className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white" value={formData.arrival_datetime || ''} onChange={e=>setFormData({...formData, arrival_datetime: e.target.value})} /></div><div className="space-y-2"><label className="text-sm font-bold text-blue-800 ml-1">離寺時間*</label><input type="datetime-local" min={formData.arrival_datetime || currentDateTime} className="w-full p-3 text-lg border border-blue-200 rounded-xl bg-white" value={formData.departure_datetime || ''} onChange={e=>setFormData({...formData, departure_datetime: e.target.value})} /></div></div>}
                    
                    {fieldVisibility.volunteerGroup && <div className="space-y-2"><label className="text-sm font-bold text-[#4f093c] ml-1">義工組別*</label><input className="w-full p-3 text-lg border border-stone-200 rounded-xl" value={formData.volunteer_group} onChange={e=>setFormData({...formData, volunteer_group: e.target.value})} /></div>}
                    {fieldVisibility.volunteerType && <div className="space-y-2"><label className="text-sm font-bold text-[#4f093c] ml-1">義工選項*</label><select className="w-full p-3 text-lg border border-stone-200 rounded-xl" value={formData.volunteer_type} onChange={e=>setFormData({...formData, volunteer_type: e.target.value})}><option value="">請選擇</option><option value="一般義工-由精舍安排組別">一般義工-由精舍安排組別</option><option value="長期義工-已於平台報名">長期義工-已於平台報名</option><option value="佛巡-已於平台報名">佛巡-已於平台報名</option></select></div>}
                    
                    {fieldVisibility.volunteerDates && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-stone-100 rounded-2xl"><div className="space-y-1"><label className="text-xs font-bold text-stone-500">發心開始</label><input type="datetime-local" min={currentDateTime} className="w-full p-2 text-sm border rounded-lg" value={formData.start_date || ''} onChange={e=>setFormData({...formData, start_date: e.target.value})} /></div><div className="space-y-1"><label className="text-xs font-bold text-stone-500">發心結束</label><input type="datetime-local" min={formData.start_date || currentDateTime} className="w-full p-2 text-sm border rounded-lg" value={formData.end_date || ''} onChange={e=>setFormData({...formData, end_date: e.target.value})} /></div></div>}
                    
                    {fieldVisibility.accommodation && (
                       <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                          <div className="space-y-2"><label className="text-sm font-bold text-slate-700">安單選項</label><select className="w-full p-3 text-lg border rounded-xl bg-white" value={formData.accommodation_option} onChange={e=>setFormData({...formData, accommodation_option: e.target.value})}><option value="不安單">不安單</option><option value="須安單">須安單</option></select></div>
                          {fieldVisibility.accommodationDates && <div className="grid grid-cols-2 gap-4"><input type="date" min={todayDate} className="w-full p-2 border rounded-lg" value={formData.stay_start_date || ''} onChange={e=>setFormData({...formData, stay_start_date: e.target.value})} /><input type="date" min={formData.stay_start_date || todayDate} className="w-full p-2 border rounded-lg" value={formData.stay_end_date || ''} onChange={e=>setFormData({...formData, stay_end_date: e.target.value})} /></div>}
                       </div>
                    )}
                 </div>

                 <div className="pt-6 border-t border-stone-100">
                    <label className="text-sm font-bold text-slate-500 ml-1 mb-2 block">其他備註</label>
                    <textarea rows={3} className="w-full p-3 text-lg border border-stone-200 rounded-xl bg-stone-50/50" placeholder="若有其他需求請填寫於此..." value={formData.memo} onChange={e=>setFormData({...formData, memo: e.target.value})} />
                 </div>

                 <button onClick={handleSubmitNote} disabled={loading || submitStatus.disabled} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-lg transition-transform active:scale-[0.99] ${submitStatus.disabled ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-[#4f093c] text-white hover:bg-[#3d072e] shadow-[#4f093c]/20'}`}>{submitStatus.text}</button>
             </div>
          </div>
        )}

        {/* 紀錄頁籤 */}
        {activeTab === 'history' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl shadow-sm border border-stone-100">
                 <h3 className="font-bold text-[#4f093c] text-lg flex items-center gap-2"><History className="w-5 h-5"/> 歷史紀錄</h3>
                 <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-stone-400"/>
                    <select className="p-2 pl-4 pr-8 border-none bg-stone-100 rounded-xl text-sm font-bold text-stone-600 outline-none cursor-pointer hover:bg-stone-200 transition-colors" value={historyFilterLoc} onChange={e=>setHistoryFilterLoc(e.target.value)}>
                       <option value="">全部地點</option>
                       {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                 </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {sortedHistoryNotes.map(n => {
                 const status = getCardStatus(n);
                 const isInactive = status.isInactive;
                 return (
                   <div key={n.id} className={`bg-white rounded-[24px] shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-all group ${isInactive ? 'bg-stone-50' : ''}`}>
                      <div className="relative p-6 pb-0">
                          <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white mb-3 ${status.color}`}>{status.text}</div>
                          <div className={isInactive ? "opacity-50 pointer-events-none grayscale" : ""}>
                              <h3 className="text-xl font-bold text-slate-800 mb-1">{n.activity_location} <span className="text-stone-300 mx-1">|</span> {n.activity_name}</h3>
                              <div className="text-sm font-bold text-[#4f093c] mb-4 bg-[#4f093c]/5 inline-block px-2 py-1 rounded-md">{n.activity_option}</div>
                              
                              <div className="space-y-2 text-sm text-stone-600">
                                 <div className="flex justify-between border-b border-dashed border-stone-100 pb-2 mb-2">
                                    <span className="font-bold">{n.real_name}</span>
                                    <span className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-500">{n.registrant_type}</span>
                                 </div>
                                 {n.selected_contents && n.selected_contents.length > 0 && <p className="text-xs text-stone-400">內容: {n.selected_contents.join('、')}</p>}
                                 <div className="grid grid-cols-2 gap-2 text-xs">
                                     <div className="bg-stone-50 p-2 rounded"><div>抵</div><div className="font-mono font-bold text-slate-700">{n.arrival_datetime ? n.arrival_datetime.replace('T', ' ') : '-'}</div></div>
                                     <div className="bg-stone-50 p-2 rounded"><div>離</div><div className="font-mono font-bold text-slate-700">{n.departure_datetime ? n.departure_datetime.replace('T', ' ') : '-'}</div></div>
                                 </div>
                                 <div className="flex gap-2 mt-2">
                                     <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{n.identity}</span>
                                     {n.volunteer_group && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">{n.volunteer_group}</span>}
                                 </div>
                                 {n.memo && <p className="text-xs text-stone-400 italic pt-2 mt-2 border-t border-stone-100">{n.memo}</p>}
                              </div>
                          </div>
                      </div>
                      <div className="px-6 py-4 mt-4 bg-stone-50 border-t border-stone-100 flex justify-between items-center">
                         <span className="text-[10px] text-stone-400 font-mono">{n.created_at.slice(0, 10)}</span>
                         {!isInactive && (
                           <button onClick={() => handleToggleDeleteNote(n.id, n.is_deleted)} className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${n.is_deleted ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-stone-400 border-stone-200 hover:border-red-300 hover:text-red-500'}`}>
                              {n.is_deleted ? '復原' : '刪除'}
                           </button>
                         )}
                      </div>
                   </div>
                 );
               })}
               {sortedHistoryNotes.length === 0 && <div className="col-span-full py-20 text-center text-stone-400 bg-white rounded-[32px] border border-stone-100 flex flex-col items-center gap-4"><FileSpreadsheet className="w-12 h-12 opacity-20"/>暫無紀錄</div>}
             </div>
          </div>
        )}

        {/* Admin 頁面保持原樣但套用新樣式 */}
        {activeTab === 'users' && isAdmin && <div className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100"><h4 className="font-bold text-[#4f093c] mb-6 flex items-center gap-2"><Plus className="w-5 h-5"/> 新增使用者</h4><div className="flex flex-col md:flex-row gap-4"><input className="flex-1 p-3 border rounded-xl text-sm" placeholder="姓名" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} /><input className="w-32 p-3 border rounded-xl text-sm" placeholder="ID後4碼" value={newUser.id4} onChange={e=>setNewUser({...newUser, id4: e.target.value})} /><input className="w-40 p-3 border rounded-xl text-sm" placeholder="密碼" value={newUser.pwd} onChange={e=>setNewUser({...newUser, pwd: e.target.value})} /><button onClick={handleCreateUser} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-200">新增</button></div></div>}
        {activeTab === 'users' && isAdmin && <div className="bg-white rounded-[32px] shadow-sm border border-stone-100 overflow-hidden mt-8"><table className="w-full text-sm text-left"><thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-100"><tr><th className="p-5">姓名</th><th className="p-5">ID後4碼</th><th className="p-5">管理員</th><th className="p-5">狀態</th><th className="p-5 text-right">報名數</th></tr></thead><tbody className="divide-y divide-stone-100">{allUsers.map(u => <tr key={u.id} className="hover:bg-stone-50/50"><td className="p-5 font-bold text-[#4f093c]">{u.user_name}</td><td className="p-5 font-mono text-stone-400">{u.id_last4}</td><td className="p-5"><input type="checkbox" checked={u.is_admin} onChange={() => handleToggleAdmin(u.uid!, u.is_admin)} className="w-5 h-5 rounded border-stone-300 text-[#4f093c] focus:ring-[#4f093c]" /></td><td className="p-5"><span className={`px-2 py-1 rounded text-xs font-bold ${u.is_disabled ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{u.is_disabled ? '已停用' : '啟用中'}</span></td><td className="p-5 text-right"><button onClick={()=>handleToggleUserStatus(u.uid!, u.is_disabled)} className="text-blue-500 hover:underline font-bold text-xs">{u.is_disabled ? '啟用' : '停用'}</button></td></tr>)}</tbody></table></div>}
        
        {activeTab === 'audit' && isAdmin && <div className="space-y-12 animate-in fade-in"><div className="bg-[#4f093c] p-8 rounded-[32px] shadow-xl text-white mb-8"><h2 className="text-3xl font-bold">審核中心</h2><p className="text-white/60 mt-2">處理密碼重設申請</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{resetRequests.filter(r => r.status === 'pending').map(r => <div key={r.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100 relative"><div className="absolute top-6 right-6 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">重設密碼</div><div className="text-2xl font-bold text-slate-800 mb-1">{r.user_name}</div><div className="text-stone-400 font-mono text-sm mb-6">ID: {r.id_last4}</div><div className="flex gap-3"><button onClick={()=>handleResetAction(r.id, 'approve')} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200">批准</button><button onClick={()=>handleResetAction(r.id, 'reject')} className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">拒絕</button></div></div>)}</div></div>}
        
        {activeTab === 'admin_data' && isAdmin && <div className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-100"><div className="flex justify-between items-center mb-8"><h3 className="text-xl font-bold text-[#4f093c]">資料總覽</h3><div className="flex gap-3"><select className="p-2 bg-stone-50 border-none rounded-xl text-xs font-bold text-stone-600 outline-none" value={filterLoc} onChange={e=>setFilterLoc(e.target.value)}><option value="">所有地點</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select><button onClick={handleExport} className="bg-emerald-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200">匯出 CSV</button></div></div><div className="overflow-x-auto rounded-2xl border border-stone-100"><table className="w-full text-left text-sm"><thead><tr className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200"><th>姓名</th><th>地點</th><th>活動</th><th>行程</th><th>備註</th></tr></thead><tbody>{filteredAdminNotes.map(n => <tr key={n.id} className="hover:bg-stone-50/50"><td className="p-4 font-bold text-slate-700">{n.real_name}</td><td className="p-4 text-stone-500">{n.activity_location}</td><td className="p-4 text-stone-500">{n.activity_name}</td><td className="p-4 text-stone-500">{n.activity_option}</td><td className="p-4 text-stone-400 text-xs">{n.memo || '-'}</td></tr>)}</tbody></table></div></div>}
        
        {activeTab === 'admin_settings' && isAdmin && (
           <div className="bg-white p-10 rounded-[40px] shadow-sm border border-stone-100">
              <h3 className="text-2xl font-bold text-[#4f093c] mb-2">1、報名行程設定</h3>
              <p className="text-sm text-stone-400 mb-10">設定地點、活動、行程層級與日期控制</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
                 {/* Column 1: Location */}
                 <div className="flex flex-col bg-stone-50/50 rounded-3xl border border-stone-100 overflow-hidden">
                    <div className="p-4 border-b border-stone-100 bg-white"><h4 className="font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-[#4f093c] rounded-full"></div>地點</h4></div>
                    <div className="p-4 flex gap-2"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新地點..." value={newLocation} onChange={e=>setNewLocation(e.target.value)} /><button onClick={addLocation} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e]"><Plus/></button></div>
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
                 <div className="flex flex-col bg-stone-50/50 rounded-3xl border border-stone-100 overflow-hidden">
                    <div className="p-4 border-b border-stone-100 bg-white"><h4 className="font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-[#4f093c] rounded-full"></div>活動</h4></div>
                    
                    {/* Date Settings for Activity */}
                    <div className="px-4 pt-4 pb-2 space-y-3 bg-white border-b border-stone-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">截止報名</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedAct} value={currentActivityDates.dead} onChange={(e) => handleUpdateActivityDate('activity_deadline', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">圓滿結束</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedAct} value={currentActivityDates.end} onChange={(e) => handleUpdateActivityDate('activity_end_date', e.target.value)} />
                        </div>
                    </div>

                    <div className="p-4 flex gap-2"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新活動..." disabled={!mgmtSelectedLoc} value={newActivity} onChange={e=>setNewActivity(e.target.value)} /><button onClick={addActivity} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50"><Plus/></button></div>
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
                 <div className="flex flex-col bg-stone-50/50 rounded-3xl border border-stone-100 overflow-hidden">
                    <div className="p-4 border-b border-stone-100 bg-white"><h4 className="font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-[#4f093c] rounded-full"></div>行程</h4></div>
                    
                    {/* Date Settings for Option */}
                    <div className="px-4 pt-4 pb-2 space-y-3 bg-white border-b border-stone-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">截止報名</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedOpt || !!currentActivityDates.dead} value={currentActivityDates.dead || currentOptionDates.dead} onChange={(e) => handleUpdateOptionDate('option_deadline', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">圓滿結束</label>
                            <input type="date" className="w-full p-2 text-xs border border-stone-200 rounded-lg bg-stone-50" disabled={!mgmtSelectedOpt || !!currentActivityDates.end} value={currentActivityDates.end || currentOptionDates.end} onChange={(e) => handleUpdateOptionDate('option_end_date', e.target.value)} />
                        </div>
                    </div>

                    <div className="p-4 flex gap-2"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新行程..." disabled={!mgmtSelectedAct} value={newOption} onChange={e=>setNewOption(e.target.value)} /><button onClick={addOption} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50"><Plus/></button></div>
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
                 <div className="flex flex-col bg-stone-50/50 rounded-3xl border border-stone-100 overflow-hidden">
                    <div className="p-4 border-b border-stone-100 bg-white"><h4 className="font-bold text-slate-700 flex items-center gap-2"><div className="w-2 h-6 bg-[#4f093c] rounded-full"></div>內容</h4></div>
                    <div className="p-4 flex gap-2"><input className="flex-1 p-2 text-sm border rounded-lg" placeholder="新內容..." disabled={!mgmtSelectedOpt} value={newContent} onChange={e=>setNewContent(e.target.value)} /><button onClick={addContent} className="bg-[#4f093c] text-white p-2 rounded-lg hover:bg-[#3d072e] disabled:opacity-50"><Plus/></button></div>
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

              <div className="mt-6 flex justify-end">
                  <button onClick={handlePublishSettings} className="bg-[#4f093c] text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-[#3d072e] flex items-center gap-2"><UploadCloud className="w-4 h-4" /> 發佈設定</button>
              </div>

              <div className="mt-16">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-[#4f093c]">2、欄位管理</h3>
                    <button onClick={handlePublishSettings} className="bg-stone-100 text-stone-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-stone-200">刷新欄位</button>
                 </div>
                 <div className="overflow-x-auto rounded-3xl border border-stone-100 shadow-sm">
                    <table className="w-full text-left text-sm bg-white">
                       <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-100">
                          <tr><th className="p-4">代碼 (Key)</th><th className="p-4">標籤 (Label)</th><th className="p-4">類型</th><th className="p-4">必填</th><th className="p-4">備註</th></tr>
                       </thead>
                       <tbody className="divide-y divide-stone-50 text-stone-600">
                          {fieldConfigs.map((col) => (
                              <tr key={col.field_key} className="hover:bg-stone-50/50">
                                  <td className="p-4 font-mono text-[#4f093c]">{col.field_key}</td>
                                  <td className="p-4 font-bold">{col.field_label}</td>
                                  <td className="p-4 text-xs bg-stone-100 rounded inline-block m-2">{col.field_type}</td>
                                  <td className="p-4"><input type="checkbox" checked={col.is_required} onChange={(e) => handleUpdateFieldConfig(col.field_key, 'is_required', e.target.checked)} className="w-4 h-4 rounded text-[#4f093c] focus:ring-[#4f093c]" /></td>
                                  <td className="p-4"><input type="text" value={col.description || ''} onChange={(e) => handleUpdateFieldConfig(col.field_key, 'description', e.target.value)} className="w-full bg-transparent border-b border-stone-200 focus:border-[#4f093c] outline-none text-xs" /></td>
                              </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
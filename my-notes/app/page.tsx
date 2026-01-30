import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  Bell, 
  FileText, 
  History, 
  Settings, 
  Users, 
  Shield, 
  LogOut, 
  Plus, 
  Trash2, 
  Key, 
  Check, 
  X, 
  Calendar, 
  Edit, 
  User,
  ChevronRight,
  Download,
  MapPin,
  Tag,
  ListFilter,
  Save,
  Database
} from 'lucide-react';

/**
 * 系統版本：v9.6 (TypeScript 嚴格型別完全相容版)
 * 修復重點：解決 SetStateAction<string> 不接受 null 的問題 (Error 2345)
 */

// --- TypeScript 介面定義 ---

interface ActivityHierarchy {
  id: string | number;
  location: string;
  activity: string | null;
  option: string | null;
}

interface Note {
  id: string | number;
  user_id: string;
  activity_location: string;
  activity_name: string;
  activity_option: string;
  monastery: string;
  real_name: string;
  dharma_name?: string;
  action_type: string;
  start_date: string;
  end_date: string;
  need_help: boolean;
  memo: string;
  sign_name: string;
  id_2: string;
  is_deleted?: boolean;
  created_at: string;
}

interface Bulletin {
  id: string | number;
  content: string;
  created_at: string;
}

// 擴充 Window 介面以支援動態加載的 Supabase SDK
declare global {
  interface Window {
    supabase: any;
  }
}

const FAKE_DOMAIN = "@my-notes.com";

// --- 模擬資料定義 ---
const MOCK_DATA = {
  bulletins: [
    { id: 1, content: "🎉 歡迎使用書記預先登記系統！系統目前正運行於【展示模式】。", created_at: new Date().toISOString() }
  ] as Bulletin[],
  hierarchy: [
    { id: 1, location: "台北總部", activity: "兒童夏令營", option: "一般報名組" },
    { id: 2, location: "台北總部", activity: "兒童夏令營", option: "志工培訓組" },
    { id: 3, location: "台北總部", activity: "禪修工作坊", option: "初級班" },
    { id: 4, location: "台中分院", activity: "佛學講座", option: "現場參加" },
    { id: 5, location: "台中分院", activity: "佛學講座", option: "線上直播" }
  ] as ActivityHierarchy[],
  notes: [] as Note[],
};

// 輔助函式：修正 Parameter implicitly has an 'any' type
const encodeName = (name: string): string => {
  try { 
    let hex = ''; 
    for (let i = 0; i < name.length; i++) hex += ('0000' + name.charCodeAt(i).toString(16)).slice(-4); 
    return hex; 
  } catch { return name; }
};

const decodeName = (email: string): string => {
  try { 
    const hex = email.split('@')[0]; 
    let str = ''; 
    for (let i = 0; i < hex.length; i += 4) str += String.fromCharCode(parseInt(hex.substr(i, 4), 16)); 
    return str; 
  } catch { return email?.split('@')[0] || ''; }
};

const getDisplayNameOnly = (email: string | undefined | null): string => {
  if (!email) return 'User';
  const fullName = decodeName(email); 
  return (fullName.length > 4 && !isNaN(Number(fullName.slice(-4)))) ? fullName.slice(0, -4) : fullName;
};

const getIdLast4FromEmail = (email: string | undefined | null): string => {
  if (!email) return '0000';
  const fullName = decodeName(email); 
  return (fullName.length > 4 && !isNaN(Number(fullName.slice(-4)))) ? fullName.slice(-4) : '';
};

const calculateDuration = (start: string, end: string): number | string => {
  if (!start || !end) return '-';
  const d1 = new Date(start); 
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const formatDateTime = (isoString: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return isoString; }
};

export default function App() {
  const [supabase, setSupabase] = useState<any>(null);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  const [username, setUsername] = useState<string>('');
  const [idLast4, setIdLast4] = useState<string>(''); 
  const [password, setPassword] = useState<string>('');
  
  // 使用泛型確保陣列型別正確
  const [notes, setNotes] = useState<Note[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [hierarchyData, setHierarchyData] = useState<ActivityHierarchy[]>([]); 
  
  const [activeTab, setActiveTab] = useState<string>('bulletin');
  const [loading, setLoading] = useState<boolean>(true);
  const [minStartDate, setMinStartDate] = useState<string>('');

  const [newLocation, setNewLocation] = useState<string>('');
  const [newActivity, setNewActivity] = useState<string>('');
  const [newOption, setNewOption] = useState<string>('');
  const [mgmtSelectedLoc, setMgmtSelectedLoc] = useState<string>('');
  const [mgmtSelectedAct, setMgmtSelectedAct] = useState<string>('');

  const [formData, setFormData] = useState({
    activity_location: '', 
    activity_name: '', 
    activity_option: '',
    monastery: '', 
    real_name: '', 
    dharma_name: '',
    action_type: '新增', 
    start_date: '', 
    end_date: '', 
    need_help: false, 
    memo: ''
  });

  const getEnvVar = (key: string): string => {
    try {
      if (typeof process !== 'undefined' && process.env) {
        return (process.env as any)[key] || '';
      }
    } catch { }
    return '';
  };

  useEffect(() => {
    const loadSupabase = () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('REACT_APP_SUPABASE_URL');
        const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('REACT_APP_SUPABASE_ANON_KEY');
        
        if (window.supabase && url && key) {
          try {
            const client = window.supabase.createClient(url, key);
            setSupabase(client);
            setIsMock(false);
          } catch (err) {
            console.warn("Supabase 初始化失敗。");
            setIsMock(true);
          }
        } else {
          setIsMock(true);
        }
        setLoading(false);
      };
      script.onerror = () => {
        setIsMock(true);
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    loadSupabase();
    const d = new Date().toISOString().split('T')[0];
    setMinStartDate(d);
  }, []);

  const fetchData = useCallback(async () => {
    if (isMock) {
      setBulletins(MOCK_DATA.bulletins);
      setHierarchyData(MOCK_DATA.hierarchy);
      setNotes(MOCK_DATA.notes);
      return;
    }
    if (!supabase) return;
    
    try {
      const { data: bData } = await supabase.from('bulletins').select('*').order('created_at', { ascending: false });
      if (bData) setBulletins(bData);
      const { data: hData } = await supabase.from('activity_hierarchy').select('*');
      if (hData) setHierarchyData(hData);
      const { data: nData } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
      if (nData) setNotes(nData);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, [supabase, isMock]);

  useEffect(() => {
    if (user) {
      fetchData();
      if (!isMock && supabase) {
        const email = user.email;
        supabase.from('user_permissions').select('is_admin').eq('email', email).single()
          .then(({ data }: any) => { if (data) setIsAdmin(data.is_admin); });
      } else {
        setIsAdmin(true); 
      }
    }
  }, [user, fetchData, isMock, supabase]);

  const handleLogin = async () => {
    if (isMock) {
      setUser({ id: 'mock-u-1', email: encodeName(username + idLast4) + FAKE_DOMAIN });
      setFormData(prev => ({ ...prev, real_name: username }));
      return;
    }
    setLoading(true);
    const email = encodeName(username + idLast4) + FAKE_DOMAIN;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('登入失敗，請確認帳號或密碼。');
    } else {
      setUser(data.user);
      setFormData(prev => ({ ...prev, real_name: username }));
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!isMock && supabase) await supabase.auth.signOut();
    setUser(null); setIsAdmin(false); setActiveTab('bulletin');
  };

  const locations = useMemo(() => [...new Set(hierarchyData.map(h => h.location))].sort(), [hierarchyData]);
  
  const availableActivities = useMemo(() => {
    return [...new Set(
      hierarchyData
        .filter(h => h.location === formData.activity_location && h.activity !== null)
        .map(h => h.activity as string)
    )].sort();
  }, [hierarchyData, formData.activity_location]);

  const availableOptions = useMemo(() => {
    return hierarchyData
      .filter(h => 
        h.location === formData.activity_location && 
        h.activity === formData.activity_name && 
        h.option !== null
      )
      .map(h => h.option as string)
      .sort();
  }, [hierarchyData, formData.activity_location, formData.activity_name]);

  const handleSubmitNote = async () => {
    if (!formData.activity_location || !formData.activity_name || !formData.activity_option || !formData.real_name) {
      return alert('請完整填寫必填欄位 (*)');
    }
    setLoading(true);
    const last4 = user ? getIdLast4FromEmail(user.email) : '0000';
    const payload = { 
      ...formData, 
      user_id: user?.id || 'mock', 
      id_2: last4, 
      sign_name: `${formData.real_name} (${last4})`,
      created_at: new Date().toISOString()
    };

    if (isMock) {
      MOCK_DATA.notes.unshift({ ...payload, id: Date.now() } as Note);
      setNotes([...MOCK_DATA.notes]);
      alert('登記成功 (展示模式)');
      setActiveTab('history');
    } else {
      const { error } = await supabase.from('notes').insert([payload]);
      if (!error) { 
        alert('登記成功'); 
        fetchData(); 
        setActiveTab('history'); 
      } else { 
        alert('錯誤: ' + error.message); 
      }
    }
    setLoading(false);
  };

  const addHierarchy = async (loc: string, act: string | null = null, opt: string | null = null) => {
    if (isMock) {
      const newItem: ActivityHierarchy = { id: Date.now(), location: loc, activity: act, option: opt };
      setHierarchyData([...hierarchyData, newItem]);
      return;
    }
    await supabase.from('activity_hierarchy').insert([{ location: loc, activity: act, option: opt }]);
    fetchData();
  };

  const deleteHierarchy = async (id: string | number) => {
    if (!confirm('確定刪除？')) return;
    if (isMock) {
      setHierarchyData(hierarchyData.filter(h => h.id !== id));
      return;
    }
    await supabase.from('activity_hierarchy').delete().eq('id', id);
    fetchData();
  };

  if (loading && !supabase && !isMock) return <div className="min-h-screen bg-amber-50 flex items-center justify-center font-bold text-amber-900">系統加載中...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4 font-sans text-gray-900">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-amber-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600"><Shield className="w-8 h-8" /></div>
          </div>
          <h2 className="text-xl font-bold mb-4 text-center text-gray-700">書記登記系統 登入</h2>
          {isMock && <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-[11px] rounded-xl border border-blue-100 text-center font-medium">展示模式：無需密碼即可進入。</div>}
          <div className="space-y-4">
            <input className="w-full p-3 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-900" placeholder="姓名" value={username} onChange={e=>setUsername(e.target.value)} />
            <input className="w-full p-3 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-900" placeholder="ID後四碼" maxLength={4} value={idLast4} onChange={e=>setIdLast4(e.target.value)} />
            {!isMock && <input className="w-full p-3 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-900" type="password" placeholder="密碼" value={password} onChange={e=>setPassword(e.target.value)} />}
            <button onClick={handleLogin} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold transition-all shadow-md">進入系統</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center py-10 px-4 text-gray-900 font-sans">
      <h1 className="text-3xl font-extrabold text-amber-900 mb-8 flex items-center gap-3">
        <Shield className="w-9 h-9 text-amber-600" /> 書記預先登記系統
      </h1>

      <div className="w-full max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-amber-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700 text-xl shadow-inner">{(getDisplayNameOnly(user.email))[0]}</div>
            <div>
               <div className="font-bold text-lg">{getDisplayNameOnly(user.email)} {isAdmin && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1 font-bold">管理員</span>}</div>
               <div className="text-xs text-gray-400 font-mono italic">ID: {getIdLast4FromEmail(user.email)} {isMock && "(展示中)"}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"><LogOut className="w-4 h-4" /> 登出</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 bg-amber-200/40 p-1.5 rounded-2xl backdrop-blur-sm">
          <button onClick={()=>setActiveTab('bulletin')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'bulletin' ? 'bg-white shadow-md text-amber-700 font-bold border border-amber-100 scale-105' : 'text-amber-600 hover:bg-amber-100'}`}><Bell className="w-4 h-4" /> 公告</button>
          <button onClick={()=>setActiveTab('form')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'form' ? 'bg-white shadow-md text-amber-700 font-bold border border-amber-100 scale-105' : 'text-amber-600 hover:bg-amber-100'}`}><Edit className="w-4 h-4" /> 報名</button>
          <button onClick={()=>setActiveTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-white shadow-md text-amber-700 font-bold border border-amber-100 scale-105' : 'text-amber-600 hover:bg-amber-100'}`}><History className="w-4 h-4" /> 紀錄</button>
          {isAdmin && (
            <>
              <button onClick={()=>setActiveTab('admin_settings')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'admin_settings' ? 'bg-white shadow-md text-blue-700 font-bold border border-blue-100 scale-105' : 'text-blue-600 hover:bg-blue-100'}`}><Settings className="w-4 h-4" /> 設定</button>
              <button onClick={()=>setActiveTab('admin_data')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === 'admin_data' ? 'bg-white shadow-md text-blue-700 font-bold border border-blue-100 scale-105' : 'text-blue-600 hover:bg-blue-100'}`}><FileText className="w-4 h-4" /> 資料</button>
            </>
          )}
        </div>

        {activeTab === 'form' && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-xl font-extrabold mb-8 flex items-center gap-2 border-b pb-4 text-amber-900"><Edit className="w-7 h-7 text-amber-600" /> 發心登記表</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> 1. 活動地點*</label>
                <select className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white transition-all outline-none text-gray-900 shadow-inner" value={formData.activity_location} onChange={e => setFormData({...formData, activity_location: e.target.value, activity_name: '', activity_option: ''})}>
                  <option value="">請選擇地點</option>
                  {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 flex items-center gap-2"><Tag className="w-4 h-4 text-green-500" /> 2. 活動名稱*</label>
                <select className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white transition-all outline-none disabled:opacity-40 text-gray-900 shadow-inner" disabled={!formData.activity_location} value={formData.activity_name} onChange={e => setFormData({...formData, activity_name: e.target.value, activity_option: ''})}>
                  <option value="">請選擇活動</option>
                  {availableActivities.map((act, idx) => <option key={idx} value={act}>{act}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 flex items-center gap-2"><ListFilter className="w-4 h-4 text-orange-500" /> 3. 活動選項*</label>
                <select className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white transition-all outline-none disabled:opacity-40 text-gray-900 shadow-inner" disabled={!formData.activity_name} value={formData.activity_option} onChange={e => setFormData({...formData, activity_option: e.target.value})}>
                  <option value="">請選擇選項</option>
                  {availableOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">精舍* (限2字)</label>
                <input className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white outline-none text-gray-900 shadow-inner" placeholder="例：普台" value={formData.monastery} onChange={e => setFormData({...formData, monastery: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">姓名*</label>
                <input className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white outline-none text-gray-900 shadow-inner" value={formData.real_name} onChange={e => setFormData({...formData, real_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">法名</label>
                <input className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white outline-none text-gray-900 shadow-inner" value={formData.dharma_name} onChange={e => setFormData({...formData, dharma_name: e.target.value})} />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-600">發心起訖日期*</label>
                <div className="flex gap-2">
                  <input type="date" min={minStartDate} className="flex-1 border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white outline-none text-gray-900 shadow-inner" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  <input type="date" min={formData.start_date || minStartDate} className="flex-1 border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 focus:border-amber-500 focus:bg-white outline-none text-gray-900 shadow-inner" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>
              <button onClick={handleSubmitNote} disabled={loading} className="md:col-span-3 w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all">
                <Save className="w-6 h-6"/> {loading ? '處理中...' : '確認提交登記'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bulletin' && (
          <div className="space-y-4">
            {bulletins.map(b => (
              <div key={b.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
                <p className="text-gray-800 whitespace-pre-wrap">{b.content}</p>
                <p className="text-[10px] text-gray-400 mt-4 font-mono">{formatDateTime(b.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.filter(n => n.user_id === (user?.id || 'mock')).map(n => (
              <div key={n.id} className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-lg">
                <div className={`absolute top-0 left-0 w-2 h-full bg-amber-500`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">{n.activity_location}</span>
                    <h4 className="font-bold text-lg mt-2 text-gray-800 tracking-tight">{n.activity_name}</h4>
                  </div>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-xl shadow-sm">{n.activity_option}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-amber-500" /> {n.real_name}</div>
                  <div className="flex items-center gap-2 font-bold text-gray-700"><Calendar className="w-4 h-4 text-blue-500" /> {n.start_date} ~ {n.end_date}</div>
                </div>
              </div>
            ))}
            {notes.filter(n => n.user_id === (user?.id || 'mock')).length === 0 && <div className="col-span-full py-24 text-center text-gray-400 font-bold border-4 border-dashed border-gray-100 rounded-[40px]">您目前尚無登記紀錄</div>}
          </div>
        )}

        {activeTab === 'admin_settings' && isAdmin && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-blue-100 animate-in fade-in duration-300">
            <h3 className="text-xl font-black mb-8 flex items-center gap-2 border-b pb-4 text-blue-900"><Database className="w-7 h-7 text-blue-600" /> 層級數據管理</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">1. 地點</h4>
                <div className="flex gap-2">
                  <input className="flex-1 border p-3 rounded-2xl bg-gray-50 text-gray-900 shadow-inner" placeholder="新地點" value={newLocation} onChange={e=>setNewLocation(e.target.value)} />
                  <button onClick={()=>{if(newLocation){addHierarchy(newLocation);setNewLocation('');}}} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 shadow-lg transition-colors"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {locations.map((loc, i) => (
                    <div key={i} className={`p-3 rounded-xl flex justify-between items-center text-sm cursor-pointer transition-all ${mgmtSelectedLoc === loc ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={()=>{setMgmtSelectedLoc(loc);setMgmtSelectedAct('');}}>
                      <span className="font-bold">{loc}</span>
                      <button onClick={(e)=>{e.stopPropagation(); const target = hierarchyData.find(h=>h.location===loc); if(target) deleteHierarchy(target.id);}} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 border-l-4 border-green-500 pl-3">2. 活動</h4>
                <div className="flex gap-2">
                  <input className="flex-1 border p-3 rounded-2xl bg-gray-50 text-gray-900 shadow-inner disabled:opacity-40" disabled={!mgmtSelectedLoc} placeholder="新活動" value={newActivity} onChange={e=>setNewActivity(e.target.value)} />
                  <button onClick={()=>{if(newActivity){addHierarchy(mgmtSelectedLoc, newActivity);setNewActivity('');}}} className="bg-green-600 text-white p-3 rounded-2xl disabled:opacity-40 hover:bg-green-700 shadow-lg transition-colors" disabled={!mgmtSelectedLoc}><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {hierarchyData.filter(h=>h.location===mgmtSelectedLoc && h.activity && !h.option).map(h=>(
                    <div key={h.id} className={`p-3 rounded-xl flex justify-between items-center text-sm cursor-pointer transition-all ${mgmtSelectedAct === h.activity ? 'bg-green-600 text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={()=>setMgmtSelectedAct(h.activity ?? '')}>
                      <span className="font-bold">{h.activity}</span>
                      <button onClick={(e)=>{e.stopPropagation(); deleteHierarchy(h.id);}} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 border-l-4 border-orange-500 pl-3">3. 選項</h4>
                <div className="flex gap-2">
                  <input className="flex-1 border p-3 rounded-2xl bg-gray-50 text-gray-900 shadow-inner disabled:opacity-40" disabled={!mgmtSelectedAct} placeholder="新選項" value={newOption} onChange={e=>setNewOption(e.target.value)} />
                  <button onClick={()=>{if(newOption){addHierarchy(mgmtSelectedLoc, mgmtSelectedAct, newOption);setNewOption('');}}} className="bg-orange-600 text-white p-3 rounded-2xl disabled:opacity-40 hover:bg-orange-700 shadow-lg transition-colors" disabled={!mgmtSelectedAct}><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {hierarchyData.filter(h=>h.location===mgmtSelectedLoc && h.activity === mgmtSelectedAct && h.option).map(h=>(
                    <div key={h.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-sm border border-gray-100 hover:border-orange-200 transition-colors">
                      <span className="font-bold text-gray-800">{h.option}</span>
                      <button onClick={()=>deleteHierarchy(h.id)} className="p-1 hover:bg-red-500 rounded transition-colors group"><Trash2 className="w-4 h-4 text-red-400 group-hover:text-white"/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
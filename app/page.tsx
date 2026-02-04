"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Bell, FileText, History, Settings, Shield, LogOut, Plus, Trash2, Check, 
  Edit, User, MapPin, Tag, ListFilter, Save, Database, Clock, Car, Info, 
  Home, UserCheck, AlertCircle, Briefcase, Layers, 
  CheckCircle2, CheckSquare, FileSpreadsheet, Megaphone, ClipboardCheck, UserCog, Share2, Lock, Eye, EyeOff, Users, ArrowRight, AlertTriangle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

/**
 * 系統版本：v30.0 (權限連動與編譯錯誤終極修復版)
 * 修正說明：
 * 1. 登入後自動檢查 user_permissions 的 is_admin 欄位，若為 true 則開啟管理員模式。
 * 2. 修復所有 TypeScript 錯誤 (ID 型別統一、變數未定義、圖示缺失)。
 * 3. 註冊邏輯改為 Update-First，確保能覆蓋 Trigger 產生的資料。
 * 4. 移除過時的 handleFixProfile。
 */

// --- 主色系設定 ---
const PRIMARY_COLOR = "#7A2E40"; 

// --- 型別定義 (統一 ID 為 string) ---
interface ActivityHierarchy {
  id: string;
  location: string;
  activity: string | null;
  option: string | null;
  content: string | null;
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
  identity: string;
  volunteer_type?: string;
  transportation: string;
  arrival_datetime: string;
  departure_datetime: string;
  volunteer_group?: string;
  start_date: string;
  end_date: string;
  accommodation_option: string;
  stay_start_date?: string;
  stay_end_date?: string;
  is_deleted: boolean;
  audit_status: '待審核' | '已通過' | '不通過';
  admin_memo?: string;
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

declare global {
  interface Window {
    supabase: any;
  }
}

const FAKE_DOMAIN = "@my-notes.com";

// --- 模擬資料 ---
const MOCK_DATA = {
  bulletins: [
    { id: '1', content: "🎉 歡迎使用學員登記系統！目前為展示模式。", created_at: new Date().toISOString() }
  ] as Bulletin[],
  hierarchy: [
    { id: '1', location: "中台", activity: "三日禪修", option: "一般行程", content: null },
    { id: '2', location: "中台", activity: "三日禪修", option: "自選參加行程", content: "第一日早課" },
    { id: '3', location: "精舍", activity: "在地共修", option: "一般行程", content: null }
  ] as ActivityHierarchy[],
  notes: [] as Note[],
  users: [
    { id: '1', email: 'admin@my-notes.com', user_name: '陳大大', id_last4: '1111', is_admin: true, is_disabled: false },
  ] as UserPermission[],
  resetRequests: [
    { id: '1', user_name: '測試申請', id_last4: '1234', status: 'pending', created_at: new Date().toISOString() }
  ] as ResetRequest[]
};

// --- 輔助函式 ---
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
    const d = new Date(isoString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return isoString || '-'; }
};

export default function App() {
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('bulletin');

  // 資料狀態
  const [notes, setNotes] = useState<Note[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [hierarchyData, setHierarchyData] = useState<ActivityHierarchy[]>([]);
  const [allUsers, setAllUsers] = useState<UserPermission[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);

  // 登入狀態
  const [username, setUsername] = useState<string>('');
  const [idLast4, setIdLast4] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login'|'signup'|'forgot'>('login');
  
  // 表單狀態
  const [minStartDate, setMinStartDate] = useState<string>('');
  const [formData, setFormData] = useState({
    real_name: '', dharma_name: '', registrant_type: '目前上禪修班學員', registration_option: '新增',
    activity_location: '', activity_name: '', activity_option: '',
    selected_contents: [] as string[], other_remarks: '', identity: '參加法會', 
    volunteer_type: '一般義工-由精舍安排組別', transportation: '',
    arrival_datetime: '', departure_datetime: '', volunteer_group: '', 
    start_date: '', end_date: '', accommodation_option: '不安單', 
    stay_start_date: '', stay_end_date: ''
  });

  // 管理介面狀態
  const [newBulletin, setNewBulletin] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newActivity, setNewActivity] = useState<string>('');
  const [newOption, setNewOption] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [mgmtSelectedLoc, setMgmtSelectedLoc] = useState<string>('');
  const [mgmtSelectedAct, setMgmtSelectedAct] = useState<string>('');
  const [mgmtSelectedOpt, setMgmtSelectedOpt] = useState<string>('');
  const [newUser, setNewUser] = useState({ name: '', id4: '', pwd: '' });
  const [filterLoc, setFilterLoc] = useState<string>('');

  useEffect(() => {
    const loadSupabase = () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    const now = new Date();
    setMinStartDate(now.toISOString().slice(0, 16));
  }, []);

  // 核心：檢查並設定管理員權限
  const checkAdminPermission = useCallback(async (uid: string, email: string) => {
    if (!supabaseClient) return;
    
    // 查詢 user_permissions 表
    const { data, error } = await supabaseClient
      .from('user_permissions')
      .select('is_admin')
      .eq('uid', uid)
      .maybeSingle();

    if (data) {
      console.log("[Auth] Admin status:", data.is_admin);
      setIsAdmin(data.is_admin === true);
    } else {
      console.log("[Auth] No permission record found.");
      setIsAdmin(false);
    }
  }, [supabaseClient]);

  const fetchData = useCallback(async () => {
    if (isMock) { 
      setBulletins(MOCK_DATA.bulletins);
      setHierarchyData(MOCK_DATA.hierarchy);
      setNotes(MOCK_DATA.notes);
      setAllUsers(MOCK_DATA.users);
      setResetRequests(MOCK_DATA.resetRequests);
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
    } catch (err) { }
  }, [supabaseClient, isMock]);

  // 監聽用戶狀態與權限
  useEffect(() => {
    if (user) {
      fetchData();
      if (!isMock && supabaseClient) {
        // 登入後立即檢查權限
        checkAdminPermission(user.id, user.email);

        const channel = supabaseClient.channel('db-all-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bulletins' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_hierarchy' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_permissions' }, (payload: any) => {
              fetchData(); // 當有人修改權限表時，刷新資料
              // 如果是修改自己的權限，重新檢查 Admin 狀態
              if (payload.new && payload.new.uid === user.id) {
                 setIsAdmin(payload.new.is_admin === true);
              }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reset_requests' }, fetchData)
          .subscribe();
        return () => { supabaseClient.removeChannel(channel); };
      }
    }
  }, [user, fetchData, supabaseClient, isMock, checkAdminPermission]);

  const handleAuthAction = async () => {
    if (!username || !idLast4) return alert('請輸入姓名與 ID 後四碼');
    if (!supabaseClient && !isMock) return alert('系統未連線至資料庫');

    setLoading(true);
    const email = encodeName(username + idLast4) + FAKE_DOMAIN;
    const finalIdLast4 = idLast4.trim();
    const finalUsername = username.trim();

    if (isMock) { 
        setUser({ id: 'mock', email });
        setFormData(prev => ({ ...prev, real_name: username }));
        // 模擬模式預設為管理員 (方便測試)
        setIsAdmin(true); 
        setLoading(false);
        return;
    }

    try {
        if (authMode === 'login') {
            if (!password) { setLoading(false); return alert('請輸入密碼'); }
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setUser(data.user);
            setFormData(prev => ({ ...prev, real_name: username }));

        } else if (authMode === 'signup') {
            if (!password) { setLoading(false); return alert('請設定密碼'); }
            
            if(!confirm(`確認註冊資料：\n姓名：${finalUsername}\nID後4碼：${finalIdLast4}\n\n請確認無誤後送出。`)) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { 
                  data: { 
                    user_name: finalUsername, 
                    id_last4: finalIdLast4,
                    full_name: finalUsername 
                  } 
                }
            });

            if (error) throw error;
            
            if (data.user) {
                // 註冊後的寫入策略：Update First (針對 Trigger) -> Insert Fallback
                const permissionPayload = {
                    user_name: finalUsername,
                    id_last4: finalIdLast4,
                    email: email,
                    is_admin: false,
                    is_disabled: false
                };

                // 1. 嘗試 UPDATE (如果 Trigger 已經建立了空資料)
                const { error: updateError, data: updatedData } = await supabaseClient
                    .from('user_permissions')
                    .update(permissionPayload)
                    .eq('uid', data.user.id)
                    .select();

                // 2. 如果 UPDATE 沒有更新到任何資料 (updatedData 為空)，則執行 INSERT
                if (!updatedData || updatedData.length === 0) {
                     await supabaseClient.from('user_permissions').insert([{
                        uid: data.user.id,
                        ...permissionPayload,
                        created_at: new Date().toISOString()
                     }]);
                }

                alert(`註冊成功！資料已建立。`);
                if (data.session) {
                    setUser(data.user);
                    setFormData(prev => ({ ...prev, real_name: finalUsername }));
                } else {
                    alert('請檢查信箱並點擊驗證連結。');
                }
            }

        } else if (authMode === 'forgot') {
            const { error } = await supabaseClient.from('reset_requests').insert([{
                user_name: finalUsername,
                id_last4: finalIdLast4,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);
            if (error) throw error;
            alert('重設申請已送出，請聯繫管理員審核。');
            setAuthMode('login');
        }
    } catch (err: any) {
        alert('操作失敗：' + err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!isMock && supabaseClient) await supabaseClient.auth.signOut();
    setUser(null); setIsAdmin(false); setActiveTab('bulletin');
  };

  // 4. 聯動邏輯
  const locations = useMemo(() => [...new Set(hierarchyData.map(h => h.location))].sort(), [hierarchyData]);
  const availableActivities = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === formData.activity_location && h.activity !== null).map(h => h.activity as string))].sort(), [hierarchyData, formData.activity_location]);
  const availableOptions = useMemo(() => [...new Set(hierarchyData.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option !== null).map(h => h.option as string))].sort(), [hierarchyData, formData.activity_location, formData.activity_name]);
  
  const availableContents = useMemo(() => hierarchyData.filter(h => h.location === formData.activity_location && h.activity === formData.activity_name && h.option === formData.activity_option && h.content !== null).map(h => h.content as string).sort(), [hierarchyData, formData.activity_location, formData.activity_name, formData.activity_option]);

  const filteredTransportOptions = useMemo(() => {
    const all = ["大車-精舍統一行程", "小車-自訂抵離寺", "自行前往-自訂抵離寺"];
    if (formData.activity_location === '精舍') return [];
    return formData.activity_option === '其他行程' ? all.filter(o => !o.includes("大車")) : all;
  }, [formData.activity_option, formData.activity_location]);

  useEffect(() => {
    const hasLargeBus = filteredTransportOptions.some(o => o.includes("大車"));
    setFormData(prev => ({
      ...prev,
      transportation: hasLargeBus ? "大車-精舍統一行程" : "小車-自訂抵離寺"
    }));
  }, [filteredTransportOptions]);

  useEffect(() => {
    if (formData.arrival_datetime) {
      setFormData(p => ({ ...p, start_date: p.start_date || p.arrival_datetime, stay_start_date: p.stay_start_date || p.arrival_datetime.split('T')[0] }));
    }
  }, [formData.arrival_datetime]);
  useEffect(() => {
    if (formData.departure_datetime) {
      setFormData(p => ({ ...p, end_date: p.end_date || p.departure_datetime, stay_end_date: p.stay_end_date || p.departure_datetime.split('T')[0] }));
    }
  }, [formData.departure_datetime]);

  const needsAccommodationCheck = useMemo(() => {
    if (!formData.activity_option) return false;
    return !formData.activity_option.includes('當天來回');
  }, [formData.activity_option]);

  const showAccommodationSection = useMemo(() => {
    if (formData.activity_location === '精舍' || formData.transportation === '大車-精舍統一行程' || !needsAccommodationCheck) return false;
    if (formData.identity === '參加法會') return true;
    return formData.volunteer_type === '一般義工-由精舍安排組別';
  }, [needsAccommodationCheck, formData.identity, formData.volunteer_type, formData.transportation, formData.activity_location]);

  // 5. 操作 Handlers
  const handleSubmitNote = async () => {
    if (!formData.real_name || !formData.activity_location || !formData.activity_name) return alert('請填寫必填欄位');
    if (availableContents.length > 0 && formData.selected_contents.length === 0) return alert('請至少勾選一項行程內容');

    const payload = { 
      ...formData, 
      user_id: user?.id, 
      audit_status: '待審核' as const, 
      is_deleted: false, 
      created_at: new Date().toISOString() 
    };

    if (isMock) {
      setNotes(prev => [payload as Note, ...prev]);
      alert('已送出申請 (模擬)');
      setActiveTab('history');
      return;
    }

    if (!supabaseClient) return alert('系統未連線至資料庫');
    const { error } = await supabaseClient.from('notes').insert([payload]);
    if (!error) { alert('已送出申請'); setActiveTab('history'); } else { alert('提交失敗: ' + error.message); }
  };

  const handleUpdateAuditStatus = async (id: string, status: string) => {
    if (!supabaseClient) return;
    await supabaseClient.from('notes').update({ audit_status: status }).eq('id', id);
    fetchData();
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
    if (confirm('刪除此公告？')) await supabaseClient.from('bulletins').delete().eq('id', id);
    fetchData();
  };

  const handleAddHierarchy = async () => {
    if (!supabaseClient) return;
    const payload = {
      location: newLocation || mgmtSelectedLoc,
      activity: (newLocation ? null : (newActivity || mgmtSelectedAct)) || null,
      option: (newLocation || newActivity ? null : (newOption || mgmtSelectedOpt)) || null,
      content: (newLocation || newActivity || newOption ? null : newContent) || null
    };
    await supabaseClient.from('activity_hierarchy').insert([payload]);
    setNewLocation(''); setNewActivity(''); setNewOption(''); setNewContent('');
    fetchData();
  };

  const handleDeleteHierarchy = async (id: string, opt: string | null) => {
    if (opt === '其他行程') return alert('系統選項不可刪除');
    if (!confirm('確定刪除？')) return;
    await supabaseClient?.from('activity_hierarchy').delete().eq('id', id);
    fetchData();
  };
  
  const handleExport = () => {
    const headers = "姓名,地點,活動,行程,勾選內容,身分,交通,狀態,時間";
    const rows = notes.map(n => `"${n.real_name}","${n.activity_location}","${n.activity_name}","${n.activity_option}","${n.selected_contents?.join(';') || ''}","${n.identity}","${n.transportation}","${n.audit_status}","${n.created_at}"`);
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `學員登記表.csv`;
    link.click();
  };

  const handleCreateUser = async () => {
    alert('需串接後端 API 建立 Auth 用戶');
  };

  // 管理者切換用戶狀態
  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
    if (!supabaseClient) return;
    await supabaseClient.from('user_permissions').update({ is_disabled: !currentStatus }).eq('uid', uid);
    fetchData();
  };

  // 管理者處理重設請求
  const handleResetAction = async (id: string, action: 'approve' | 'reject') => {
    if (!supabaseClient) return;
    const status = action === 'approve' ? 'completed' : 'rejected';
    await supabaseClient.from('reset_requests').update({ status }).eq('id', id);
    if (action === 'approve') alert("已標記為完成。請手動通知用戶新密碼。");
    fetchData();
  };

  const filteredAdminNotes = useMemo(() => {
    return notes.filter(n => (!filterLoc || n.activity_location === filterLoc));
  }, [notes, filterLoc]);

  if (loading) return <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center font-black text-[#7A2E40] text-4xl animate-pulse">學員登記系統 加載中...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[#E8E2D1] flex flex-col gap-6">
          <div className="text-center">
             <div className="w-16 h-16 bg-[#F2ECE4] rounded-full flex items-center justify-center text-[#7A2E40] mx-auto mb-4 shadow-inner"><Shield className="w-8 h-8" /></div>
             <h2 className="text-xl font-bold text-[#7A2E40] mb-2">學員登記系統</h2>
             <p className="text-sm text-slate-400 font-bold">{authMode === 'login' ? '會員登入' : authMode === 'signup' ? '註冊新帳號' : '密碼重設申請'}</p>
          </div>
          
          <div className="space-y-4">
             <div><label className="text-xs font-bold text-slate-400 ml-1">姓名</label><input className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#7A2E40] outline-none bg-slate-50 transition-all text-sm" value={username} onChange={e=>setUsername(e.target.value)} /></div>
             <div><label className="text-xs font-bold text-slate-400 ml-1">ID後四碼</label><input className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#7A2E40] outline-none bg-slate-50 transition-all text-sm" placeholder="如：1234" maxLength={4} value={idLast4} onChange={e=>setIdLast4(e.target.value)} /></div>
             
             {/* 密碼欄位 */}
             {authMode !== 'forgot' && (
               <div>
                  <label className="text-xs font-bold text-slate-400 ml-1">密碼 {authMode === 'signup' && '(請設定)'}</label>
                  <input className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#7A2E40] outline-none bg-slate-50 transition-all text-sm" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
               </div>
             )}
          </div>

          <button onClick={handleAuthAction} className="w-full bg-[#D97706] hover:bg-[#B45309] text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
             {authMode === 'login' ? '登入系統' : authMode === 'signup' ? '立即註冊' : '送出申請'} <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="flex justify-between text-xs text-slate-400 font-bold px-1 pt-2 border-t border-slate-100">
             {authMode === 'login' ? (
               <>
                 <button onClick={()=>setAuthMode('signup')} className="hover:text-[#7A2E40]">沒有帳號？註冊</button>
                 <button onClick={()=>setAuthMode('forgot')} className="hover:text-[#7A2E40]">忘記密碼？</button>
               </>
             ) : (
               <button onClick={()=>setAuthMode('login')} className="w-full text-center hover:text-[#7A2E40]">返回登入</button>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-slate-800 font-sans text-xl">
      <div className="bg-[#7A2E40] text-white px-8 py-5 flex justify-between items-center shadow-lg sticky top-0 z-[100]">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/30 shadow-inner"><Shield className="w-7 h-7" /></div>
            <span className="font-black tracking-widest text-2xl uppercase">嗨～ {getDisplayNameOnly(user?.email)}</span>
            {isAdmin && <span className="bg-amber-400 text-amber-900 text-xs px-2 py-1 rounded font-bold">管理者</span>}
         </div>
         <button onClick={handleLogout} className="bg-white/10 px-6 py-2 rounded-2xl font-bold">登出</button>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="flex flex-wrap gap-4 mb-14 bg-[#E8E2D1]/40 p-4 rounded-[40px] border border-white/50 shadow-sm">
           {[{ id: 'bulletin', icon: <Bell className="w-8 h-8"/>, label: '公告' }, { id: 'form', icon: <Edit className="w-8 h-8"/>, label: '登記' }, { id: 'history', icon: <History className="w-8 h-8"/>, label: '紀錄' }, { id: 'users', icon: <Users className="w-8 h-8"/>, label: '用戶', admin: true }, { id: 'audit', icon: <ClipboardCheck className="w-8 h-8"/>, label: '審核', admin: true }, { id: 'admin_data', icon: <FileSpreadsheet className="w-8 h-8"/>, label: '資料', admin: true }, { id: 'admin_settings', icon: <UserCog className="w-8 h-8"/>, label: '管理', admin: true }].map((tab) => (
             (!tab.admin || isAdmin) && <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-6 rounded-[30px] font-black text-2xl transition-all ${activeTab === tab.id ? 'bg-[#7A2E40] text-white' : 'text-[#612639] hover:bg-white/60'}`}>{tab.label}</button>
           ))}
        </div>

        {/* 1. 公告頁 */}
        {activeTab === 'bulletin' && (
          <div className="space-y-8 animate-in fade-in">
             {bulletins.map(b => (
               <div key={b.id} className="bg-white p-10 rounded-[50px] shadow-lg border-l-[20px] border-[#7A2E40] hover:translate-x-2 transition-transform">
                  <p className="text-3xl font-bold text-slate-700 leading-relaxed">{b.content}</p>
                  <div className="mt-8 text-base text-slate-400 font-mono flex items-center gap-3"><Clock className="w-5 h-5"/> {formatDateTime(b.created_at)}</div>
               </div>
             ))}
             {bulletins.length === 0 && <div className="text-center py-40 text-slate-300 italic text-4xl font-black">目前尚無公告</div>}
          </div>
        )}

        {/* 2. 登記表單 */}
        {activeTab === 'form' && (
          <div className="bg-white p-12 rounded-[60px] shadow-2xl border border-[#E8E2D1] animate-in slide-in-from-bottom-12">
             <div className="flex items-center gap-5 border-b border-[#F2ECE4] pb-8 mb-12">
                <div className="p-4 bg-[#7A2E40] rounded-3xl text-white shadow-lg"><Edit className="w-10 h-10" /></div>
                <h3 className="text-4xl font-black text-[#7A2E40] tracking-tight">發心登記表</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="space-y-4"><label className="text-2xl font-black text-[#7A2E40] ml-2">姓名*</label><input className="w-full p-6 text-3xl font-bold border-2 rounded-[30px]" value={formData.real_name} onChange={e=>setFormData({...formData, real_name: e.target.value})} /></div>
                <div className="space-y-4"><label className="text-2xl font-black text-[#7A2E40] ml-2">法名</label><input className="w-full p-6 text-3xl font-bold border-2 rounded-[30px]" value={formData.dharma_name} onChange={e=>setFormData({...formData, dharma_name: e.target.value})} /></div>
                <div className="space-y-4"><label className="text-2xl font-black text-[#7A2E40] ml-2">報名選項*</label><select className="w-full p-6 text-2xl font-bold border-2 rounded-[30px]" value={formData.registration_option} onChange={e=>setFormData({...formData, registration_option: e.target.value})}><option value="新增">新增</option><option value="異動">異動</option></select></div>
                <div className="space-y-4"><label className="text-2xl font-black text-[#7A2E40] ml-2">屬性*</label><select className="w-full p-6 text-2xl font-bold border-2 rounded-[30px]" value={formData.registrant_type} onChange={e=>setFormData({...formData, registrant_type: e.target.value})}><option value="目前上禪修班學員">目前上禪修班學員</option><option value="曾經上禪修班學員">曾經上禪修班學員</option><option value="學員家人">學員家人</option></select></div>
             </div>
             
             {formData.registration_option === '異動' && <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 font-bold"><AlertCircle className="w-6 h-6"/> 請至「紀錄」頁面刪除舊資料後再重新填寫。</div>}
             {formData.registrant_type === '學員家人' && <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 font-bold"><Info className="w-6 h-6"/> 請至知客室填寫家眷表。</div>}

             <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-12 border-t-4 border-dotted border-[#F2ECE4] pt-12 mt-12">
                <div className="space-y-4"><label className="text-2xl font-black text-slate-500">1. 地點*</label><select className="w-full p-8 text-3xl font-black border-4 rounded-[40px]" value={formData.activity_location} onChange={e=>setFormData({...formData, activity_location: e.target.value, activity_name: '', activity_option: '', selected_contents: []})}>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div className="space-y-4"><label className="text-2xl font-black text-slate-500">2. 活動*</label><select className="w-full p-8 text-3xl font-black border-4 rounded-[40px]" disabled={!formData.activity_location} value={formData.activity_name} onChange={e=>setFormData({...formData, activity_name: e.target.value, activity_option: '', selected_contents: []})}>{availableActivities.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="space-y-4"><label className="text-2xl font-black text-slate-500">3. 行程*</label><select className="w-full p-8 text-3xl font-black border-4 rounded-[40px]" disabled={!formData.activity_name} value={formData.activity_option} onChange={e=>setFormData({...formData, activity_option: e.target.value, selected_contents: []})}>{availableOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             </div>

             {/* 自選行程內容勾選 (只要有內容就顯示) */}
             {availableContents.length > 0 && (
                <div className="md:col-span-3 p-12 bg-[#F2ECE4]/30 rounded-[60px] border-4 border-dashed border-[#E8E2D1] mt-12">
                   <label className="text-3xl font-black text-[#7A2E40] mb-8 block">4. 行程內容複選</label>
                   <div className="flex flex-wrap gap-6">
                      {availableContents.map(c => (
                        <button key={c} type="button" onClick={() => setFormData(p => ({ ...p, selected_contents: p.selected_contents.includes(c) ? p.selected_contents.filter(i => i !== c) : [...p.selected_contents, c] }))} className={`px-10 py-5 rounded-[30px] font-black text-2xl border-4 transition-all ${formData.selected_contents.includes(c) ? 'bg-[#7A2E40] text-white border-[#7A2E40]' : 'bg-white text-[#7A2E40] border-[#E8E2D1]'}`}>{c}</button>
                      ))}
                   </div>
                </div>
             )}

             {formData.activity_option === '其他行程' && <div className="mt-8 space-y-4"><label className="text-2xl font-black text-orange-600">行程備註*</label><textarea rows={2} className="w-full p-6 text-xl border-4 border-orange-200 rounded-[40px]" value={formData.other_remarks} onChange={e=>setFormData({...formData, other_remarks: e.target.value})} /></div>}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t-4 border-dotted border-[#F2ECE4] pt-12 mt-12">
                <div className="space-y-4"><label className="text-2xl font-black text-slate-500 ml-2">身份*</label><select className="w-full p-8 rounded-[40px] bg-[#FAF9F6] text-3xl font-bold" value={formData.identity} onChange={e=>setFormData({...formData, identity: e.target.value})}><option value="參加法會">參加法會</option><option value="發心義工">發心義工</option></select></div>
                {formData.activity_location !== '精舍' && <div className="space-y-4"><label className="text-2xl font-black text-slate-500 ml-2">交通*</label><select className="w-full p-8 rounded-[40px] bg-[#FAF9F6] text-3xl font-bold" value={formData.transportation} onChange={e=>setFormData({...formData, transportation: e.target.value})}>{filteredTransportOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>}
             </div>

             <div className="md:col-span-3 border-t border-[#F2ECE4] pt-6 space-y-8">
                {formData.activity_location === '精舍' ? (
                   formData.identity === '發心義工' && <div className="p-10 bg-[#F2ECE4]/30 rounded-[50px] border border-[#E8E2D1] space-y-6"><label className="text-2xl font-black text-[#7A2E40]">精舍發心組別*</label><input className="w-full p-6 rounded-[30px] border-2 text-2xl" value={formData.volunteer_group} onChange={e=>setFormData({...formData, volunteer_group: e.target.value})} /></div>
                ) : (
                  <>
                    {formData.transportation !== '大車-精舍統一行程' && <div className="grid grid-cols-1 md:grid-cols-2 gap-12"><div className="space-y-4"><label className="text-xl font-bold text-blue-700">抵寺日時*</label><input type="datetime-local" className="w-full p-6 rounded-[30px] border-2 text-2xl" value={formData.arrival_datetime} onChange={e=>setFormData({...formData, arrival_datetime: e.target.value})} /></div><div className="space-y-4"><label className="text-xl font-bold text-blue-700">離寺日時*</label><input type="datetime-local" className="w-full p-6 rounded-[30px] border-2 text-2xl" value={formData.departure_datetime} onChange={e=>setFormData({...formData, departure_datetime: e.target.value})} /></div></div>}
                    {formData.identity === '發心義工' && <div className="p-10 bg-[#F2ECE4]/30 rounded-[50px] border border-[#E8E2D1] space-y-6"><label className="text-2xl font-black text-[#7A2E40]">義工分流*</label><select className="w-full p-6 rounded-[30px] text-2xl" value={formData.volunteer_type} onChange={e=>setFormData({...formData, volunteer_type: e.target.value})}><option value="一般義工-由精舍安排組別">一般義工-由精舍安排組別</option><option value="長期義工-已於平台報名">長期義工-已於平台報名</option><option value="佛巡-已於平台報名">佛巡-已於平台報名</option></select></div>}
                    {showAccommodationSection && formData.accommodation_option === '安單' && <div className="p-10 bg-slate-50 rounded-[50px] border border-slate-200"><label className="text-2xl font-black">安單起訖*</label><input type="date" className="w-full p-6 text-2xl" value={formData.stay_start_date} onChange={e=>setFormData({...formData, stay_start_date: e.target.value})} /><input type="date" className="w-full p-6 text-2xl mt-4" value={formData.stay_end_date} onChange={e=>setFormData({...formData, stay_end_date: e.target.value})} /></div>}
                  </>
                )}
             </div>

             <button onClick={handleSubmitNote} disabled={loading} className="w-full mt-16 bg-[#7A2E40] hover:bg-[#5D2331] text-white py-10 rounded-[60px] font-black text-5xl shadow-2xl transition-all">確認送出</button>
          </div>
        )}

        {/* 3. 用戶管理 (Admin Only) */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E8E2D1]">
                <h4 className="font-bold text-slate-600 mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> 新增使用者 (自動產生UID)</h4>
                <div className="flex flex-col md:flex-row gap-4">
                   <input className="flex-1 p-3 border rounded-xl text-sm" placeholder="姓名" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
                   <input className="w-32 p-3 border rounded-xl text-sm" placeholder="ID後4碼" value={newUser.id4} onChange={e=>setNewUser({...newUser, id4: e.target.value})} />
                   <input className="w-40 p-3 border rounded-xl text-sm" placeholder="密碼" value={newUser.pwd} onChange={e=>setNewUser({...newUser, pwd: e.target.value})} />
                   <button onClick={handleCreateUser} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-blue-700">新增</button>
                </div>
             </div>
             <div className="bg-white rounded-3xl shadow-sm border border-[#E8E2D1] overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                      <tr><th className="p-4">姓名</th><th className="p-4">ID後4碼</th><th className="p-4">管理員</th><th className="p-4">狀態</th><th className="p-4 text-right">操作</th></tr>
                   </thead>
                   <tbody className="divide-y">
                      {allUsers.map(u => (
                         <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-[#7A2E40]">{u.user_name}</td>
                            <td className="p-4 font-mono text-slate-400">{u.id_last4}</td>
                            <td className="p-4">{u.is_admin ? '是' : '否'}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.is_disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{u.is_disabled ? '已停用' : '啟用中'}</span></td>
                            <td className="p-4 text-right"><button onClick={()=>handleToggleUserStatus(u.uid!, u.is_disabled)} className="text-blue-500 hover:underline">{u.is_disabled ? '啟用' : '停用'}</button></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* 4. 審核頁 */}
        {activeTab === 'audit' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <div className="bg-[#7A2E40] p-10 rounded-[50px] flex justify-between items-center shadow-xl">
                <h2 className="text-4xl font-black text-white">審核中心</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* 報名審核 */}
                {notes.filter(n => !n.is_deleted).map(n => (
                   <div key={n.id} className="bg-white p-12 rounded-[60px] shadow-lg border border-[#E8E2D1] relative overflow-hidden">
                      <div className={`absolute top-0 right-0 px-12 py-5 rounded-bl-[60px] font-black text-white text-xl ${n.audit_status === '待審核' ? 'bg-orange-500' : n.audit_status === '已通過' ? 'bg-emerald-600' : 'bg-red-600'}`}>{n.audit_status}</div>
                      <div className="text-[#7A2E40] font-black text-6xl mb-4">{n.real_name}</div>
                      <div className="flex gap-4 mt-8">
                         <button onClick={()=>handleUpdateAuditStatus(n.id, '已通過')} className="flex-1 py-6 bg-emerald-50 text-emerald-700 font-black text-3xl rounded-[30px] border-4 border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">通過</button>
                         <button onClick={()=>handleUpdateAuditStatus(n.id, '不通過')} className="flex-1 py-6 bg-red-50 text-red-700 font-black text-3xl rounded-[30px] border-4 border-red-600 hover:bg-red-600 hover:text-white transition-all">駁回</button>
                      </div>
                   </div>
                ))}
                {/* 密碼重設審核 */}
                {resetRequests.filter(r => r.status === 'pending').map(r => (
                   <div key={r.id} className="bg-white p-12 rounded-[60px] shadow-lg border-4 border-blue-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 px-12 py-5 rounded-bl-[60px] font-black text-white text-xl bg-blue-500">重設密碼</div>
                      <div className="text-blue-900 font-black text-5xl mb-4">{r.user_name}</div>
                      <div className="text-slate-400 text-2xl font-mono">ID: {r.id_last4}</div>
                      <div className="flex gap-4 mt-8">
                         <button onClick={()=>handleResetAction(r.id, 'approve')} className="flex-1 py-6 bg-blue-50 text-blue-700 font-black text-3xl rounded-[30px] border-4 border-blue-600 hover:bg-blue-600 hover:text-white transition-all">批准</button>
                         <button onClick={()=>handleResetAction(r.id, 'reject')} className="flex-1 py-6 bg-slate-50 text-slate-700 font-black text-3xl rounded-[30px] border-4 border-slate-600 hover:bg-slate-600 hover:text-white transition-all">拒絕</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* 5. 資料總表 (恢復) */}
        {activeTab === 'admin_data' && isAdmin && (
           <div className="bg-white p-10 rounded-[60px] shadow-sm border border-[#E8E2D1] animate-in fade-in">
              <div className="flex justify-between items-center mb-10 gap-6 border-b border-[#F2ECE4] pb-8">
                 <h3 className="text-2xl font-black text-[#7A2E40]">資料總覽</h3>
                 <div className="flex gap-4">
                    <select className="p-3 bg-[#FAF9F6] border rounded-2xl text-xs font-bold" value={filterLoc} onChange={e=>setFilterLoc(e.target.value)}><option value="">所有地點</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                    <button onClick={handleExport} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black hover:bg-emerald-700">匯出</button>
                 </div>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-[#F2ECE4]">
                 <table className="w-full text-left text-sm">
                    <thead><tr className="bg-[#7A2E40] text-white"><th>姓名</th><th>地點</th><th>活動</th><th>行程</th><th>狀態</th></tr></thead>
                    <tbody>{filteredAdminNotes.map(n => <tr key={n.id} className="hover:bg-slate-50"><td className="p-4">{n.real_name}</td><td className="p-4">{n.activity_location}</td><td className="p-4">{n.activity_name}</td><td className="p-4">{n.activity_option}</td><td className="p-4">{n.audit_status}</td></tr>)}</tbody>
                 </table>
              </div>
           </div>
        )}

        {/* 6. 紀錄頁 */}
        {activeTab === 'history' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
             {notes.filter(n => n.user_id === user?.id).map(n => (
                 <div key={n.id} className={`bg-white p-10 rounded-[60px] shadow-xl border border-[#E8E2D1] relative overflow-hidden transition-all ${n.is_deleted ? 'opacity-70 grayscale' : 'hover:shadow-2xl'}`}>
                    <div className={`absolute top-0 left-0 w-4 h-full ${n.audit_status === '已通過' ? 'bg-emerald-600' : n.is_deleted ? 'bg-slate-400' : 'bg-[#7A2E40]'}`}></div>
                    <div className="flex justify-between items-start mb-8">
                       <span className="text-sm bg-[#F2ECE4] text-[#7A2E40] px-5 py-2 rounded-full font-black border border-[#7A2E40]/10 uppercase">{n.activity_location}</span>
                       <span className={`text-base font-black px-4 py-2 rounded-2xl shadow-sm ${n.audit_status === '待審核' ? 'bg-orange-100 text-orange-700' : n.audit_status === '已通過' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{n.audit_status}</span>
                    </div>
                    <div className="space-y-6">
                       <h4 className={`font-black text-4xl text-slate-800 ${n.is_deleted ? 'line-through opacity-40' : ''}`}>{n.activity_name}</h4>
                       <div className="flex items-center gap-4 text-3xl font-black text-[#7A2E40] border-t border-[#F2ECE4] pt-8"><User className="w-10 h-10"/> {n.real_name}</div>
                       <div className="mt-10 bg-[#FAF9F6] p-6 rounded-[40px] border border-[#E8E2D1] flex justify-between items-center">
                          <label className="flex items-center gap-5 cursor-pointer select-none"><input type="checkbox" className="w-10 h-10 rounded-xl text-[#7A2E40]" checked={n.is_deleted} onChange={() => handleToggleDeleteNote(n.id, n.is_deleted)} /><span className="font-black text-3xl text-[#7A2E40]">刪除紀錄</span></label>
                       </div>
                    </div>
                 </div>
             ))}
           </div>
        )}

        {/* 7. 管理員 (系統設定) */}
        {activeTab === 'admin_settings' && isAdmin && (
           <div className="bg-white p-16 rounded-[80px] shadow-sm border border-[#E8E2D1]">
              <h3 className="text-5xl font-black text-[#7A2E40] mb-12">系統數據管理</h3>
              <div className="mb-16">
                 <h4 className="font-black text-3xl text-slate-700 border-l-[15px] border-[#7A2E40] pl-6 mb-6">公告發布</h4>
                 <div className="flex gap-4"><textarea className="flex-1 p-6 border-4 rounded-[30px] text-xl font-bold" rows={2} value={newBulletin} onChange={e=>setNewBulletin(e.target.value)} /><button onClick={handleAddBulletin} className="px-12 py-4 bg-[#7A2E40] text-white rounded-[30px] font-black text-xl">發布</button></div>
                 <div className="mt-6 space-y-2">{bulletins.map(b => <div key={b.id} className="p-4 bg-[#FAF9F6] rounded-2xl flex justify-between border"><span>{b.content}</span><button onClick={()=>handleDeleteBulletin(b.id)}><Trash2 className="w-5 h-5 text-red-300"/></button></div>)}</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                 <div className="space-y-6 min-w-0">
                    <h4 className="font-black text-3xl border-l-[15px] border-[#7A2E40] pl-6">地點</h4>
                    <div className="flex gap-2 shrink-0"><input className="flex-1 p-4 border-4 rounded-2xl text-xl font-bold min-w-0" value={newLocation} onChange={e=>setNewLocation(e.target.value)} /><button onClick={handleAddHierarchy} className="bg-[#7A2E40] text-white p-4 rounded-2xl shrink-0"><Plus/></button></div>
                    <div className="max-h-96 overflow-y-auto space-y-2">{locations.map(l => <div key={l} onClick={()=>setMgmtSelectedLoc(l)} className={`p-4 rounded-2xl text-xl font-bold cursor-pointer ${mgmtSelectedLoc === l ? 'bg-[#7A2E40] text-white' : 'bg-slate-100'}`}>{l}</div>)}</div>
                 </div>
                 <div className="space-y-6 min-w-0">
                    <h4 className="font-black text-3xl border-l-[15px] border-[#7A2E40] pl-6">活動</h4>
                    <div className="flex gap-2 shrink-0"><input className="flex-1 p-4 border-4 rounded-2xl text-xl font-bold min-w-0" disabled={!mgmtSelectedLoc} value={newActivity} onChange={e=>setNewActivity(e.target.value)} /><button onClick={handleAddHierarchy} className="bg-[#7A2E40] text-white p-4 rounded-2xl shrink-0" disabled={!mgmtSelectedLoc}><Plus/></button></div>
                    <div className="max-h-96 overflow-y-auto space-y-2">{availableActivities.map(a => <div key={a} onClick={()=>setMgmtSelectedAct(a)} className={`p-4 rounded-2xl text-xl font-bold cursor-pointer ${mgmtSelectedAct === a ? 'bg-[#7A2E40] text-white' : 'bg-slate-100'}`}>{a}</div>)}</div>
                 </div>
                 <div className="space-y-6 min-w-0">
                    <h4 className="font-black text-3xl border-l-[15px] border-[#7A2E40] pl-6">行程</h4>
                    <div className="flex gap-2 shrink-0"><input className="flex-1 p-4 border-4 rounded-2xl text-xl font-bold min-w-0" disabled={!mgmtSelectedAct} value={newOption} onChange={e=>setNewOption(e.target.value)} /><button onClick={handleAddHierarchy} className="bg-[#7A2E40] text-white p-4 rounded-2xl shrink-0" disabled={!mgmtSelectedAct}><Plus/></button></div>
                    <div className="max-h-96 overflow-y-auto space-y-2">{availableOptions.map(o => <div key={o} onClick={()=>setMgmtSelectedOpt(o)} className={`p-4 rounded-2xl text-xl font-bold cursor-pointer ${mgmtSelectedOpt === o ? 'bg-[#7A2E40] text-white' : 'bg-slate-100'}`}>{o}</div>)}</div>
                 </div>
                 <div className="space-y-6 min-w-0">
                    <h4 className="font-black text-3xl border-l-[15px] border-[#7A2E40] pl-6">內容</h4>
                    <div className="flex gap-2 shrink-0"><input className="flex-1 p-4 border-4 rounded-2xl text-xl font-bold min-w-0" disabled={!mgmtSelectedOpt} value={newContent} onChange={e=>setNewContent(e.target.value)} /><button onClick={handleAddHierarchy} className="bg-[#7A2E40] text-white p-4 rounded-2xl shrink-0" disabled={!mgmtSelectedOpt}><Plus/></button></div>
                    <div className="max-h-96 overflow-y-auto space-y-2">{hierarchyData.filter(h=>h.location===mgmtSelectedLoc && h.activity===mgmtSelectedAct && h.option===mgmtSelectedOpt && h.content).map(h => <div key={h.id} className="p-4 rounded-2xl text-xl font-bold flex justify-between shadow-sm border border-[#F2ECE4]"><span>{h.content}</span><button onClick={()=>handleDeleteHierarchy(h.id, null)}><Trash2 className="w-5 h-5 text-red-300"/></button></div>)}</div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CheckSquare, 
  ClipboardList, 
  Copy, 
  Save, 
  Plus, 
  Trash2, 
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  GraduationCap,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
  Loader2,
  MessageSquareQuote,
  Table,
  List,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

// --- CẤU HÌNH TIÊU CHÍ ĐÁNH GIÁ ---
const CRITERIA_CONFIG = {
  attendance: {
    label: 'Chuyên cần',
    options: [
      { id: 'a1', text: 'Đúng giờ', phrase: 'đi học đầy đủ và đúng giờ', phraseEn: 'attended class fully and on time' },
      { id: 'a2', text: 'Đi muộn', phrase: 'có đi học nhưng đến lớp hơi muộn', phraseEn: 'attended class but was a bit late' },
      { id: 'a3', text: 'Nghỉ có phép', phrase: 'hôm nay xin phép nghỉ học', phraseEn: 'requested leave from class today' },
      { id: 'a4', text: 'Nghỉ không phép', phrase: 'hôm nay nghỉ học không có lý do', phraseEn: 'was absent without notice today' }
    ]
  },
  attitude: {
    label: 'Thái độ học tập',
    options: [
      { id: 'at1', text: 'Rất hăng hái', phrase: 'rất tập trung nghe giảng và hăng hái phát biểu xây dựng bài', phraseEn: 'was very focused and actively participated in class discussions' },
      { id: 'at2', text: 'Chú ý nghe giảng', phrase: 'có chú ý nghe giảng và hoàn thành nhiệm vụ trên lớp', phraseEn: 'paid attention and completed classroom tasks' },
      { id: 'at3', text: 'Đôi lúc xao nhãng', phrase: 'đôi lúc còn thiếu tập trung trong giờ học', phraseEn: 'was occasionally distracted during the lesson' },
      { id: 'at4', text: 'Nói chuyện riêng', phrase: 'còn hay nói chuyện riêng, cần chú ý tập trung hơn', phraseEn: 'frequently talked privately and needs to focus more' }
    ]
  },
  homework: {
    label: 'Bài tập về nhà',
    options: [
      { id: 'h1', text: 'Hoàn thành tốt', phrase: 'đã hoàn thành rất tốt bài tập được giao', phraseEn: 'completed the assigned homework very well' },
      { id: 'h2', text: 'Có làm bài', phrase: 'đã làm bài tập đầy đủ', phraseEn: 'completed the homework fully' },
      { id: 'h3', text: 'Làm thiếu', phrase: 'chưa hoàn thành hết phần bài tập về nhà', phraseEn: 'did not complete all the homework' },
      { id: 'h4', text: 'Chưa làm', phrase: 'chưa làm bài tập về nhà', phraseEn: 'did not do the homework' },
      { id: 'h5', text: 'Không có BTVN', phrase: '', phraseEn: '' }
    ]
  }
};

interface Student {
  id: string;
  name: string;
  classId: string;
}

interface Class {
  id: string;
  name: string;
}

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'evaluate', 'summary'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  
  // AI Config
  const [aiTone, setAiTone] = useState('friendly'); // friendly, serious, encouraging, concise
  const [aiPronoun, setAiPronoun] = useState('con'); // con, em, bạn, học sinh
  const [includeEnglish, setIncludeEnglish] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryViewMode, setSummaryViewMode] = useState<'list' | 'table'>('list');

  // Lưu trữ đánh giá theo ngày và ID học sinh
  const [records, setRecords] = useState<Record<string, Record<string, any>>>({});
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(filteredStudents[0]?.id || null);
  const [toastMessage, setToastMessage] = useState('');

  // Form state cho học sinh đang chọn
  const [formData, setFormData] = useState({
    attendance: 'a1',
    attitude: 'at1',
    homework: 'h1',
    note: '',
    finalComment: ''
  });

  // --- HÀM XỬ LÝ ---
  
  // Fetch data from server on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
          setStudents(data.students || []);
          setRecords(data.records || {});
          if (data.classes && data.classes.length > 0) {
            setSelectedClassId(data.classes[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Lỗi khi tải dữ liệu từ máy chủ.');
      }
    };
    fetchData();
  }, []);

  // Save data to server
  const saveData = async (newClasses: Class[], newStudents: Student[], newRecords: Record<string, Record<string, any>> = records) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: newClasses, students: newStudents, records: newRecords })
      });
    } catch (error) {
      console.error('Error saving data:', error);
      showToast('Lỗi khi lưu dữ liệu vào máy chủ.');
    }
  };

  // Load dữ liệu khi đổi học sinh hoặc đổi ngày
  useEffect(() => {
    if (!selectedStudentId) return;
    
    const dayRecords = records[date] || {};
    const studentRecord = dayRecords[selectedStudentId];
    
    if (studentRecord) {
      setFormData(studentRecord);
    } else {
      setFormData({
        attendance: 'a1',
        attitude: 'at1',
        homework: 'h1',
        note: '',
        finalComment: ''
      });
    }
  }, [selectedStudentId, date, records]);

  // Tự động chọn học sinh đầu tiên khi đổi lớp
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    } else {
      setSelectedStudentId(null);
    }
  }, [selectedClassId, filteredStudents]);

  // Hàm tự động gen text dựa trên lựa chọn
  const generateAutoComment = (data: typeof formData) => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return '';
    
    const attOpt = CRITERIA_CONFIG.attendance.options.find(o => o.id === data.attendance);
    const attitudeOpt = CRITERIA_CONFIG.attitude.options.find(o => o.id === data.attitude);
    const hwOpt = CRITERIA_CONFIG.homework.options.find(o => o.id === data.homework);
    
    const attPhrase = attOpt?.phrase;
    const attitudePhrase = attitudeOpt?.phrase;
    const hwPhrase = hwOpt?.phrase;

    const attPhraseEn = attOpt?.phraseEn;
    const attitudePhraseEn = attitudeOpt?.phraseEn;
    const hwPhraseEn = hwOpt?.phraseEn;
    
    if (data.attendance === 'a3' || data.attendance === 'a4') {
      let vn = `Hôm nay ${student.name} ${attPhrase}. ${data.note ? '\nLưu ý: ' + data.note : ''}`;
      if (includeEnglish) {
        let en = `Today ${student.name} ${attPhraseEn}. ${data.note ? '\nNote: ' + data.note : ''}`;
        return `${vn}\n\n--- English Version ---\n${en}`;
      }
      return vn;
    }

    let sentences = [];
    sentences.push(`Hôm nay ${student.name} ${attPhrase}.`);
    sentences.push(`Trong giờ học, con ${attitudePhrase}.`);
    if (hwPhrase) {
      sentences.push(`Về phần bài tập về nhà, con ${hwPhrase}.`);
    }
    if (data.note && data.note.trim() !== '') {
      sentences.push(data.note);
    }
    
    let vnResult = sentences.join(' ');

    if (includeEnglish) {
      let sentencesEn = [];
      sentencesEn.push(`Today ${student.name} ${attPhraseEn}.`);
      sentencesEn.push(`During the lesson, the student ${attitudePhraseEn}.`);
      if (hwPhraseEn) {
        sentencesEn.push(`Regarding homework, the student ${hwPhraseEn}.`);
      }
      if (data.note && data.note.trim() !== '') {
        sentencesEn.push(data.note);
      }
      let enResult = sentencesEn.join(' ');
      return `${vnResult}\n\n--- English Version ---\n${enResult}`;
    }
    
    return vnResult;
  };

  useEffect(() => {
    if (selectedStudentId) {
      const autoGen = generateAutoComment(formData);
      setFormData(prev => ({ ...prev, finalComment: autoGen }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.attendance, formData.attitude, formData.homework, formData.note, selectedStudentId, includeEnglish]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEvaluation = () => {
    if (!selectedStudentId) return;
    
    const newRecords = { ...records };
    if (!newRecords[date]) newRecords[date] = {};
    newRecords[date][selectedStudentId] = { ...formData };
    
    setRecords(newRecords);
    saveData(classes, students, newRecords);
    
    showToast('Đã lưu nhận xét thành công!');
    
    const currentIndex = filteredStudents.findIndex(s => s.id === selectedStudentId);
    if (currentIndex < filteredStudents.length - 1) {
      setSelectedStudentId(filteredStudents[currentIndex + 1].id);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedClassId) return;
    const newId = Date.now().toString();
    const newStudents = [...students, { id: newId, name: newStudentName.trim(), classId: selectedClassId }];
    setStudents(newStudents);
    saveData(classes, newStudents);
    setNewStudentName('');
    showToast('Đã thêm học sinh mới');
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newId = 'c' + Date.now().toString();
    const newClasses = [...classes, { id: newId, name: newClassName.trim() }];
    setClasses(newClasses);
    saveData(newClasses, students);
    setNewClassName('');
    showToast('Đã thêm lớp học mới');
    if (!selectedClassId) setSelectedClassId(newId);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      const newStudents = students.filter(s => s.id !== id);
      setStudents(newStudents);
      saveData(classes, newStudents);
      if (selectedStudentId === id) {
        setSelectedStudentId(filteredStudents[0]?.id || null);
      }
    }
  };

  const handleDeleteClass = (id: string) => {
    if (window.confirm('Xóa lớp học sẽ xóa tất cả học sinh trong lớp. Bạn có chắc chắn?')) {
      const newClasses = classes.filter(c => c.id !== id);
      const newStudents = students.filter(s => s.classId !== id);
      setClasses(newClasses);
      setStudents(newStudents);
      saveData(newClasses, newStudents);
      if (selectedClassId === id) {
        setSelectedClassId(newClasses[0]?.id || '');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Đã sao chép vào khay nhớ tạm');
    } catch (err) {
      console.error('Không thể copy', err);
    }
    document.body.removeChild(textArea);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleGenerateAIComment = async () => {
    if (!selectedStudentId) return;
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    if (!process.env.GEMINI_API_KEY) {
      showToast('Lỗi: Chưa cấu hình GEMINI_API_KEY. Vui lòng kiểm tra cài đặt.');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const attOption = CRITERIA_CONFIG.attendance.options.find(o => o.id === formData.attendance);
      const attitudeOption = CRITERIA_CONFIG.attitude.options.find(o => o.id === formData.attitude);
      const hwOption = CRITERIA_CONFIG.homework.options.find(o => o.id === formData.homework);

      const toneLabels: Record<string, string> = {
        friendly: 'thân thiện, gần gũi',
        serious: 'nghiêm túc, chuyên nghiệp',
        encouraging: 'khích lệ, truyền cảm hứng',
        concise: 'ngắn gọn, súc tích'
      };

      const prompt = `
        Bạn là một giáo viên đang viết nhận xét hàng ngày cho học sinh.
        Thông tin học sinh:
        - Tên: ${student.name}
        - Lớp: ${classes.find(c => c.id === selectedClassId)?.name}
        - Chuyên cần: ${attOption?.text}
        - Thái độ: ${attitudeOption?.text}
        - Bài tập: ${hwOption?.text}
        - Ghi chú riêng: ${formData.note || 'Không có'}

        Yêu cầu BẮT BUỘC:
        1. Viết một đoạn nhận xét ngắn (khoảng 2-4 câu).
        2. Sử dụng danh xưng: "${aiPronoun}" để gọi học sinh trong tiếng Việt.
        3. Tông giọng: ${toneLabels[aiTone]}.
        4. Ngôn ngữ: ${includeEnglish ? 'BẮT BUỘC phải bao gồm cả Tiếng Việt và Tiếng Anh.' : 'Chỉ Tiếng Việt.'}
        ${includeEnglish ? '5. Cấu trúc: Luôn luôn viết Tiếng Việt ở trên, sau đó là dòng "--- English Version ---", và Tiếng Anh ở dưới. KHÔNG ĐƯỢC QUÊN PHẦN TIẾNG ANH.' : ''}
        6. Nội dung cần phản ánh đúng các tiêu chí đã chọn.
        7. Chỉ trả về nội dung nhận xét, không thêm lời dẫn hay ký tên.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const aiText = response.text || '';
      if (aiText) {
        setFormData(prev => ({ ...prev, finalComment: aiText.trim() }));
        showToast('Đã tạo nhận xét bằng AI!');
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      showToast('Lỗi khi tạo nhận xét bằng AI. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    const className = classes.find(c => c.id === selectedClassId)?.name || 'Lớp';
    const exportData = filteredStudents
      .filter(s => currentRecords[s.id])
      .map(student => {
        const record = currentRecords[student.id];
        const attText = CRITERIA_CONFIG.attendance.options.find(o => o.id === record.attendance)?.text || '';
        const attitText = CRITERIA_CONFIG.attitude.options.find(o => o.id === record.attitude)?.text || '';
        const hwText = CRITERIA_CONFIG.homework.options.find(o => o.id === record.homework)?.text || '';
        
        return {
          'Ngày': date,
          'Lớp': className,
          'Tên học sinh': student.name,
          'Chuyên cần': attText,
          'Thái độ': attitText,
          'Bài tập': hwText,
          'Ghi chú': record.note,
          'Nhận xét của giáo viên': record.finalComment
        };
      });

    if (exportData.length === 0) {
      showToast('Không có dữ liệu để xuất!');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nhận xét");
    
    // Auto-size columns
    const maxWidths = exportData.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString().length : 0;
        acc[i] = Math.max(acc[i] || 0, val, key.length);
      });
      return acc;
    }, []);
    worksheet['!cols'] = maxWidths.map((w: number) => ({ w: w + 2 }));

    XLSX.writeFile(workbook, `Nhan_Xet_${className}_${date}.xlsx`);
    showToast('Đã xuất file Excel thành công!');
  };

  // --- RENDER HELPERS ---
  const currentRecords = records[date] || {};
  const evaluatedCount = filteredStudents.filter(s => currentRecords[s.id]).length;
  const progress = filteredStudents.length > 0 ? Math.round((evaluatedCount / filteredStudents.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-slate-50">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <GraduationCap className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Trợ Lý Nhận Xét</h1>
            <p className="text-slate-500 text-sm font-medium">Hệ thống quản lý học sinh thông minh</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2 flex items-center gap-3 bg-white">
            <Calendar size={18} className="text-blue-600" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 outline-none font-medium cursor-pointer text-sm"
            />
          </div>
          
          <div className="glass-card px-4 py-2 flex items-center gap-3 bg-white">
            <Filter size={18} className="text-blue-600" />
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent border-none text-slate-700 outline-none font-medium cursor-pointer text-sm min-w-[120px]"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-8 flex-1">
        
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-72 flex flex-col gap-4">
          <div className="glass-card p-3 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'students' ? 'glass-tab-active' : 'glass-tab-inactive'}`}
            >
              <Users size={20} /> <span>Quản lý lớp</span>
            </button>
            <button 
              onClick={() => setActiveTab('evaluate')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'evaluate' ? 'glass-tab-active' : 'glass-tab-inactive'}`}
            >
              <CheckSquare size={20} /> <span>Đánh giá</span>
            </button>
            <button 
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'summary' ? 'glass-tab-active' : 'glass-tab-inactive'}`}
            >
              <ClipboardList size={20} /> <span>Tổng hợp</span>
            </button>
          </div>

          {/* Progress Card */}
          {activeTab === 'evaluate' && (
            <div className="glass-card p-6 bg-white">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <LayoutDashboard size={18} className="text-blue-600" />
                Tiến độ lớp {classes.find(c => c.id === selectedClassId)?.name}
              </h3>
              <div className="flex justify-between text-sm text-slate-500 mb-2">
                <span>Hoàn thành: {evaluatedCount}/{filteredStudents.length}</span>
                <span className="text-blue-600 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </nav>

        {/* Dynamic View Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* VIEW: ĐÁNH GIÁ */}
          {activeTab === 'evaluate' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              {/* Student List */}
              <div className="w-full lg:w-80 glass-card flex flex-col overflow-hidden bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Học sinh</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 font-semibold">{filteredStudents.length} HS</span>
                </div>
                <div className="overflow-y-auto p-3 max-h-[60vh] lg:max-h-none flex-1 custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm italic">Chưa có học sinh trong lớp này.</div>
                  ) : (
                    filteredStudents.map(student => {
                      const isEvaluated = currentRecords[student.id];
                      return (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl mb-2 flex justify-between items-center transition-all group ${
                            selectedStudentId === student.id 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                              : isEvaluated 
                                ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="font-medium truncate pr-2">{student.name}</span>
                          {isEvaluated ? (
                            <CheckCircle2 size={16} className={selectedStudentId === student.id ? 'text-white' : 'text-green-500'} />
                          ) : (
                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedStudentId === student.id ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Area */}
              <div className="flex-1 glass-card flex flex-col overflow-hidden bg-white">
                {!selectedStudentId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-4">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                      <Search size={32} />
                    </div>
                    <p className="text-lg font-medium">Vui lòng chọn học sinh để bắt đầu</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {students.find(s => s.id === selectedStudentId)?.name}
                        </h2>
                        <p className="text-sm text-blue-600 font-semibold">{classes.find(c => c.id === selectedClassId)?.name}</p>
                      </div>
                      {currentRecords[selectedStudentId] && (
                         <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-2">
                           <CheckCircle2 size={14}/> Đã lưu đánh giá
                         </span>
                      )}
                    </div>
                    
                    <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
                      {Object.entries(CRITERIA_CONFIG).map(([key, config]) => (
                        <div key={key}>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{config.label}</h3>
                          <div className="flex flex-wrap gap-3">
                            {config.options.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => handleFormChange(key, opt.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                                  (formData as any)[key] === opt.id
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ghi chú thêm</h3>
                        <textarea
                          value={formData.note}
                          onChange={(e) => handleFormChange('note', e.target.value)}
                          placeholder="Nhập ghi chú riêng cho học sinh..."
                          className="w-full glass-input resize-none h-24 text-sm"
                        />
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Sparkles size={14} className="text-blue-600" /> Tùy chỉnh AI
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs text-slate-500 mb-2 block">Tông giọng</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'friendly', label: 'Thân thiện' },
                                { id: 'serious', label: 'Nghiêm túc' },
                                { id: 'encouraging', label: 'Khích lệ' },
                                { id: 'concise', label: 'Ngắn gọn' }
                              ].map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => setAiTone(t.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                    aiTone === t.id 
                                      ? 'bg-blue-600 border-blue-600 text-white' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-2 block">Danh xưng</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'con', label: 'Con' },
                                { id: 'em', label: 'Em' },
                                { id: 'bạn', label: 'Bạn' },
                                { id: 'học sinh', label: 'Học sinh' }
                              ].map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => setAiPronoun(p.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                    aiPronoun === p.id 
                                      ? 'bg-blue-600 border-blue-600 text-white' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="md:col-span-2 flex items-center gap-3 pt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={includeEnglish}
                                onChange={(e) => setIncludeEnglish(e.target.checked)}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              <span className="ml-3 text-sm font-medium text-slate-700">Thêm phiên bản tiếng Anh</span>
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={handleGenerateAIComment}
                          disabled={isGenerating}
                          className="w-full mt-6 glass-button flex items-center justify-center gap-2 py-3 font-bold"
                        >
                          {isGenerating ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Sparkles size={18} />
                          )}
                          {isGenerating ? 'Đang tạo nhận xét...' : 'Tạo nhận xét bằng AI'}
                        </button>
                      </div>

                      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <ClipboardList size={16} /> Nhận xét tự động
                          </h3>
                          <button 
                            onClick={() => copyToClipboard(formData.finalComment)}
                            className="bg-white hover:bg-slate-50 text-slate-700 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border border-slate-200 shadow-sm"
                          >
                            <Copy size={14} /> Sao chép
                          </button>
                        </div>
                        <textarea
                          value={formData.finalComment}
                          onChange={(e) => handleFormChange('finalComment', e.target.value)}
                          className="w-full bg-white p-4 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y min-h-[300px] leading-relaxed"
                        />
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                      <button
                        onClick={handleSaveEvaluation}
                        className="glass-button flex items-center gap-2 px-8 py-3 font-bold"
                      >
                        <Save size={20} />
                        Lưu & Tiếp theo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* VIEW: TỔNG HỢP */}
          {activeTab === 'summary' && (
            <div className="glass-card flex flex-col h-full overflow-hidden bg-white">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/30">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Tổng hợp: {classes.find(c => c.id === selectedClassId)?.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">Ngày {new Date(date).toLocaleDateString('vi-VN')} • {evaluatedCount}/{filteredStudents.length} HS</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
                    <button 
                      onClick={() => setSummaryViewMode('list')}
                      className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${summaryViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      title="Xem dạng danh sách"
                    >
                      <List size={16} /> Danh sách
                    </button>
                    <button 
                      onClick={() => setSummaryViewMode('table')}
                      className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${summaryViewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      title="Xem dạng bảng"
                    >
                      <Table size={16} /> Bảng
                    </button>
                  </div>

                  <button
                    onClick={exportToExcel}
                    disabled={evaluatedCount === 0}
                    className="glass-button flex items-center gap-2 bg-green-600 hover:bg-green-700 border-green-700 shadow-green-600/20"
                  >
                    <FileSpreadsheet size={18} /> Xuất Excel
                  </button>

                  <button
                    onClick={() => {
                      const allText = filteredStudents
                        .filter(s => currentRecords[s.id])
                        .map((s, index) => `${index + 1}. ${s.name}: ${currentRecords[s.id].finalComment}`)
                        .join('\n\n');
                      copyToClipboard(allText);
                    }}
                    disabled={evaluatedCount === 0}
                    className="glass-button flex items-center gap-2"
                  >
                    <Copy size={18} /> Sao chép text
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {evaluatedCount === 0 ? (
                  <div className="text-center text-slate-400 py-20 flex flex-col items-center gap-4">
                    <ClipboardList size={48} className="opacity-20" />
                    <p className="text-lg">Chưa có đánh giá nào cho lớp này trong ngày hôm nay.</p>
                  </div>
                ) : summaryViewMode === 'list' ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredStudents.map((student, idx) => {
                      const record = currentRecords[student.id];
                      if (!record) return null;
                      return (
                        <div key={student.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative group hover:bg-slate-100 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-bold text-blue-600">{idx + 1}. {student.name}</div>
                            <button 
                              onClick={() => copyToClipboard(record.finalComment)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy nhận xét"
                            >
                              <Copy size={18} />
                            </button>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{record.finalComment}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">STT</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Học sinh</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Chuyên cần</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Thái độ</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Bài tập</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((student, idx) => {
                          const record = currentRecords[student.id];
                          if (!record) return null;
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-all">
                              <td className="p-4 text-sm text-slate-500">{idx + 1}</td>
                              <td className="p-4 text-sm font-bold text-slate-900">{student.name}</td>
                              <td className="p-4 text-sm text-slate-600">
                                {CRITERIA_CONFIG.attendance.options.find(o => o.id === record.attendance)?.text}
                              </td>
                              <td className="p-4 text-sm text-slate-600">
                                {CRITERIA_CONFIG.attitude.options.find(o => o.id === record.attitude)?.text}
                              </td>
                              <td className="p-4 text-sm text-slate-600">
                                {CRITERIA_CONFIG.homework.options.find(o => o.id === record.homework)?.text}
                              </td>
                              <td className="p-4 text-sm text-slate-700 max-w-md">
                                <div className="line-clamp-2 text-xs italic text-slate-500 mb-1">{record.note}</div>
                                <div className="whitespace-pre-wrap">{record.finalComment}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: QUẢN LÝ LỚP HỌC */}
          {activeTab === 'students' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              {/* Class Management */}
              <div className="w-full lg:w-80 glass-card flex flex-col overflow-hidden bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Danh sách lớp</h3>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleAddClass} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Tên lớp..."
                      className="flex-1 glass-input text-sm"
                    />
                    <button type="submit" className="glass-button p-2"><Plus size={20}/></button>
                  </form>
                  
                  <div className="space-y-2">
                    {classes.map(c => (
                      <div 
                        key={c.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedClassId === c.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <button 
                          onClick={() => setSelectedClassId(c.id)}
                          className="flex-1 text-left font-semibold text-sm"
                        >
                          {c.name}
                        </button>
                        <button onClick={() => handleDeleteClass(c.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Management */}
              <div className="flex-1 glass-card flex flex-col overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Học sinh lớp {classes.find(c => c.id === selectedClassId)?.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">Quản lý thành viên trong lớp được chọn.</p>
                  </div>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  {!selectedClassId ? (
                    <div className="text-center text-slate-400 py-10">Vui lòng chọn hoặc thêm lớp học trước.</div>
                  ) : (
                    <>
                      <form onSubmit={handleAddStudent} className="flex gap-3 mb-8">
                        <input
                          type="text"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          placeholder="Nhập họ tên học sinh mới..."
                          className="flex-1 glass-input"
                        />
                        <button 
                          type="submit"
                          disabled={!newStudentName.trim()}
                          className="glass-button flex items-center gap-2 whitespace-nowrap"
                        >
                          <Plus size={20} /> Thêm học sinh
                        </button>
                      </form>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                          <span>Họ và Tên</span>
                          <span>Thao tác</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {filteredStudents.length === 0 ? (
                            <li className="p-8 text-center text-slate-400 italic">Lớp chưa có học sinh.</li>
                          ) : (
                            filteredStudents.map((student, idx) => (
                              <li key={student.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-all">
                                <span className="font-medium text-slate-700">{idx + 1}. {student.name}</span>
                                <button 
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-card px-8 py-4 flex items-center gap-4 shadow-2xl shadow-blue-500/20 border-blue-500/30 z-50 animate-bounce">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <span className="font-bold text-black">{toastMessage}</span>
        </div>
      )}

      {/* Global Styles for Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

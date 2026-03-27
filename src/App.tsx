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
  MessageSquareQuote
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH TIÊU CHÍ ĐÁNH GIÁ ---
const CRITERIA_CONFIG = {
  attendance: {
    label: 'Chuyên cần',
    options: [
      { id: 'a1', text: 'Đúng giờ', phrase: 'đi học đầy đủ và đúng giờ' },
      { id: 'a2', text: 'Đi muộn', phrase: 'có đi học nhưng đến lớp hơi muộn' },
      { id: 'a3', text: 'Nghỉ có phép', phrase: 'hôm nay xin phép nghỉ học' },
      { id: 'a4', text: 'Nghỉ không phép', phrase: 'hôm nay nghỉ học không có lý do' }
    ]
  },
  attitude: {
    label: 'Thái độ học tập',
    options: [
      { id: 'at1', text: 'Rất hăng hái', phrase: 'rất tập trung nghe giảng và hăng hái phát biểu xây dựng bài' },
      { id: 'at2', text: 'Chú ý nghe giảng', phrase: 'có chú ý nghe giảng và hoàn thành nhiệm vụ trên lớp' },
      { id: 'at3', text: 'Đôi lúc xao nhãng', phrase: 'đôi lúc còn thiếu tập trung trong giờ học' },
      { id: 'at4', text: 'Nói chuyện riêng', phrase: 'còn hay nói chuyện riêng, cần chú ý tập trung hơn' }
    ]
  },
  homework: {
    label: 'Bài tập về nhà',
    options: [
      { id: 'h1', text: 'Hoàn thành tốt', phrase: 'đã hoàn thành rất tốt bài tập được giao' },
      { id: 'h2', text: 'Có làm bài', phrase: 'đã làm bài tập đầy đủ' },
      { id: 'h3', text: 'Làm thiếu', phrase: 'chưa hoàn thành hết phần bài tập về nhà' },
      { id: 'h4', text: 'Chưa làm', phrase: 'chưa làm bài tập về nhà' },
      { id: 'h5', text: 'Không có BTVN', phrase: '' }
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
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate', 'summary', 'students'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [classes, setClasses] = useState<Class[]>([
    { id: 'c1', name: 'Lớp 10A1' },
    { id: 'c2', name: 'Lớp 11B2' },
  ]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Nguyễn Văn An', classId: 'c1' },
    { id: '2', name: 'Trần Thị Bình', classId: 'c1' },
    { id: '3', name: 'Lê Hoàng Cường', classId: 'c2' },
    { id: '4', name: 'Phạm Mai Dung', classId: 'c2' },
  ]);
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  
  // AI Config
  const [aiTone, setAiTone] = useState('friendly'); // friendly, serious, encouraging, concise
  const [aiPronoun, setAiPronoun] = useState('con'); // con, em, bạn, học sinh
  const [isGenerating, setIsGenerating] = useState(false);

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
    
    const attPhrase = CRITERIA_CONFIG.attendance.options.find(o => o.id === data.attendance)?.phrase;
    const attitudePhrase = CRITERIA_CONFIG.attitude.options.find(o => o.id === data.attitude)?.phrase;
    const hwPhrase = CRITERIA_CONFIG.homework.options.find(o => o.id === data.homework)?.phrase;
    
    if (data.attendance === 'a3' || data.attendance === 'a4') {
      return `Hôm nay ${student.name} ${attPhrase}. ${data.note ? '\nLưu ý: ' + data.note : ''}`;
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
    
    return sentences.join(' ');
  };

  useEffect(() => {
    if (selectedStudentId) {
      const autoGen = generateAutoComment(formData);
      setFormData(prev => ({ ...prev, finalComment: autoGen }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.attendance, formData.attitude, formData.homework, formData.note, selectedStudentId]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEvaluation = () => {
    if (!selectedStudentId) return;
    
    setRecords(prev => {
      const newRecords = { ...prev };
      if (!newRecords[date]) newRecords[date] = {};
      
      newRecords[date][selectedStudentId] = { ...formData };
      return newRecords;
    });
    
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
    setStudents([...students, { id: newId, name: newStudentName.trim(), classId: selectedClassId }]);
    setNewStudentName('');
    showToast('Đã thêm học sinh mới');
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newId = 'c' + Date.now().toString();
    setClasses([...classes, { id: newId, name: newClassName.trim() }]);
    setNewClassName('');
    showToast('Đã thêm lớp học mới');
    if (!selectedClassId) setSelectedClassId(newId);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      setStudents(students.filter(s => s.id !== id));
      if (selectedStudentId === id) {
        setSelectedStudentId(filteredStudents[0]?.id || null);
      }
    }
  };

  const handleDeleteClass = (id: string) => {
    if (window.confirm('Xóa lớp học sẽ xóa tất cả học sinh trong lớp. Bạn có chắc chắn?')) {
      setClasses(classes.filter(c => c.id !== id));
      setStudents(students.filter(s => s.classId !== id));
      if (selectedClassId === id) {
        setSelectedClassId(classes[0]?.id || '');
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

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
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

        Yêu cầu:
        1. Viết một đoạn nhận xét ngắn (khoảng 2-4 câu).
        2. Sử dụng danh xưng: "${aiPronoun}" để gọi học sinh.
        3. Tông giọng: ${toneLabels[aiTone]}.
        4. Ngôn ngữ: Bao gồm cả Tiếng Việt và Tiếng Anh.
        5. Cấu trúc: Tiếng Việt ở trên, sau đó là dòng "--- English Version ---", và Tiếng Anh ở dưới.
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

  // --- RENDER HELPERS ---
  const currentRecords = records[date] || {};
  const evaluatedCount = filteredStudents.filter(s => currentRecords[s.id]).length;
  const progress = filteredStudents.length > 0 ? Math.round((evaluatedCount / filteredStudents.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 animate-float">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GraduationCap className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Trợ Lý Nhận Xét</h1>
            <p className="text-blue-300/80 text-sm font-medium">Hệ thống quản lý học sinh thông minh</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Calendar size={18} className="text-blue-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-white outline-none font-medium cursor-pointer text-sm"
            />
          </div>
          
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Filter size={18} className="text-blue-400" />
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent border-none text-white outline-none font-medium cursor-pointer text-sm min-w-[120px]"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>
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
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'students' ? 'glass-tab-active' : 'glass-tab-inactive'}`}
            >
              <Users size={20} /> <span>Quản lý lớp</span>
            </button>
          </div>

          {/* Progress Card */}
          {activeTab === 'evaluate' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <LayoutDashboard size={18} className="text-blue-400" />
                Tiến độ lớp {classes.find(c => c.id === selectedClassId)?.name}
              </h3>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Hoàn thành: {evaluatedCount}/{filteredStudents.length}</span>
                <span className="text-blue-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
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
              <div className="w-full lg:w-80 glass-card flex flex-col overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                  <span className="font-bold text-white">Học sinh</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">{filteredStudents.length} HS</span>
                </div>
                <div className="overflow-y-auto p-3 max-h-[60vh] lg:max-h-none flex-1 custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm italic">Chưa có học sinh trong lớp này.</div>
                  ) : (
                    filteredStudents.map(student => {
                      const isEvaluated = currentRecords[student.id];
                      return (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl mb-2 flex justify-between items-center transition-all group ${
                            selectedStudentId === student.id 
                              ? 'bg-blue-600/80 text-white shadow-lg shadow-blue-500/20' 
                              : isEvaluated 
                                ? 'bg-green-500/10 text-slate-200 hover:bg-green-500/20' 
                                : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <span className="font-medium truncate pr-2">{student.name}</span>
                          {isEvaluated ? (
                            <CheckCircle2 size={16} className={selectedStudentId === student.id ? 'text-blue-200' : 'text-green-400'} />
                          ) : (
                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedStudentId === student.id ? 'text-white' : 'text-slate-500'}`} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Area */}
              <div className="flex-1 glass-card flex flex-col overflow-hidden">
                {!selectedStudentId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Search size={32} />
                    </div>
                    <p className="text-lg font-medium">Vui lòng chọn học sinh để bắt đầu</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {students.find(s => s.id === selectedStudentId)?.name}
                        </h2>
                        <p className="text-sm text-blue-400 font-medium">{classes.find(c => c.id === selectedClassId)?.name}</p>
                      </div>
                      {currentRecords[selectedStudentId] && (
                         <span className="text-xs font-bold bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full border border-green-500/30 flex items-center gap-2">
                           <CheckCircle2 size={14}/> Đã lưu đánh giá
                         </span>
                      )}
                    </div>
                    
                    <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
                      {Object.entries(CRITERIA_CONFIG).map(([key, config]) => (
                        <div key={key}>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{config.label}</h3>
                          <div className="flex flex-wrap gap-3">
                            {config.options.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => handleFormChange(key, opt.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                                  (formData as any)[key] === opt.id
                                    ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/10'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                }`}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ghi chú thêm</h3>
                        <textarea
                          value={formData.note}
                          onChange={(e) => handleFormChange('note', e.target.value)}
                          placeholder="Nhập ghi chú riêng cho học sinh..."
                          className="w-full glass-input resize-none h-24 text-sm"
                        />
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Sparkles size={14} className="text-blue-400" /> Tùy chỉnh AI
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
                                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                      : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
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
                                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                      : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleGenerateAIComment}
                          disabled={isGenerating}
                          className="w-full mt-6 glass-button-secondary flex items-center justify-center gap-2 py-3 font-bold text-blue-400 border-blue-500/20 hover:border-blue-500/40"
                        >
                          {isGenerating ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Sparkles size={18} />
                          )}
                          {isGenerating ? 'Đang tạo nhận xét...' : 'Tạo nhận xét bằng AI'}
                        </button>
                      </div>

                      <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                            <ClipboardList size={16} /> Nhận xét tự động
                          </h3>
                          <button 
                            onClick={() => copyToClipboard(formData.finalComment)}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border border-white/10"
                          >
                            <Copy size={14} /> Sao chép
                          </button>
                        </div>
                        <textarea
                          value={formData.finalComment}
                          onChange={(e) => handleFormChange('finalComment', e.target.value)}
                          className="w-full bg-white/5 p-4 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-32 leading-relaxed"
                        />
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
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
            <div className="glass-card flex flex-col h-full overflow-hidden">
              <div className="p-8 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5">
                <div>
                  <h2 className="text-2xl font-bold text-white">Tổng hợp: {classes.find(c => c.id === selectedClassId)?.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">Ngày {new Date(date).toLocaleDateString('vi-VN')} • {evaluatedCount}/{filteredStudents.length} HS</p>
                </div>
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
                  <Copy size={18} /> Sao chép tất cả
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {evaluatedCount === 0 ? (
                  <div className="text-center text-slate-500 py-20 flex flex-col items-center gap-4">
                    <ClipboardList size={48} className="opacity-20" />
                    <p className="text-lg">Chưa có đánh giá nào cho lớp này trong ngày hôm nay.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredStudents.map((student, idx) => {
                      const record = currentRecords[student.id];
                      if (!record) return null;
                      return (
                        <div key={student.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl relative group hover:bg-white/10 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-bold text-blue-300">{idx + 1}. {student.name}</div>
                            <button 
                              onClick={() => copyToClipboard(record.finalComment)}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Copy nhận xét"
                            >
                              <Copy size={18} />
                            </button>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed">{record.finalComment}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: QUẢN LÝ LỚP HỌC */}
          {activeTab === 'students' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              {/* Class Management */}
              <div className="w-full lg:w-80 glass-card flex flex-col overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-white/5">
                  <h3 className="font-bold text-white">Danh sách lớp</h3>
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
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedClassId === c.id ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        <button 
                          onClick={() => setSelectedClassId(c.id)}
                          className="flex-1 text-left font-medium text-sm"
                        >
                          {c.name}
                        </button>
                        <button onClick={() => handleDeleteClass(c.id)} className="text-slate-500 hover:text-red-400 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Management */}
              <div className="flex-1 glass-card flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white">Học sinh lớp {classes.find(c => c.id === selectedClassId)?.name}</h2>
                    <p className="text-sm text-slate-400 mt-1">Quản lý thành viên trong lớp được chọn.</p>
                  </div>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  {!selectedClassId ? (
                    <div className="text-center text-slate-500 py-10">Vui lòng chọn hoặc thêm lớp học trước.</div>
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

                      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                          <span>Họ và Tên</span>
                          <span>Thao tác</span>
                        </div>
                        <ul className="divide-y divide-white/5">
                          {filteredStudents.length === 0 ? (
                            <li className="p-8 text-center text-slate-500 italic">Lớp chưa có học sinh.</li>
                          ) : (
                            filteredStudents.map((student, idx) => (
                              <li key={student.id} className="flex justify-between items-center p-4 hover:bg-white/5 transition-all">
                                <span className="font-medium text-slate-200">{idx + 1}. {student.name}</span>
                                <button 
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all"
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
          <span className="font-bold text-white">{toastMessage}</span>
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

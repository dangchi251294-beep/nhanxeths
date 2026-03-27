/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  ClipboardList, 
  Copy, 
  Save, 
  Plus, 
  Trash2, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

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

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate', 'summary', 'students'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([
    { id: '1', name: 'Nguyễn Văn An' },
    { id: '2', name: 'Trần Thị Bình' },
    { id: '3', name: 'Lê Hoàng Cường' },
    { id: '4', name: 'Phạm Mai Dung' },
  ]);
  const [newStudentName, setNewStudentName] = useState('');
  
  // Lưu trữ đánh giá theo ngày và ID học sinh
  // Cấu trúc: { '2023-10-25': { '1': { attendance: 'a1', attitude: 'at1', homework: 'h1', note: '', finalComment: '...' } } }
  const [records, setRecords] = useState<Record<string, Record<string, any>>>({});
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
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
      // Mặc định
      setFormData({
        attendance: 'a1',
        attitude: 'at1',
        homework: 'h1',
        note: '',
        finalComment: ''
      });
    }
  }, [selectedStudentId, date, records]);

  // Hàm tự động gen text dựa trên lựa chọn
  const generateAutoComment = (data: typeof formData) => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return '';
    
    const attPhrase = CRITERIA_CONFIG.attendance.options.find(o => o.id === data.attendance)?.phrase;
    const attitudePhrase = CRITERIA_CONFIG.attitude.options.find(o => o.id === data.attitude)?.phrase;
    const hwPhrase = CRITERIA_CONFIG.homework.options.find(o => o.id === data.homework)?.phrase;
    
    // Nếu nghỉ học thì không cần gen các phần khác
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

  // Cập nhật finalComment mỗi khi các tiêu chí thay đổi (nếu chưa bị user sửa tay)
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
    
    // Tự động chuyển sang học sinh tiếp theo nếu có
    const currentIndex = students.findIndex(s => s.id === selectedStudentId);
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newId = Date.now().toString();
    setStudents([...students, { id: newId, name: newStudentName.trim() }]);
    setNewStudentName('');
    showToast('Đã thêm học sinh mới');
    if (!selectedStudentId) setSelectedStudentId(newId);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      setStudents(students.filter(s => s.id !== id));
      if (selectedStudentId === id) {
        setSelectedStudentId(students[0]?.id || null);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    // Xử lý copy an toàn trong iframe
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

  // --- RENDER HELPERS ---
  const currentRecords = records[date] || {};
  const evaluatedCount = Object.keys(currentRecords).length;
  const progress = students.length > 0 ? Math.round((evaluatedCount / students.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={28} />
            <h1 className="text-2xl font-bold">Trợ Lý Nhận Xét Học Sinh</h1>
          </div>
          <div className="flex items-center gap-2 bg-blue-700 px-3 py-1.5 rounded-lg">
            <Calendar size={18} />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-white outline-none font-medium cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6 mt-4">
        
        {/* Sidebar / Navigation */}
        <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('evaluate')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'evaluate' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <CheckSquare size={20} /> <span className="hidden sm:inline">Đánh giá hàng ngày</span>
            </button>
            <button 
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'summary' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ClipboardList size={20} /> <span className="hidden sm:inline">Tổng hợp nhận xét</span>
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'students' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <Users size={20} /> <span className="hidden sm:inline">Quản lý lớp học</span>
            </button>
          </nav>

          {/* Progress Card */}
          {activeTab === 'evaluate' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-2 hidden md:block">
              <h3 className="font-semibold text-slate-700 mb-2">Tiến độ hôm nay</h3>
              <div className="flex justify-between text-sm text-slate-500 mb-1">
                <span>Đã nhận xét: {evaluatedCount}/{students.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </aside>

        {/* Dynamic View Area */}
        <section className="flex-1 flex flex-col min-w-0">
          
          {/* VIEW: ĐÁNH GIÁ */}
          {activeTab === 'evaluate' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
              {/* Danh sách học sinh để chọn */}
              <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex justify-between items-center">
                  <span>Danh sách lớp</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{students.length} HS</span>
                </div>
                <div className="overflow-y-auto p-2 max-h-[60vh]">
                  {students.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Chưa có học sinh. Hãy thêm ở mục Quản lý.</div>
                  ) : (
                    students.map(student => {
                      const isEvaluated = currentRecords[student.id];
                      return (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex justify-between items-center transition-colors ${
                            selectedStudentId === student.id 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : isEvaluated 
                                ? 'bg-green-50 text-slate-700 hover:bg-green-100' 
                                : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="font-medium truncate pr-2">{student.name}</span>
                          {isEvaluated && <CheckCircle2 size={16} className={selectedStudentId === student.id ? 'text-blue-200' : 'text-green-500'} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form nhập liệu */}
              <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                {!selectedStudentId ? (
                  <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
                    <p>Vui lòng chọn học sinh để bắt đầu đánh giá</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                      <h2 className="text-xl font-bold text-blue-800">
                        {students.find(s => s.id === selectedStudentId)?.name}
                      </h2>
                      {currentRecords[selectedStudentId] && (
                         <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-md flex items-center gap-1">
                           <CheckCircle2 size={12}/> Đã lưu
                         </span>
                      )}
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                      
                      {/* Tiêu chí */}
                      {Object.entries(CRITERIA_CONFIG).map(([key, config]) => (
                        <div key={key}>
                          <h3 className="text-sm font-semibold text-slate-700 mb-3">{config.label}</h3>
                          <div className="flex flex-wrap gap-2">
                            {config.options.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => handleFormChange(key, opt.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                  (formData as any)[key] === opt.id
                                    ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Ghi chú thêm */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Ghi chú thêm (Tùy chọn)</h3>
                        <textarea
                          value={formData.note}
                          onChange={(e) => handleFormChange('note', e.target.value)}
                          placeholder="Ví dụ: Con chữ viết còn hơi ẩu, cần rèn thêm..."
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
                        />
                      </div>

                      {/* Preview Nhận xét */}
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-amber-800">Kết quả nhận xét sinh tự động</h3>
                          <button 
                            onClick={() => copyToClipboard(formData.finalComment)}
                            className="text-amber-700 hover:bg-amber-200/50 p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-medium"
                          >
                            <Copy size={14} /> Copy
                          </button>
                        </div>
                        <textarea
                          value={formData.finalComment}
                          onChange={(e) => handleFormChange('finalComment', e.target.value)}
                          className="w-full bg-white p-3 border border-amber-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-28"
                        />
                        <p className="text-xs text-amber-600 mt-2">
                          * Bạn có thể sửa trực tiếp đoạn văn trên trước khi lưu.
                        </p>
                      </div>

                    </div>
                    
                    {/* Action Bar */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button
                        onClick={handleSaveEvaluation}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
                      >
                        <Save size={18} />
                        Lưu & Chuyển HS tiếp
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* VIEW: TỔNG HỢP */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Tổng hợp nhận xét ngày {new Date(date).toLocaleDateString('vi-VN')}</h2>
                  <p className="text-sm text-slate-500 mt-1">Đã nhận xét {evaluatedCount}/{students.length} học sinh</p>
                </div>
                <button
                  onClick={() => {
                    const allText = students
                      .filter(s => currentRecords[s.id])
                      .map((s, index) => `${index + 1}. ${currentRecords[s.id].finalComment}`)
                      .join('\n\n');
                    copyToClipboard(allText);
                  }}
                  disabled={evaluatedCount === 0}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Copy size={18} /> Copy tất cả
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {evaluatedCount === 0 ? (
                  <div className="text-center text-slate-500 py-10">
                    Chưa có đánh giá nào trong ngày này. Hãy sang tab "Đánh giá hàng ngày" để bắt đầu.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {students.map((student, idx) => {
                      const record = currentRecords[student.id];
                      if (!record) return null;
                      return (
                        <div key={student.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg relative group">
                          <div className="font-semibold text-slate-800 mb-1">{idx + 1}. {student.name}</div>
                          <p className="text-slate-600 text-sm leading-relaxed">{record.finalComment}</p>
                          <button 
                            onClick={() => copyToClipboard(record.finalComment)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy nhận xét này"
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: QUẢN LÝ HỌC SINH */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-w-2xl mx-auto w-full">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Quản lý danh sách lớp</h2>
                <p className="text-sm text-slate-500 mt-1">Thêm hoặc xóa học sinh khỏi danh sách đánh giá.</p>
              </div>
              
              <div className="p-6">
                {/* Form thêm mới */}
                <form onSubmit={handleAddStudent} className="flex gap-2 mb-8">
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Nhập họ tên học sinh mới..."
                    className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newStudentName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <Plus size={20} /> Thêm
                  </button>
                </form>

                {/* Danh sách */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>Họ và Tên</span>
                    <span>Thao tác</span>
                  </div>
                  <ul className="divide-y divide-slate-200">
                    {students.length === 0 ? (
                      <li className="p-6 text-center text-slate-500">Danh sách trống.</li>
                    ) : (
                      students.map((student, idx) => (
                        <li key={student.id} className="flex justify-between items-center p-4 hover:bg-white transition-colors">
                          <span className="font-medium text-slate-700">{idx + 1}. {student.name}</span>
                          <button 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors"
                            title="Xóa học sinh"
                          >
                            <Trash2 size={18} />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce z-50">
          <CheckCircle2 size={20} className="text-green-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

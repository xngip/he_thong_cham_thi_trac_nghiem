import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, Image, Download, CheckCircle, XCircle,
  Calculator, FileSpreadsheet, AlertCircle, Info, X
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

// Component Toast Notification
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className={`${getToastStyles()} px-6 py-4 rounded-lg shadow-lg flex items-center justify-between min-w-80 max-w-md animate-slide-in`}>
      <div className="flex items-center">
        {getIcon()}
        <span className="ml-3 font-medium">{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 hover:opacity-75">
        <X size={16} />
      </button>
    </div>
  );
};

// Component hiển thị trạng thái
const StatusCard = ({ title, status, message, type = 'info' }) => {
  const getStatusStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTextStyles = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'loading':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />;
      case 'loading':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Info className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className={`${getStatusStyles()} border rounded-lg p-4 mb-4`}>
      <div className="flex items-center">
        {getIcon()}
        <div className="ml-3">
          <h4 className={`${getTextStyles()} font-semibold`}>{title}</h4>
          {message && <p className={`${getTextStyles()} text-sm mt-1`}>{message}</p>}
        </div>
      </div>
    </div>
  );
};

const OMRGradingSystem = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [answerKeys, setAnswerKeys] = useState({});
  const [gradingResults, setGradingResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedExamCode, setSelectedExamCode] = useState('');
  const [modalImagePair, setModalImagePair] = useState(null);
  
  // States cho thông báo
  const [toasts, setToasts] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);

  const imageInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Hàm thêm toast
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Hàm xóa toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    const clearAll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clear-all`, { method: 'POST' });
        const data = await res.json();
        console.log('✅ Dọn dữ liệu:', data.message);
        addToast('Đã khởi tạo hệ thống thành công', 'success');
      } catch (err) {
        console.error('❌ Lỗi khi gọi clear-all:', err);
        addToast('Không thể kết nối đến server', 'error');
      }
    };
    clearAll();
  }, []);

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus({ type: 'loading', message: `Đang tải lên ${files.length} ảnh...` });
    
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    try {
      const res = await fetch(`${API_BASE}/api/upload-images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        setUploadedImages(data.images);
        setUploadStatus({ 
          type: 'success', 
          message: `Đã tải lên thành công ${data.images.length} ảnh bài thi` 
        });
        addToast(`Tải lên thành công ${data.images.length} ảnh`, 'success');
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: data.error || 'Lỗi không xác định khi tải ảnh' 
        });
        addToast(data.error || 'Lỗi upload ảnh', 'error');
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({ 
        type: 'error', 
        message: 'Không thể kết nối đến server' 
      });
      addToast('Lỗi kết nối server khi upload ảnh', 'error');
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus({ type: 'loading', message: 'Đang xử lý file đáp án...' });

    const formData = new FormData();
    formData.append('answerKey', file);

    if (selectedExamCode.trim()) {
      formData.append('examCode', selectedExamCode.trim());
    }

    try {
      const res = await fetch(`${API_BASE}/api/upload-answer-key`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAnswerKeys(prev => ({
          ...prev,
          [data.examCode]: {
            answers: data.answers,
            totalQuestions: data.totalQuestions
          }
        }));
        setSelectedExamCode('');
        setUploadStatus({ 
          type: 'success', 
          message: `Đã upload đáp án cho mã đề ${data.examCode} (${data.totalQuestions} câu)` 
        });
        addToast(`Đã upload đáp án mã đề ${data.examCode}`, 'success');
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: data.error || 'Lỗi không xác định khi upload đáp án' 
        });
        addToast(data.error || 'Lỗi upload đáp án', 'error');
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({ 
        type: 'error', 
        message: 'Không thể kết nối đến server' 
      });
      addToast('Lỗi kết nối server khi upload đáp án', 'error');
    }
  };

  const processAllImages = async () => {
    if (uploadedImages.length === 0) {
      addToast('Vui lòng tải lên ít nhất một ảnh bài thi', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ 
      type: 'loading', 
      message: `Đang xử lý ${uploadedImages.length} ảnh bài thi...` 
    });

    try {
      const res = await fetch(`${API_BASE}/api/process-images`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        setGradingResults(data.results);
        setProcessingStatus({ 
          type: 'success', 
          message: `Đã chấm xong ${data.results.length} bài thi` 
        });
        addToast(`Chấm điểm thành công ${data.results.length} bài thi`, 'success');
        setActiveTab('results');
      } else {
        setProcessingStatus({ 
          type: 'error', 
          message: data.error || 'Lỗi không xác định khi xử lý ảnh' 
        });
        addToast(data.error || 'Lỗi xử lý ảnh', 'error');
      }
    } catch (err) {
      console.error(err);
      setProcessingStatus({ 
        type: 'error', 
        message: 'Không thể kết nối tới máy chủ để xử lý ảnh' 
      });
      addToast('Không thể kết nối tới máy chủ', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResults = async () => {
    if (gradingResults.length === 0) {
      addToast('Chưa có kết quả để xuất', 'warning');
      return;
    }

    addToast('Đang chuẩn bị file Excel...', 'info');

    try {
      const res = await fetch(`${API_BASE}/api/export-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: gradingResults }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'ket_qua_cham_thi.xlsx';
        link.click();
        addToast('Đã xuất file Excel thành công', 'success');
      } else {
        const data = await res.json();
        addToast(data.error || 'Lỗi xuất file', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Lỗi kết nối server khi xuất file', 'error');
    }
  };

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    addToast('Đã xóa ảnh', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Hệ Thống Chấm Điểm Bài Thi Trắc Nghiệm THPT Quốc Gia
          </h1>
          <p className="text-gray-600 text-lg">
            Mẫu phiếu trả lời năm 2018 - Tự động nhận diện và chấm điểm
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <Upload className="inline-block w-5 h-5 mr-2" />
              Tải ảnh & Đáp án
            </button>
            <button
              onClick={() => setActiveTab('process')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'process'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <Calculator className="inline-block w-5 h-5 mr-2" />
              Xử lý & Chấm điểm
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'results'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <FileText className="inline-block w-5 h-5 mr-2" />
              Kết quả
            </button>
          </div>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto">
            {/* Status Display */}
            {uploadStatus && (
              <StatusCard
                title={uploadStatus.type === 'loading' ? 'Đang xử lý...' : 
                       uploadStatus.type === 'success' ? 'Thành công!' : 'Lỗi!'}
                message={uploadStatus.message}
                type={uploadStatus.type}
              />
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Image Upload */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <Image className="mr-3 text-blue-500" />
                  Tải ảnh bài thi
                </h2>
                
                <div 
                  className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="mx-auto text-blue-400 mb-4" size={48} />
                  <p className="text-gray-600 mb-2">Nhấp để chọn ảnh hoặc kéo thả</p>
                  <p className="text-sm text-gray-400">Hỗ trợ JPG, PNG</p>
                </div>
                
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {uploadedImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-3">
                      Đã tải ({uploadedImages.length} ảnh)
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadedImages.map((img) => (
                        <div key={img.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <img src={img.preview} alt={img.name} className="w-12 h-12 object-cover rounded mr-3" />
                            <span className="text-sm text-gray-700">{img.name}</span>
                          </div>
                          <button
                            onClick={() => removeImage(img.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Answer Key Upload */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <FileSpreadsheet className="mr-3 text-green-500" />
                  Tải đáp án
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã đề cụ thể (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={selectedExamCode}
                    onChange={(e) => setSelectedExamCode(e.target.value)}
                    placeholder="Ví dụ: 101, 102, 103..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
                  onClick={() => excelInputRef.current?.click()}
                >
                  <FileSpreadsheet className="mx-auto text-green-400 mb-4" size={48} />
                  <p className="text-gray-600 mb-2">Chọn file Excel đáp án</p>
                  <p className="text-sm text-gray-400">Định dạng: .xlsx, .xls</p>
                </div>
                
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />

                {Object.keys(answerKeys).length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-3">Đáp án đã tải:</h3>
                    <div className="space-y-2">
                      {Object.keys(answerKeys).map((examCode) => (
                        <div key={examCode} className="bg-green-50 p-3 rounded-lg">
                          <span className="font-medium text-green-800">Mã đề {examCode}</span>
                          <span className="text-green-600 ml-2">
                            ({answerKeys[examCode].totalQuestions} câu)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Process Tab */}
        {activeTab === 'process' && (
          <div className="max-w-2xl mx-auto">
            {/* Processing Status */}
            {processingStatus && (
              <StatusCard
                title={processingStatus.type === 'loading' ? 'Đang xử lý...' : 
                       processingStatus.type === 'success' ? 'Hoàn thành!' : 'Lỗi!'}
                message={processingStatus.message}
                type={processingStatus.type}
              />
            )}

            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Calculator className="mx-auto text-blue-500 mb-6" size={64} />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Xử lý và chấm điểm</h2>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">Số ảnh đã tải: <span className="font-semibold">{uploadedImages.length}</span></p>
                <p className="text-gray-600 mb-4">Số đáp án: <span className="font-semibold">{Object.keys(answerKeys).length}</span></p>
              </div>

              {isProcessing ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-blue-600 font-medium">Đang xử lý ảnh và chấm điểm...</p>
                </div>
              ) : (
                <button
                  onClick={processAllImages}
                  disabled={uploadedImages.length === 0}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
                >
                  Bắt đầu chấm điểm
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Tổng Quan Kết Quả</h2>
              <button
                onClick={exportResults}
                className="bg-green-500 hover:bg-green-600 text-white font-bold h-14 px-6 rounded-lg flex items-center text-base"
              >
                <Download className="mr-2" size={20} />
                Xuất Excel
              </button>
            </div>

            {/* Results Summary */}
            {gradingResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">Tổng số bài</h3>
                  <p className="text-2xl font-bold text-blue-600">{gradingResults.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">Đạt (≥5đ)</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {gradingResults.filter(r => r.score >= 5).length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">Không đạt</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {gradingResults.filter(r => r.score < 5).length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">Điểm TB</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {gradingResults.length > 0 ? 
                      (gradingResults.reduce((sum, r) => sum + r.score, 0) / gradingResults.length).toFixed(2) 
                      : '0'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Báo Danh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đề</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết quả</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gradingResults.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.examId}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            {result.score >= 5 ? (
                              <CheckCircle className="text-green-500 mr-2" size={16} />
                            ) : (
                              <XCircle className="text-red-500 mr-2" size={16} />
                            )}
                            {result.correctAnswers}/{result.totalQuestions}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            result.score >= 8 ? 'bg-green-100 text-green-800' :
                            result.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {result.score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setModalImagePair({
                              original: result.originalImage.startsWith('http') ? result.originalImage : `${API_BASE}${result.originalImage}`,
                              processed: result.processedImage.startsWith('http') ? result.processedImage : `${API_BASE}${result.processedImage}`
                            })}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal hiển thị ảnh */}
        {modalImagePair && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[80%] max-w-4xl p-6 rounded-xl shadow-xl relative flex">
              <button
                onClick={() => setModalImagePair(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
              >×</button>
              <div className="w-1/2 pr-2">
                <h3 className="font-semibold text-center mb-2">Bài Làm Của Thí Sinh</h3>
                <img src={modalImagePair.original} alt="Bài Làm Của Thí Sinh" className="w-full rounded border" />
              </div>
              <div className="w-1/2 pl-2">
                <h3 className="font-semibold text-center mb-2">Kết Quả Bài Làm Của Thí Sinh</h3>
                <img src={modalImagePair.processed} alt="Kết Quả Bài Làm Của Thí Sinh" className="w-full rounded border" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OMRGradingSystem;
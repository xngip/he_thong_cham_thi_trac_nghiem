import React, { useState, useRef } from 'react';
import {
  Upload, FileText, Image, Download, CheckCircle, XCircle,
  Calculator, FileSpreadsheet
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const OMRGradingSystem = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [answerKeys, setAnswerKeys] = useState({});
  const [gradingResults, setGradingResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedExamCode, setSelectedExamCode] = useState('');

  const imageInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const files = event.target.files;
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
      } else {
        alert(data.error || 'Lỗi upload ảnh');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server khi upload ảnh');
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('answerKey', file);
    formData.append('examCode', selectedExamCode);

    try {
      const res = await fetch(`${API_BASE}/api/upload-answer-key`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAnswerKeys(prev => ({
          ...prev,
          [data.examCode]: data.answers
        }));
        alert(`Đã upload đáp án cho mã đề ${data.examCode}`);
      } else {
        alert(data.error || 'Lỗi upload đáp án');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server khi upload đáp án');
    }
  };

  const processAllImages = async () => {
    if (uploadedImages.length === 0) {
      alert('Vui lòng tải lên ít nhất một ảnh bài thi');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/process-images`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setGradingResults(data.results);
        setActiveTab('results');
      } else {
        alert(data.error || 'Lỗi xử lý ảnh');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối tới máy chủ để xử lý ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResults = async () => {
    if (gradingResults.length === 0) {
      alert('Chưa có kết quả để xuất');
      return;
    }

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
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi xuất file');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server khi xuất file');
    }
  };

  const removeImage = async (imageId) => {
    try {
      const res = await fetch(`${API_BASE}/api/images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        alert(data.error || 'Lỗi xóa ảnh');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server khi xóa ảnh');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Hệ thống chấm điểm trắc nghiệm THPT Quốc gia
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
                          <span className="text-green-600 ml-2">({answerKeys[examCode].length} câu)</span>
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
            {gradingResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Chưa có kết quả</h2>
                <p className="text-gray-600">Vui lòng tải ảnh và thực hiện chấm điểm trước</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Tổng quan kết quả</h2>
                    <button
                      onClick={exportResults}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
                    >
                      <Download className="mr-2" size={20} />
                      Xuất Excel
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <h3 className="text-3xl font-bold text-blue-600">{gradingResults.length}</h3>
                      <p className="text-blue-800">Tổng bài thi</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <h3 className="text-3xl font-bold text-green-600">
                        {Math.round(gradingResults.reduce((sum, r) => sum + r.score, 0) / gradingResults.length * 100) / 100}
                      </h3>
                      <p className="text-green-800">Điểm trung bình</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <h3 className="text-3xl font-bold text-yellow-600">
                        {Math.max(...gradingResults.map(r => r.score))}
                      </h3>
                      <p className="text-yellow-800">Điểm cao nhất</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <h3 className="text-3xl font-bold text-red-600">
                        {Math.min(...gradingResults.map(r => r.score))}
                      </h3>
                      <p className="text-red-800">Điểm thấp nhất</p>
                    </div>
                  </div>
                </div>

                {/* Results List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mã SV
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mã đề
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kết quả
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Điểm
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ảnh gốc
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ảnh đã chấm
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {gradingResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.studentId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.examId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                {result.score >= 5 ? (
                                  <CheckCircle className="text-green-500 mr-2" size={16} />
                                ) : (
                                  <XCircle className="text-red-500 mr-2" size={16} />
                                )}
                                {result.correctAnswers}/{result.totalQuestions}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.score >= 8 ? 'bg-green-100 text-green-800' :
                                result.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {result.score}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <img
                                src={result.originalImage}
                                alt="Ảnh gốc"
                                className="w-12 h-12 object-cover rounded cursor-pointer"
                                onClick={() => window.open(result.originalImage, '_blank')}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <img
                                src={result.processedImage}
                                alt="Ảnh đã chấm"
                                className="w-12 h-12 object-cover rounded cursor-pointer"
                                onClick={() => window.open(result.processedImage, '_blank')}
                              />
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
        )}
      </div>
    </div>
  );
};

export default OMRGradingSystem;
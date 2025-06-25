const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const xlsx = require('xlsx');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/output', express.static('output'));

// Xoá file trong các thư mục mỗi lần server khởi động
const cleanDirectories = () => {
  const dirsToClean = ['uploads', 'result', 'output', 'images_test'];
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Không thể xoá ${filePath}:`, err.message);
        }
      });
    }
  });
};

// Tạo thư mục cần thiết
const createDirectories = () => {
  const dirs = ['uploads', 'output', 'images_test', 'grade', 'result', 'temp'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

cleanDirectories();
createDirectories();

// Cấu hình Multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'images') {
      cb(null, 'uploads/');
    } else if (file.fieldname === 'answerKey') {
      cb(null, 'result/');
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    if (file.fieldname === 'images') {
      cb(null, `${timestamp}_${file.originalname}`);
    } else if (file.fieldname === 'answerKey') {
      cb(null, `answer_key_${timestamp}.xlsx`); 
    }
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Chỉ cho phép file ảnh (JPG, PNG)'));
      }
    } else if (file.fieldname === 'answerKey') {
      const allowedTypes = /xlsx|xls/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Chỉ cho phép file Excel (.xlsx, .xls)'));
      }
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Store uploaded files info
let uploadedImages = [];
let answerKeys = {};

// API Routes

// 1. Upload ảnh
app.post('/api/upload-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Không có file ảnh nào được upload' });
    }

    const imageInfos = [];

    for (const file of req.files) {
      // Tạo thumbnail
      const thumbnailPath = path.join('uploads', `thumb_${file.filename}`);
      await sharp(file.path)
        .resize(200, 200, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      const imageInfo = {
        id: Date.now() + Math.random(),
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `/uploads/${file.filename}`,               // ✅ SỬA: dùng backtick
        thumbnailUrl: `/uploads/thumb_${file.filename}`, // ✅ SỬA: dùng backtick
        size: file.size,
        uploadTime: new Date().toISOString()
      };

      imageInfos.push(imageInfo);
      uploadedImages.push(imageInfo);
    }

    res.json({
      success: true,
      message: `Đã upload ${req.files.length} ảnh thành công`, // ✅ SỬA: dùng backtick
      images: imageInfos
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Lỗi khi upload ảnh: ' + error.message });
  }
});


// 2. Upload file đáp án Excel
app.post('/api/upload-answer-key', upload.single('answerKey'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file đáp án nào được upload' });
    }

    const { examCode } = req.body;
    
    // Đọc file Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'File Excel trống hoặc không đúng định dạng' });
    }

    // Xử lý dữ liệu đáp án
    let answers = [];
    let detectedExamCode = examCode;

    // Tìm cột chứa đáp án
    const firstRow = data[0];
    const answerColumn = Object.keys(firstRow).find(key => 
      key.toLowerCase().includes('answer') || 
      key.toLowerCase().includes('dap_an') ||
      key.toLowerCase().includes('đáp án')
    );

    if (answerColumn) {
      answers = data.map(row => row[answerColumn]).filter(answer => answer);
    } else {
      // Nếu không tìm thấy cột đáp án, lấy cột đầu tiên
      const firstColumnKey = Object.keys(firstRow)[0];
      answers = data.map(row => row[firstColumnKey]).filter(answer => answer);
    }

    // Nếu không có examCode, tạo một mã tự động
    if (!detectedExamCode) {
      detectedExamCode = Date.now() % 1000;
    }


    // Lưu đáp án vào file result{examCode}.xlsx
    const resultPath = path.join('result', `result${detectedExamCode}.xlsx`); 
    const resultData = answers.map((answer, index) => ({
      Question: index + 1,
      Answer: answer.toString().toUpperCase()
    }));

    const newWorkbook = xlsx.utils.book_new();
    const newWorksheet = xlsx.utils.json_to_sheet(resultData);
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Answers');
    xlsx.writeFile(newWorkbook, resultPath);

    // Lưu thông tin đáp án
    answerKeys[detectedExamCode] = {
      examCode: detectedExamCode,
      answers: answers.map(a => a.toString().toUpperCase()),
      filePath: resultPath,
      uploadTime: new Date().toISOString(),
      totalQuestions: answers.length
    };

    res.json({
      success: true,
      message: `Đã tải đáp án cho mã đề ${detectedExamCode}`, // ✅ Dùng backtick!
      examCode: detectedExamCode,
      totalQuestions: answers.length,
      answers: answers.slice(0, 5) // Chỉ trả về 5 đáp án đầu để preview
    });
  } catch (error) {
    console.error('Error processing answer key:', error);
    res.status(500).json({ error: 'Lỗi khi xử lý file đáp án: ' + error.message });
  }
});

// 3. Xử lý và chấm điểm
app.post('/api/process-images', async (req, res) => {
  try {
    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: 'Chưa có ảnh nào được upload' });
    }

    const results = [];
    
    // Copy ảnh từ uploads sang images_test để Python xử lý
    for (const imageInfo of uploadedImages) {
      const sourcePath = imageInfo.path;
      const destPath = path.join('images_test', imageInfo.filename);
      fs.copyFileSync(sourcePath, destPath);
    }

    // Chạy script Python
    const pythonProcess = await runPythonScript('demo.py');
    
    if (pythonProcess.success) {
      // Đọc kết quả từ file Excel được tạo bởi Python
      const gradeFilePath = path.join('grade', 'grade.xlsx');
      
      if (fs.existsSync(gradeFilePath)) {
        const workbook = xlsx.readFile(gradeFilePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const gradeData = xlsx.utils.sheet_to_json(worksheet);

        // Xử lý kết quả cho từng ảnh
        for (let i = 0; i < uploadedImages.length; i++) {
          const imageInfo = uploadedImages[i];
          const gradeInfo = gradeData[i] || {};
          
          const studentId = gradeInfo['MA SINH VIEN'] || 'UNKNOWN';
          const examId = gradeInfo['MA DE'] || 'UNKNOWN';
          const score = gradeInfo['DIEM'] || 0;

          // Tìm ảnh đã xử lý
          const processedImageName = `${path.parse(imageInfo.filename).name}_full.jpg`; // ✅ dùng backtick
          const processedImagePath = path.join('output', processedImageName);

          const result = {
            studentId,
            examId,
            score,
            correctAnswers: Math.round(score * 4),
            totalQuestions: 40,
            originalImage: imageInfo.url,
            processedImage: fs.existsSync(processedImagePath)
              ? `/output/${processedImageName}` // ✅ dùng chuỗi chuẩn
              : imageInfo.url,
            fileName: imageInfo.originalName,
            processTime: new Date().toISOString()
          };

          results.push(result);

        }
      } else {
        // Nếu không có file kết quả, tạo kết quả mock
        results.push(...uploadedImages.map(img => ({
          studentId: 'ERROR',
          examId: 'ERROR',
          score: 0,
          correctAnswers: 0,
          totalQuestions: 40,
          originalImage: img.url,
          processedImage: img.url,
          fileName: img.originalName,
          error: 'Không thể xử lý ảnh'
        })));
      }
    } else {
      throw new Error('Lỗi khi chạy script Python: ' + pythonProcess.error);
    }

    res.json({
      success: true,
      message: `Đã xử lý ${results.length} ảnh thành công`, // ✅ dùng backtick
      results: results
    });
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Lỗi khi xử lý ảnh: ' + error.message });
  }
});

// 4. Xuất kết quả Excel
app.post('/api/export-results', (req, res) => {
  try {
    const { results } = req.body;
    
    if (!results || results.length === 0) {
      return res.status(400).json({ error: 'Không có kết quả để xuất' });
    }

    // Tạo file Excel
    const exportData = results.map(result => ({
      'Mã sinh viên': result.studentId,
      'Mã đề': result.examId,
      'Số câu đúng': result.correctAnswers,
      'Tổng câu': result.totalQuestions,
      'Điểm': result.score,
      'File ảnh': result.fileName,
      'Thời gian xử lý': result.processTime
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Kết quả chấm thi');
    
    const fileName = `ket_qua_cham_thi_${Date.now()}.xlsx`;  // ✅ Sửa lỗi ở đây
    const filePath = path.join('temp', fileName);

    xlsx.writeFile(workbook, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Xóa file tạm sau khi download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // Xóa sau 1 phút
    });
  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({ error: 'Lỗi khi xuất file: ' + error.message });
  }
});

// 5. Lấy danh sách ảnh đã upload
app.get('/api/uploaded-images', (req, res) => {
  res.json({ images: uploadedImages });
});

// 6. Lấy danh sách đáp án
app.get('/api/answer-keys', (req, res) => {
  res.json({ answerKeys });
});

// 7. Xóa ảnh
app.delete('/api/images/:id', (req, res) => {
  try {
    const imageId = parseFloat(req.params.id);
    const imageIndex = uploadedImages.findIndex(img => img.id === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    }

    const imageInfo = uploadedImages[imageIndex];
    
    // Xóa file vật lý
    [imageInfo.path, imageInfo.path.replace('uploads/', 'uploads/thumb_')].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Xóa khỏi danh sách
    uploadedImages.splice(imageIndex, 1);

    res.json({ success: true, message: 'Đã xóa ảnh thành công' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Lỗi khi xóa ảnh: ' + error.message });
  }
});

// 8. Clear tất cả dữ liệu
app.post('/api/clear-all', (req, res) => {
  try {
    const dirsToClean = ['uploads', 'result', 'output', 'images_test'];
    dirsToClean.forEach(dir => {
      const fullPath = path.join(__dirname, dir);
      if (fs.existsSync(fullPath)) {
        fs.readdirSync(fullPath).forEach(file => {
          const filePath = path.join(fullPath, file);
          if (fs.lstatSync(filePath).isFile()) {
            try {
              fs.unlinkSync(filePath); // Xóa file
            } catch (err) {
              console.warn(`❌ Không thể xóa ${filePath}: ${err.message}`);
            }
          }
        });
      }
    });

    uploadedImages = [];
    answerKeys = {};

    res.json({ success: true, message: '✅ Đã xoá toàn bộ file trong các thư mục tạm' });
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error.message);
    res.status(500).json({ error: 'Lỗi khi xóa dữ liệu: ' + error.message });
  }
});

// Hàm chạy script Python
function runPythonScript(scriptName) {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', [scriptName], {
      cwd: process.cwd(), // ✅ thay __dirname nếu bị báo đỏ
      stdio: ['pipe', 'pipe', 'pipe']
    });


    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python stdout:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, error: stderr || 'Process exited with code ' + code });
      }
    });

    pythonProcess.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File quá lớn (tối đa 10MB)' });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Lỗi server: ' + error.message });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log('📁 Đã tạo các thư mục cần thiết');
  console.log('🎯 API endpoints:');
  console.log('  POST /api/upload-images - Upload ảnh');
  console.log('  POST /api/upload-answer-key - Upload đáp án');
  console.log('  POST /api/process-images - Xử lý và chấm điểm');
  console.log('  POST /api/export-results - Xuất kết quả');
  console.log('  GET  /api/uploaded-images - Lấy danh sách ảnh');
  console.log('  GET  /api/answer-keys - Lấy danh sách đáp án');
  console.log('  DELETE /api/images/:id - Xóa ảnh');
  console.log('  POST /api/clear-all - Xóa tất cả dữ liệu');
});
import { useState, useRef } from 'react';
import { Upload, X, Image, Check, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export default function ScreenshotUpload({ onComplete, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    setFile(f);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/blogger/upload-screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card border-blue-500/20 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">上传博主实盘截图</h3>
        <button onClick={onCancel} className="p-1 text-[#5c6274] hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* 上传区域 */}
      {!preview && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2d3a] rounded-xl p-10 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <Upload size={36} className="mx-auto text-[#5c6274] mb-3" />
          <p className="text-[#9aa0b0] text-sm">点击选择支付宝实盘截图</p>
          <p className="text-[#5c6274] text-xs mt-1">支持 JPG/PNG，AI将自动识别交易记录</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* 预览 + 操作 */}
      {preview && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-48 h-48 rounded-lg overflow-hidden bg-[#0f1117] border border-[#2a2d3a] flex-shrink-0">
              <img src={preview} alt="截图预览" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2 text-sm text-[#9aa0b0]">
                <Image size={16} />
                {file?.name}
              </div>
              <p className="text-xs text-[#5c6274]">
                大小: {((file?.size || 0) / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      OCR识别中...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      开始识别
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setFile(null); setPreview(''); setResult(null); }}
                  className="px-4 py-2 bg-[#1e2130] border border-[#2a2d3a] rounded-lg text-sm text-[#9aa0b0] hover:text-white transition-colors"
                >
                  重新选择
                </button>
              </div>
            </div>
          </div>

          {/* 错误 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* 识别结果 */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} />
                {result.message}
              </div>

              {/* OCR识别的交易 */}
              {result.saved_trades?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-[#9aa0b0] font-medium">识别到的交易记录：</p>
                  {result.saved_trades.map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-[#0f1117] text-sm">
                      <span className="text-white">{t.fund_name}</span>
                      <span className={t.action === 'sell' ? 'text-red-400' : 'text-green-400'}>
                        {t.action === 'sell' ? '卖出' : '买入'}
                      </span>
                      <span className="text-white font-mono">¥{t.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* OCR原始结果 */}
              {result.ocr_results?.length > 0 && result.saved_trades?.length === 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-yellow-400">未自动识别到交易记录，以下是OCR识别的文字：</p>
                  <div className="max-h-32 overflow-y-auto p-3 rounded bg-[#0f1117] text-xs text-[#9aa0b0] whitespace-pre-wrap">
                    {result.ocr_results.map((r: any, i: number) => (
                      <div key={i} className="mb-1">
                        {r.text || JSON.stringify(r)}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#5c6274]">请使用手动录入功能添加交易记录</p>
                </div>
              )}

              <button
                onClick={onComplete}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                完成
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

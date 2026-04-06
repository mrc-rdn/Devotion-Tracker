import { useState, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle,
  Upload,
  Camera,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Trash2,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  getCalendarDays,
  getDayNumber,
  getMonthName,
  WEEK_DAY_HEADERS,
} from '../../utils/formatDate';
import { useDevotions } from '../../hooks/useDevotions';
import { MAX_IMAGE_SIZE_MB } from '../../lib/constants';
import { format } from 'date-fns';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import CameraView from './CameraView';

export default function DevotionCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entryType, setEntryType] = useState(null); // 'upload', 'capture', or 'write'
  const [previewDevotion, setPreviewDevotion] = useState(null); // Devotion object for preview

  const {
    getDevotionDates,
    getDevotionForDate,
    submitDevotion,
    submitTextDevotion,
    deleteDevotion,
    loading,
    error,
  } = useDevotions(year, month);

  const devotionDates = getDevotionDates();
  const calendarDays = getCalendarDays(year, month);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function getDayStatus(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFuture = date > new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const isPastOrToday = date <= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    if (isFuture) return 'future';
    if (devotionDates.has(dateStr)) return 'submitted';
    if (isPastOrToday) return 'missing';
    return 'empty';
  }

  function handleDateClick(date) {
    const isFuture = date > new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    if (isFuture) return; // Don't allow future dates

    const devotion = getDevotionForDate(date);
    setSelectedDate(date);

    if (devotion) {
      // Show preview for already submitted dates
      setPreviewDevotion(devotion);
      setEntryType(null);
    } else {
      // Show entry options for unsubmitted dates
      setPreviewDevotion(null);
      setEntryType(null);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedDate(null);
    setPreviewDevotion(null);
    setEntryType(null);
  }

  function handleDeleteDevotion() {
    if (!previewDevotion) return;
    if (!confirm('Are you sure you want to delete this devotion?')) return;

    deleteDevotion(previewDevotion.id, previewDevotion.image_url)
      .then(() => {
        setPreviewDevotion(null);
        setModalOpen(false);
      })
      .catch(err => {
        console.error('Failed to delete devotion:', err);
        alert('Failed to delete devotion: ' + err.message);
      });
  }

  function handleUploadAgain() {
    // Close preview, open upload form
    setPreviewDevotion(null);
    setEntryType(null);
  }

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{getMonthName(new Date(year, month))} {year}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => {
              setMonth(today.getMonth());
              setYear(today.getFullYear());
            }}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEK_DAY_HEADERS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          const status = dayInfo.isCurrentMonth ? getDayStatus(dayInfo.date) : 'empty';
          const isClickable = dayInfo.isCurrentMonth && status !== 'future';

          return (
            <button
              key={index}
              onClick={() => isClickable && handleDateClick(dayInfo.date)}
              disabled={!isClickable}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative
                ${!dayInfo.isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${status === 'submitted' ? 'bg-green-100 text-green-700 font-semibold border-2 border-green-500 hover:bg-green-200' : ''}
                ${status === 'missing' ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300' : ''}
                ${status === 'future' ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : ''}
                ${status === 'empty' && dayInfo.isCurrentMonth ? 'hover:bg-gray-50 cursor-pointer' : ''}
                ${dayInfo.isToday && status !== 'submitted' ? 'ring-2 ring-primary-500 ring-offset-1' : ''}
                ${isClickable ? 'cursor-pointer active:scale-95' : ''}
              `}
            >
              <span>{getDayNumber(dayInfo.date)}</span>
              {status === 'submitted' && (
                <span className="text-[10px] mt-0.5">✓</span>
              )}
              {status === 'missing' && (
                <span className="text-[10px] mt-0.5">+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
          <span>Devotion submitted (click to preview)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
          <span>Missing (click to add)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 ring-2 ring-primary-500 rounded" />
          <span>Today</span>
        </div>
      </div>

      {/* Entry Modal */}
      {modalOpen && selectedDate && (
        <DevotionEntryModal
          date={selectedDate}
          onClose={closeModal}
          onSubmit={submitDevotion}
          onSubmitText={submitTextDevotion}
          onDelete={handleDeleteDevotion}
          onUploadAgain={handleUploadAgain}
          loading={loading}
          error={error}
          entryType={entryType}
          onEntryTypeChange={setEntryType}
          previewDevotion={previewDevotion}
        />
      )}
    </div>
  );
}

function DevotionEntryModal({ date, onClose, onSubmit, onSubmitText, onDelete, onUploadAgain, loading, error, entryType, onEntryTypeChange, previewDevotion }) {
  const dateStr = format(date, 'MMMM d, yyyy');
  const fileInputRef = useRef(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState('');

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);

  // Text editor state
  const [richText, setRichText] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'blockquote', 'code-block'
  ];

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setSubmitError(`Image must be less than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setSubmitError('');
    onEntryTypeChange('upload');
  }

  function handleCameraCapture(file) {
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setCameraOpen(false);
    onEntryTypeChange('capture');
  }

  function closeCamera() {
    setCameraOpen(false);
    onEntryTypeChange(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (entryType === 'write') {
      if (!richText.trim()) {
        setSubmitError('Please write your devotion entry');
        return;
      }

      setUploading(true);
      setSubmitError('');

      try {
        await onSubmitText(richText, format(date, 'yyyy-MM-dd'));
        setSuccess(true);
        setTimeout(onClose, 1500);
      } catch (err) {
        setSubmitError(err.message || 'Failed to submit devotion');
      } finally {
        setUploading(false);
      }
    } else {
      if (!selectedFile) {
        setSubmitError('Please select or capture an image');
        return;
      }

      setUploading(true);
      setSubmitError('');

      try {
        await onSubmit(selectedFile, notes, format(date, 'yyyy-MM-dd'));
        setSuccess(true);
        setTimeout(onClose, 1500);
      } catch (err) {
        setSubmitError(err.message || 'Failed to submit devotion');
      } finally {
        setUploading(false);
      }
    }
  }

  // Camera view (full-screen)
  if (cameraOpen) {
    return <CameraView onClose={closeCamera} onCapture={handleCameraCapture} />;
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Devotion Submitted!</h3>
            <p className="text-gray-500">Your devotion for {dateStr} has been recorded</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PREVIEW MODE - Show existing devotion
  // ==========================================
  if (previewDevotion) {
    const isImageDevotion = previewDevotion.image_url;
    const isTextDevotion = previewDevotion.content;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{dateStr}</h3>
                <p className="text-sm text-gray-500">Devotion Preview</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          {isImageDevotion ? (
            <div className="space-y-4">
              <img
                src={previewDevotion.image_url}
                alt="Devotion"
                className="w-full rounded-lg object-contain max-h-64"
              />
              {previewDevotion.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                  <p className="text-sm text-gray-600">{previewDevotion.notes}</p>
                </div>
              )}
            </div>
          ) : isTextDevotion ? (
            <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: previewDevotion.content }} className="prose prose-sm max-w-none" />
            </div>
          ) : null}

          {/* Submitted info */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <strong>Submitted:</strong> {new Date(previewDevotion.created_at).toLocaleString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={onUploadAgain}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Upload Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Entry type selection view
  if (!entryType) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{dateStr}</h3>
              <p className="text-sm text-gray-500 mt-1">How would you like to create your devotion entry?</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Entry Type Options */}
          <div className="grid gap-4">
            {/* Upload from device */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Upload from Device</h4>
                <p className="text-sm text-gray-500">Select an image from your computer</p>
              </div>
            </button>

            {/* Capture from camera */}
            <button
              onClick={() => setCameraOpen(true)}
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Capture Photo</h4>
                <p className="text-sm text-gray-500">Take a photo using your camera</p>
              </div>
            </button>

            {/* Write digitally */}
            <button
              onClick={() => onEntryTypeChange('write')}
              className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Edit3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Write Digitally</h4>
                <p className="text-sm text-gray-500">Create a rich-text devotion entry</p>
              </div>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    );
  }

  // Upload/Capture form view
  if (entryType === 'upload' || entryType === 'capture') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{dateStr}</h3>
              <p className="text-sm text-gray-500">
                {entryType === 'upload' ? 'Upload from Device' : 'Captured Photo'}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                onEntryTypeChange(null);
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Image Preview */}
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full rounded-lg object-contain max-h-64"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    onEntryTypeChange(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Upload area (only if no preview) */}
            {!preview && entryType === 'upload' && (
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label
                      htmlFor="file-upload-modal"
                      className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload-modal"
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to {MAX_IMAGE_SIZE_MB}MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="label">Notes (Optional)</label>
              <textarea
                id="notes"
                rows={3}
                className="input-field"
                placeholder="Add any notes about this devotion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">{notes.length}/500</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Devotion'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Rich text editor view
  if (entryType === 'write') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{dateStr}</h3>
              <p className="text-sm text-gray-500">Write Your Devotion</p>
            </div>
            <button
              onClick={() => {
                setRichText('');
                onEntryTypeChange(null);
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={richText}
                onChange={setRichText}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your devotion entry here..."
                className="bg-white"
                style={{ minHeight: '250px' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={uploading || !richText.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Devotion'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}

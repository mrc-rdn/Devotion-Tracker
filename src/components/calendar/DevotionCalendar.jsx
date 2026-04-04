import { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import {
  getCalendarDays,
  getDayNumber,
  getMonthName,
  WEEK_DAY_HEADERS,
} from '../../utils/formatDate';
import { useDevotions } from '../../hooks/useDevotions';
import { MAX_IMAGE_SIZE_MB } from '../../lib/constants';
import { format } from 'date-fns';

export default function DevotionCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const {
    getDevotionDates,
    submitDevotion,
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
    // Use local date formatting to avoid timezone issues
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFuture = date > today;
    const isPastOrToday = date <= new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (isFuture) return 'future';
    if (devotionDates.has(dateStr)) return 'submitted';
    if (isPastOrToday) return 'missing';
    return 'empty';
  }

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{getMonthName(new Date(year, month))}</h3>
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

          return (
            <div
              key={index}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative
                ${!dayInfo.isCurrentMonth ? 'text-gray-300' : ''}
                ${status === 'submitted' ? 'bg-green-100 text-green-700 font-semibold border-2 border-green-500' : ''}
                ${status === 'missing' ? 'bg-red-50 text-red-600 border border-red-200' : ''}
                ${status === 'future' ? 'text-gray-400 bg-gray-50' : ''}
                ${dayInfo.isToday && status !== 'submitted' ? 'ring-2 ring-primary-500 ring-offset-1' : ''}
              `}
            >
              <span>{getDayNumber(dayInfo.date)}</span>
              {status === 'submitted' && (
                <span className="text-[10px] mt-0.5">✓</span>
              )}
              {status === 'missing' && (
                <span className="text-[10px] mt-0.5">✕</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
          <span>Devotion submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
          <span>Missing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 ring-2 ring-primary-500 rounded" />
          <span>Today</span>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={() => setUploadModalOpen(true)}
        className="btn-primary w-full mt-4"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Devotion
      </button>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <DevotionUploadModal
          onClose={() => setUploadModalOpen(false)}
          onSubmit={submitDevotion}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

function DevotionUploadModal({ onClose, onSubmit, loading, error }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setSubmitError(`Image must be less than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setSubmitError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedFile) {
      setSubmitError('Please select an image');
      return;
    }

    setUploading(true);
    setSubmitError('');

    try {
      await onSubmit(selectedFile, notes);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setSubmitError(err.message || 'Failed to upload devotion');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload Devotion</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-medium">Devotion submitted!</p>
            <p className="text-sm text-gray-500 mt-1">Recorded with server timestamp</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Error from hook */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="label">Devotion Image *</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <div className="mt-2">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to {MAX_IMAGE_SIZE_MB}MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="label">Notes (Optional)</label>
              <textarea
                id="notes"
                rows={3}
                className="input-field"
                placeholder="Add any notes about today's devotion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">{notes.length}/500</p>
            </div>

            {/* Server Time Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> The devotion date is automatically set to today&apos;s date 
                using the server timestamp. This cannot be changed.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <span className="spinner mr-2" />
                  Uploading...
                </>
              ) : (
                'Submit Devotion'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import CloseIcon from "@mui/icons-material/Close";

export default function ConfirmModal({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onCancel}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2 pt-1">
          <button className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

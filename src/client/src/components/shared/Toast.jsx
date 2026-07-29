import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";

export default function Toast({ message, type = "success", onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-500" : "bg-slate-700";

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className={`${bg} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3`}>
        <span>{message}</span>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
}

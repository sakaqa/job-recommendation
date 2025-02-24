import { useEffect } from "react";

export function Dialog({ open, onClose, title, children }) {
    useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
        // Add fixed positioning to body to prevent scrolling
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
      } else {
        document.body.style.overflow = "auto";
        document.body.style.position = "static";
        document.body.style.width = "auto";
      }
  
      return () => {
        document.body.style.overflow = "auto";
        document.body.style.position = "static";
        document.body.style.width = "auto";
      };
    }, [open]);
  
    if (!open) return null;
  
    return (
      <>
        {/* Ensure overlay covers entire viewport */}
        <div 
          className="fixed inset-0 bg-gray-500/30 backdrop-blur-[2px] z-40"
          onClick={onClose}
          style={{ minHeight: '100vh' }}
        />
        
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
            {typeof title === 'string' ? (
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold truncate">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="p-4 border-b">
                {title}
              </div>
            )}
            <div className="p-4 overflow-y-auto flex-1">{children}</div>
          </div>
        </div>
      </>
    );
  }
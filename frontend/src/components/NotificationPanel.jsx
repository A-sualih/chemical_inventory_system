import React from 'react';
import { useNotifications } from '../NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = ({ onClose }) => {
  const { notifications, loading, markAsRead, dismissNotification } = useNotifications();
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };
  const getIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK': return '📦';
      case 'EXPIRY': return '⚠️';
      case 'UNAUTHORIZED_ACCESS': return '🔒';
      case 'SECURITY': return '🛡️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-secondary-100 overflow-hidden flex flex-col max-h-[500px]">
      <div className="p-4 border-b border-secondary-50 bg-secondary-50/50 flex justify-between items-center">
        <h3 className="font-bold text-secondary-900 flex items-center gap-2">
          Notifications
          <span className="text-[10px] bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
        </h3>
        <button
          onClick={onClose}
          className="text-secondary-400 hover:text-secondary-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-secondary-400 font-medium tracking-tight">Syncing alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm text-secondary-900 font-bold tracking-tight">No notifications yet</p>
            <p className="text-xs text-secondary-400 font-medium">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-50">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-4 hover:bg-secondary-50 transition-colors relative group ${notif.status === 'unread' ? 'bg-primary-50/30' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="text-xl mt-1">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold truncate leading-tight ${notif.status === 'unread' ? 'text-secondary-900' : 'text-secondary-600'}`}>
                        {notif.title}
                      </h4>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase border flex-shrink-0 ${getSeverityStyles(notif.severity)}`}>
                        {notif.severity}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-500 font-medium mb-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notif.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notif._id)}
                            className="text-[10px] font-black text-primary-600 hover:text-primary-700 bg-primary-100 px-2 py-1 rounded-md"
                          >
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => dismissNotification(notif._id)}
                          className="text-[10px] font-black text-secondary-400 hover:text-secondary-600 bg-secondary-100 px-2 py-1 rounded-md"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {notif.status === 'unread' && (
                  <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-primary-600 rounded-full group-hover:hidden"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-secondary-50 bg-secondary-50/30 text-center">
        <button className="text-xs font-black text-secondary-400 hover:text-primary-600 transition-colors uppercase tracking-widest">
          View All History
        </button>
      </div>
    </div>
  );
};
export default NotificationPanel;

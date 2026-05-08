import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import '../../styles/NotificationPanel.css';

const NotificationPanel = ({ onClose }) => {
  const { notifications, loading, markAsRead, dismissNotification } = useNotifications();
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical': return 'sev-critical';
      case 'high': return 'sev-high';
      case 'medium': return 'sev-medium';
      default: return 'sev-default';
    }
  };
  const getIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK': return <img src="/icons/box.svg" className="notif-empty-icon" style={{width: '1.25rem', height: '1.25rem', margin: 0}} draggable="false" alt="Box" />;
      case 'EXPIRY': return <img src="/icons/warning-red.svg" className="notif-empty-icon" style={{width: '1.25rem', height: '1.25rem', margin: 0}} draggable="false" alt="Warning" />;
      case 'UNAUTHORIZED_ACCESS': return <img src="/icons/lock.svg" className="notif-empty-icon" style={{width: '1.25rem', height: '1.25rem', margin: 0}} draggable="false" alt="Lock" />;
      case 'SECURITY': return <img src="/icons/shield.svg" className="notif-empty-icon" style={{width: '1.25rem', height: '1.25rem', margin: 0}} draggable="false" alt="Security" />;
      default: return <img src="/icons/info.svg" className="notif-empty-icon" style={{width: '1.25rem', height: '1.25rem', margin: 0}} draggable="false" alt="Info" />;
    }
  };

  return (
    <div className="notif-panel-container">
      <div className="notif-panel-header">
        <h3 className="notif-panel-title">
          Notifications
          <span className="notif-live-badge">Live</span>
        </h3>
        <button
          onClick={onClose}
          className="notif-close-btn"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="notif-panel-body">
        {loading && notifications.length === 0 ? (
          <div className="notif-panel-state">
            <div className="notif-sync-spinner"></div>
            <p className="notif-state-text">Syncing alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-panel-state">
            <div className="notif-empty-icon"><img src="/icons/sparkles.svg" alt="Sparkles" draggable="false" /></div>
            <p className="notif-empty-title">No notifications yet</p>
            <p className="notif-empty-sub">You're all caught up!</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`notif-list-item ${notif.status === 'unread' ? 'unread' : ''}`}
              >
                <div className="notif-item-content">
                  <div className="notif-item-icon">{getIcon(notif.type)}</div>
                  <div className="notif-item-details">
                    <div className="notif-item-header">
                      <h4 className={`notif-item-title ${notif.status === 'unread' ? 'unread' : 'read'}`}>
                        {notif.title}
                      </h4>
                      <span className={`notif-item-severity ${getSeverityStyles(notif.severity)}`}>
                        {notif.severity}
                      </span>
                    </div>
                    <p className="notif-item-message">
                      {notif.message}
                    </p>
                    <div className="notif-item-footer">
                      <span className="notif-item-time">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                      <div className="notif-item-actions">
                        {notif.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notif._id)}
                            className="action-btn-read"
                          >
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => dismissNotification(notif._id)}
                          className="action-btn-dismiss"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {notif.status === 'unread' && (
                  <div className="unread-dot"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="notif-panel-footer">
        <Link 
          to="/notifications"
          onClick={onClose}
          className="view-all-link"
        >
          View All History
        </Link>
      </div>
    </div>
  );
};
export default NotificationPanel;

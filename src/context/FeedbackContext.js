import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const FeedbackContext = createContext();

const generateId = () => {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const toast = useCallback((message, type = 'info', duration = 3000) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmState({
        title, message,
        onConfirm: () => { setConfirmState(null); resolve(true); },
        onCancel: () => { setConfirmState(null); resolve(false); }
      });
    });
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      {confirmState && (
        <ConfirmModal
          isOpen={!!confirmState}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
          />
        ))}
      </View>
    </FeedbackContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
    paddingHorizontal: 16,
  },
});

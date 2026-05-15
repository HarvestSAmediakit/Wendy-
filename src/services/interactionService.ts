import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum InteractionType {
  TAB_SWITCH = 'tab_switch',
  CONTEXT_SWITCH = 'context_switch',
}

export const logInteraction = async (type: InteractionType, value: string, metadata: any = {}) => {
  if (!auth.currentUser) return;

  try {
    await addDoc(collection(db, 'interactions'), {
      userId: auth.currentUser.uid,
      type,
      value,
      timestamp: serverTimestamp(),
      metadata,
    });
  } catch (error) {
    console.error('Failed to log interaction:', error);
  }
};

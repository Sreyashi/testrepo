import { useState, useEffect, useCallback } from "react";
import type { Child, BehaviorLog } from '../types';

// Keys are namespaced per user so multiple parents share one browser safely
function storageKeys(userId: string) {
  return {
    CHILDREN: `adhd_children_${userId}`,
    LOGS: `adhd_logs_${userId}`,
  };
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

export function useStore(userId: string) {
  const keys = storageKeys(userId);

  const [children, setChildren] = useState<Child[]>(() =>
    loadFromStorage<Child[]>(keys.CHILDREN, [])
  );
  const [logs, setLogs] = useState<BehaviorLog[]>(() =>
    loadFromStorage<BehaviorLog[]>(keys.LOGS, [])
  );

  // Re-load when userId changes (switching accounts)
  useEffect(() => {
    const k = storageKeys(userId);
    setChildren(loadFromStorage<Child[]>(k.CHILDREN, []));
    setLogs(loadFromStorage<BehaviorLog[]>(k.LOGS, []));
  }, [userId]);

  useEffect(() => {
    saveToStorage(keys.CHILDREN, children);
  }, [children, keys.CHILDREN]);

  useEffect(() => {
    saveToStorage(keys.LOGS, logs);
  }, [logs, keys.LOGS]);

  const addChild = useCallback((child: Child) => {
    setChildren(prev => [...prev, child]);
  }, []);

  const updateChild = useCallback((id: string, updates: Partial<Child>) => {
    setChildren(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteChild = useCallback((id: string) => {
    setChildren(prev => prev.filter(c => c.id !== id));
    setLogs(prev => prev.filter(l => l.childId !== id));
  }, []);

  const addLog = useCallback((log: BehaviorLog) => {
    setLogs(prev => [...prev, log]);
  }, []);

  const updateLog = useCallback((id: string, updates: Partial<BehaviorLog>) => {
    setLogs(prev =>
      prev.map(l => (l.id === id ? { ...l, ...updates } : l))
    );
  }, []);

  const deleteLog = useCallback((id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  const getLogsForChild = useCallback(
    (childId: string) =>
      logs
        .filter(l => l.childId === childId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [logs]
  );

  const getLogForDate = useCallback(
    (childId: string, date: string) =>
      logs.find(l => l.childId === childId && l.date === date),
    [logs]
  );

  const seedDemoData = useCallback(() => {
    if (children.length > 0) return;

    const childId = `demo-child-${userId}`;
    const demoChild: Child = {
      id: childId,
      name: 'Alex Johnson',
      dateOfBirth: '2016-04-12',
      diagnosisDate: '2022-09-01',
      medications: ['Methylphenidate 10mg'],
      therapistName: 'Dr. Sarah Mitchell',
      therapistEmail: 'smitchell@childtherapy.com',
      notes: 'Alex responds well to visual schedules and positive reinforcement.',
      createdAt: new Date().toISOString(),
    };

    const today = new Date();
    const demoLogs: BehaviorLog[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const trend = Math.min(1, i / 30);
      const rand = () => Math.floor(Math.random() * 2) - 1;

      return {
        id: `demo-log-${userId}-${i}`,
        childId,
        date: dateStr,
        ratings: {
          attention: Math.max(1, Math.min(5, Math.round(3.5 + trend * 1.5 + rand()))),
          hyperactivity: Math.max(1, Math.min(5, Math.round(3 + trend * 1 + rand()))),
          impulsivity: Math.max(1, Math.min(5, Math.round(3 + trend * 1 + rand()))),
          emotionRegulation: Math.max(1, Math.min(5, Math.round(3 + trend * 1.2 + rand()))),
          socialInteraction: Math.max(1, Math.min(5, Math.round(3.5 + trend * 0.8 + rand()))),
          sleepQuality: Math.max(1, Math.min(5, Math.round(3.5 + trend * 0.5 + rand()))),
          taskCompletion: Math.max(1, Math.min(5, Math.round(3 + trend * 1.5 + rand()))),
          moodOverall: Math.max(1, Math.min(5, Math.round(3.2 + trend * 1 + rand()))),
        },
        positiveObservations: i % 3 === 0
          ? ['Completed homework independently', 'Followed instructions on first request']
          : ['Managed frustration well'],
        challengingBehaviors: i % 4 === 0 ? ['Difficulty focusing on tasks'] : [],
        medicationTaken: true,
        medicationTime: '08:00',
        sleepHours: 8 + (Math.random() > 0.5 ? 1 : 0),
        sleepTime: '21:00',
        wakeTime: '07:00',
        activities: ['Physical exercise/sports', 'Structured homework time'],
        parentNotes: i === 0 ? 'Great day! Alex finished all homework before dinner.' : '',
        therapistNotes: '',
        triggerEvents: i % 5 === 0 ? ['Change in routine'] : [],
        environment: 'home',
        overallDay: i % 5 === 0 ? 'challenging' : i % 3 === 0 ? 'excellent' : 'good',
        createdAt: date.toISOString(),
      };
    });

    setChildren([demoChild]);
    setLogs(demoLogs);
  }, [children.length, userId]);

  return {
    children,
    logs,
    addChild,
    updateChild,
    deleteChild,
    addLog,
    updateLog,
    deleteLog,
    getLogsForChild,
    getLogForDate,
    seedDemoData,
  };
}

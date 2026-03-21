export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  diagnosisDate?: string;
  medications: string[];
  therapistName?: string;
  therapistEmail?: string;
  notes?: string;
  avatar?: string;
  reminderEmail?: string;
  reminderEnabled?: boolean;
  createdAt: string;
}

export interface AgentInsight {
  status: 'loading' | 'done' | 'error';
  overallTrend: 'improving' | 'declining' | 'stable';
  vsYesterday: string;
  vsLastWeek: string;
  therapyRecommendation: 'on_track' | 'review_recommended' | 'change_recommended';
  therapyMessage: string;
  keyObservations: string[];
  actionItems: string[];
  error?: string;
}

export interface BehaviorRating {
  attention: number;       // 1-5: focus, staying on task
  hyperactivity: number;  // 1-5: physical restlessness
  impulsivity: number;    // 1-5: acting without thinking
  emotionRegulation: number; // 1-5: managing feelings/meltdowns
  socialInteraction: number; // 1-5: peer/family relations
  sleepQuality: number;   // 1-5: sleep patterns
  taskCompletion: number; // 1-5: finishing tasks/homework
  moodOverall: number;    // 1-5: general mood
}

export interface BehaviorLog {
  id: string;
  childId: string;
  date: string;
  ratings: BehaviorRating;
  positiveObservations: string[];
  challengingBehaviors: string[];
  medicationTaken: boolean;
  medicationTime?: string;
  medicationNotes?: string;
  sleepHours?: number;
  sleepTime?: string;
  wakeTime?: string;
  activities: string[];
  parentNotes: string;
  therapistNotes: string;
  triggerEvents: string[];
  environment: 'home' | 'school' | 'both' | 'other';
  overallDay: 'excellent' | 'good' | 'average' | 'challenging' | 'very-challenging';
  createdAt: string;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  phone?: string;
}

export type ActiveView = 'dashboard' | 'log' | 'history' | 'progress' | 'reports' | 'profiles';

export const POSITIVE_OBSERVATIONS = [
  'Completed homework independently',
  'Followed instructions on first request',
  'Stayed focused during activity',
  'Resolved conflict calmly',
  'Showed empathy to others',
  'Waited for turn patiently',
  'Managed frustration well',
  'Organized their belongings',
  'Made good food choices',
  'Engaged in physical activity',
  'Played cooperatively',
  'Expressed feelings appropriately',
  'Completed morning routine',
  'Completed bedtime routine',
  'Showed creativity',
];

export const CHALLENGING_BEHAVIORS = [
  'Difficulty focusing on tasks',
  'Interrupting conversations',
  'Physical aggression',
  'Verbal outbursts/meltdown',
  'Refused to follow instructions',
  'Impulsive actions',
  'Excessive fidgeting',
  'Trouble transitioning between activities',
  'Difficulty with social interactions',
  'Forgetting tasks/items',
  'Excessive screen time requests',
  'Sleep resistance',
  'Homework refusal',
  'Mood swings',
  'Sensory overwhelm',
];

export const ACTIVITIES = [
  'Physical exercise/sports',
  'Art/creative activity',
  'Music',
  'Reading',
  'Screen time (educational)',
  'Screen time (entertainment)',
  'Outdoor play',
  'Social playdate',
  'Structured homework time',
  'Chores/responsibilities',
  'Family activity',
  'Therapy session',
  'Mindfulness/relaxation',
];

export const TRIGGER_EVENTS = [
  'Change in routine',
  'Transition between activities',
  'Loud/crowded environment',
  'Fatigue',
  'Hunger',
  'Social conflict',
  'Academic frustration',
  'Screen time ending',
  'Unexpected event',
  'Sensory sensitivity',
  'Sleep deprivation',
  'Missed medication',
];

export const BEHAVIOR_LABELS: Record<keyof BehaviorRating, string> = {
  attention: 'Attention & Focus',
  hyperactivity: 'Hyperactivity',
  impulsivity: 'Impulsivity Control',
  emotionRegulation: 'Emotional Regulation',
  socialInteraction: 'Social Interaction',
  sleepQuality: 'Sleep Quality',
  taskCompletion: 'Task Completion',
  moodOverall: 'Overall Mood',
};

export const BEHAVIOR_DESCRIPTIONS: Record<keyof BehaviorRating, string> = {
  attention: 'Ability to concentrate and stay on task',
  hyperactivity: 'Level of physical restlessness and excess movement',
  impulsivity: 'Ability to think before acting',
  emotionRegulation: 'Managing emotions and avoiding meltdowns',
  socialInteraction: 'Quality of peer and family interactions',
  sleepQuality: 'Sleep patterns and quality',
  taskCompletion: 'Finishing assigned tasks and homework',
  moodOverall: 'General emotional state throughout the day',
};

export const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Very Challenging', color: '#ef4444' },
  2: { label: 'Challenging', color: '#f97316' },
  3: { label: 'Average', color: '#eab308' },
  4: { label: 'Good', color: '#22c55e' },
  5: { label: 'Excellent', color: '#10b981' },
};

export const DAY_RATING_CONFIG = {
  'very-challenging': { label: 'Very Challenging', emoji: '😰', color: 'bg-red-100 text-red-700 border-red-200' },
  'challenging': { label: 'Challenging', emoji: '😟', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'average': { label: 'Average', emoji: '😐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'good': { label: 'Good', emoji: '😊', color: 'bg-green-100 text-green-700 border-green-200' },
  'excellent': { label: 'Excellent', emoji: '🌟', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

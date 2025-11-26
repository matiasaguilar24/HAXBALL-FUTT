
import { Stadium } from '../types';

export const STADIUMS: Stadium[] = [
    {
        id: 'classic',
        nameKey: 'stadiumClassic',
        grassColor: '#15803d',
        grassStripesColor: '#16a34a',
        linesColor: '#f8fafc',
        goalColor: '#cbd5e1',
        backgroundColor: '#0f172a',
        playerDamping: 0.94,
        ballDamping: 0.985
    },
    {
        id: 'futsal',
        nameKey: 'stadiumFutsal',
        grassColor: '#3b82f6',
        grassStripesColor: '#2563eb',
        linesColor: '#ffffff',
        goalColor: '#e2e8f0',
        backgroundColor: '#1e3a8a',
        playerDamping: 0.92, // Faster slide
        ballDamping: 0.99 // Ball rolls longer
    },
    {
        id: 'ice',
        nameKey: 'stadiumIce',
        grassColor: '#e0f2fe',
        grassStripesColor: '#bae6fd',
        linesColor: '#0369a1',
        goalColor: '#94a3b8',
        backgroundColor: '#0c4a6e',
        playerDamping: 0.985, // Very slippery (keeps velocity)
        ballDamping: 0.995 // Slides a lot
    },
    {
        id: 'mud',
        nameKey: 'stadiumMud',
        grassColor: '#78350f',
        grassStripesColor: '#92400e',
        linesColor: '#d4d4d4',
        goalColor: '#a8a29e',
        backgroundColor: '#451a03',
        playerDamping: 0.85, // Heavy, stops fast
        ballDamping: 0.96 // Ball stops fast
    },
    {
        id: 'retro',
        nameKey: 'stadiumRetro',
        grassColor: '#9ca3af',
        grassStripesColor: '#6b7280',
        linesColor: '#000000',
        goalColor: '#000000',
        backgroundColor: '#1f2937',
        playerDamping: 0.94,
        ballDamping: 0.985
    }
];

export const getStadiumById = (id: string): Stadium => {
    return STADIUMS.find(s => s.id === id) || STADIUMS[0];
};

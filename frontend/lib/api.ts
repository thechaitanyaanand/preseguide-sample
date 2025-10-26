import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Presentations
export const presentationsAPI = {
  list: () => api.get('/presentations/'),
  create: (data: { title: string; description?: string }) =>
    api.post('/presentations/', data),
  get: (id: string) => api.get(`/presentations/${id}/`),
  update: (id: string, data: FormData) =>
    api.patch(`/presentations/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/presentations/${id}/`),
  generateQA: (id: string) => api.post(`/presentations/${id}/generate_qa/`),
  getProgress: (id: string) => api.get(`/presentations/${id}/progress/`),
};

// Recordings
export const recordingsAPI = {
  upload: (presentationId: string, audioFile: File) => {
    const formData = new FormData();
    formData.append('presentation', presentationId);
    formData.append('audio_file', audioFile);

    return api.post('/recordings/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  get: (id: string) => api.get(`/recordings/${id}/`),
  list: () => api.get('/recordings/'),
  reanalyze: (id: string) => api.get(`/recordings/${id}/reanalyze/`),
};

// Badges
export const badgesAPI = {
  list: () => api.get('/badges/'),
  byPresentation: (presentationId: string) =>
    api.get(`/badges/by_presentation/?presentation_id=${presentationId}`),
};
